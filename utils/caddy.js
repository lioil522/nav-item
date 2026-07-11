const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Caddy 反向代理进程管理器
 * 负责 caddy 的启动、停止、状态查询，以及反向代理规则的存储与 Caddyfile 生成。
 * 只需填写「域名 -> 后端地址」即可，Caddy 会自动申请并续期 HTTPS 证书。
 */
class CaddyManager {
  constructor() {
    this.cmd = null;
    this.running = false;
    this.message = 'caddy is not running';
    this.errorMessage = '';
    this.logs = [];
    this.maxLogLines = 80;
    this.pid = null;
    this.stopRequested = false;

    // NOTE: 反向代理规则存储在 database/data/caddy.json 中，与数据库同处一个持久化目录
    this.dataDir = path.join(__dirname, '..', 'database', 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.configPath = path.join(this.dataDir, 'caddy.json');
    this.caddyfilePath = path.join(this.dataDir, 'Caddyfile');
  }

  /**
   * 追加日志并限制行数上限
   * @param {string} line 日志内容
   */
  appendLog(line) {
    this.logs.push(line);
    if (this.logs.length > this.maxLogLines) {
      this.logs.shift();
    }
  }

  /**
   * 在系统中查找 caddy 可执行文件
   * @returns {{ path: string, installed: boolean }}
   */
  resolveBinaryPath() {
    const candidates = ['caddy'];
    if (process.platform === 'win32') {
      candidates.push(
        path.join(this.dataDir, 'caddy.exe'),
        path.join(this.dataDir, 'bin', 'caddy.exe')
      );
    } else {
      candidates.push(
        path.join(this.dataDir, 'caddy'),
        path.join(this.dataDir, 'bin', 'caddy'),
        '/usr/local/bin/caddy',
        '/usr/bin/caddy'
      );
    }

    for (const candidate of candidates) {
      try {
        if (candidate === 'caddy') {
          const cmd = process.platform === 'win32' ? 'where caddy' : 'which caddy';
          const stdout = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
          if (stdout && stdout.trim()) {
            return { path: stdout.trim().split('\n')[0].trim(), installed: true };
          }
        } else {
          if (fs.existsSync(candidate)) {
            const stat = fs.statSync(candidate);
            if (!stat.isDirectory()) {
              return { path: path.resolve(candidate), installed: true };
            }
          }
        }
      } catch (_e) {
        // ignore
      }
    }
    return { path: '', installed: false };
  }

  /**
   * 从配置文件加载已保存的反向代理规则
   * @returns {{ email: string, sites: Array<{domain: string, upstream: string}> }}
   */
  loadConfig() {
    if (fs.existsSync(this.configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return {
          email: config.email || '',
          sites: Array.isArray(config.sites) ? config.sites : []
        };
      } catch (_e) {
        return { email: '', sites: [] };
      }
    }
    return { email: '', sites: [] };
  }

  /**
   * 从环境变量解析反向代理配置（用于 docker-compose 直接配置）
   *
   * 支持两种写法：
   *   1) CADDY_SITES="域名1=后端1,域名2=后端2"，域名与后端用 = 分隔，多条用逗号或分号分隔
   *   2) CADDY_DOMAIN + CADDY_UPSTREAM（单条快捷写法，CADDY_UPSTREAM 缺省为本应用 127.0.0.1:PORT）
   * ACME 邮箱通过 CADDY_EMAIL 指定。
   *
   * @returns {{ email: string, sites: Array<{domain: string, upstream: string}> } | null} 无配置时返回 null
   */
  parseEnvConfig() {
    const email = (process.env.CADDY_EMAIL || '').trim();
    const sites = [];

    // 写法 1：CADDY_SITES 批量规则
    const rawSites = (process.env.CADDY_SITES || '').trim();
    if (rawSites) {
      // NOTE: 支持逗号或分号分隔多条规则
      const entries = rawSites.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      for (const entry of entries) {
        const idx = entry.indexOf('=');
        if (idx === -1) continue;
        const domain = entry.slice(0, idx).trim();
        const upstream = entry.slice(idx + 1).trim();
        if (domain && upstream) {
          sites.push({ domain, upstream });
        }
      }
    }

    // 写法 2：CADDY_DOMAIN 单条快捷写法（upstream 缺省指向本应用）
    const singleDomain = (process.env.CADDY_DOMAIN || '').trim();
    if (singleDomain) {
      const upstream = (process.env.CADDY_UPSTREAM || '').trim() || `127.0.0.1:${process.env.PORT || 3000}`;
      // NOTE: 避免与 CADDY_SITES 中的同名域名重复
      if (!sites.some((s) => s.domain === singleDomain)) {
        sites.push({ domain: singleDomain, upstream });
      }
    }

    if (!sites.length) {
      return null;
    }
    return { email, sites };
  }

  /**
   * 容器/进程启动时根据环境变量自动拉起 caddy。
   *
   * 优先级：环境变量存在时，用环境变量覆盖并保存配置；否则回退到已保存的 data/caddy.json。
   * 由 CADDY_AUTOSTART 控制（默认在检测到配置时自动启动，设为 "false"/"0" 可关闭）。
   * 本方法内部吞掉所有异常，绝不因为反代问题影响主应用启动。
   *
   * @returns {boolean} 是否已尝试启动
   */
  autostart() {
    try {
      const autostartFlag = (process.env.CADDY_AUTOSTART || '').trim().toLowerCase();
      const explicitlyDisabled = autostartFlag === 'false' || autostartFlag === '0' || autostartFlag === 'no';
      if (explicitlyDisabled) {
        return false;
      }

      const envConfig = this.parseEnvConfig();

      // NOTE: 环境变量存在时以其为准并持久化；否则使用面板里保存过的配置
      let config;
      if (envConfig) {
        config = this.saveConfig(envConfig);
      } else {
        config = this.loadConfig();
      }

      // 没有任何规则时不自动启动（面板仍可手动配置）
      if (!config.sites.length) {
        return false;
      }

      // 未显式开启自动启动、且规则仅来自已保存文件（非环境变量）时，保持原有「需手动启动」行为
      if (!envConfig && autostartFlag !== 'true' && autostartFlag !== '1' && autostartFlag !== 'yes') {
        return false;
      }

      const { installed } = this.resolveBinaryPath();
      if (!installed) {
        this.appendLog('CADDY_AUTOSTART: caddy 未安装，跳过自动启动');
        return false;
      }

      this.start(config);
      this.appendLog('caddy 已根据环境变量自动启动');
      return true;
    } catch (e) {
      // NOTE: 自动启动失败不能影响主应用，仅记录日志
      const msg = `caddy 自动启动失败: ${e && e.message ? e.message : e}`;
      this.errorMessage = msg;
      this.appendLog(msg);
      return false;
    }
  }

  /**
   * 校验并规范化单条反向代理规则
   * @param {object} site
   * @returns {{ domain: string, upstream: string }}
   */
  normalizeSite(site) {
    const domain = (site && site.domain ? String(site.domain) : '').trim();
    let upstream = (site && site.upstream ? String(site.upstream) : '').trim();
    if (!domain || !upstream) {
      throw new Error('每条规则都必须填写域名和后端地址');
    }
    // NOTE: Caddyfile 的 reverse_proxy 不接受带路径的 upstream，这里仅保留 scheme://host:port
    if (/\s/.test(domain) || /\s/.test(upstream)) {
      throw new Error('域名或后端地址不能包含空格');
    }
    return { domain, upstream };
  }

  /**
   * 保存反向代理规则（域名、后端地址、ACME 邮箱）
   * @param {{ email?: string, sites?: Array }} data
   * @returns {{ email: string, sites: Array }}
   */
  saveConfig(data) {
    const email = (data && data.email ? String(data.email) : '').trim();
    const rawSites = (data && Array.isArray(data.sites)) ? data.sites : [];
    const sites = rawSites.map((s) => this.normalizeSite(s));

    // NOTE: 去除重复域名，避免生成非法的 Caddyfile
    const seen = new Set();
    for (const s of sites) {
      if (seen.has(s.domain)) {
        throw new Error(`域名重复: ${s.domain}`);
      }
      seen.add(s.domain);
    }

    const config = { email, sites };
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
    return config;
  }

  /**
   * 根据已保存的规则生成 Caddyfile 内容
   * @param {{ email: string, sites: Array }} config
   * @returns {string}
   */
  generateCaddyfile(config) {
    const lines = [];
    if (config.email) {
      lines.push('{');
      lines.push(`\temail ${config.email}`);
      lines.push('}');
      lines.push('');
    }
    for (const site of config.sites) {
      lines.push(`${site.domain} {`);
      lines.push(`\treverse_proxy ${site.upstream}`);
      lines.push('}');
      lines.push('');
    }
    return lines.join('\n');
  }

  /**
   * 将当前配置写入磁盘上的 Caddyfile
   * @param {{ email: string, sites: Array }} config
   */
  writeCaddyfile(config) {
    fs.writeFileSync(this.caddyfilePath, this.generateCaddyfile(config), 'utf8');
  }

  /**
   * 获取当前运行时状态
   * @returns {object}
   */
  status() {
    const { path: binaryPath, installed } = this.resolveBinaryPath();
    const config = this.loadConfig();

    return {
      installed,
      running: this.running,
      message: this.message,
      errorMessage: this.errorMessage,
      logs: [...this.logs],
      pid: this.pid,
      binaryPath,
      caddyfilePath: this.caddyfilePath,
      email: config.email,
      sites: config.sites
    };
  }

  /**
   * 启动 caddy 反向代理进程
   * @param {{ email?: string, sites?: Array }} data 可选，传入时会先保存规则
   */
  start(data) {
    if (this.running) {
      throw new Error('caddy 已经在运行中');
    }

    const config = (data && (data.sites || data.email !== undefined))
      ? this.saveConfig(data)
      : this.loadConfig();

    if (!config.sites.length) {
      throw new Error('请至少配置一条反向代理规则');
    }

    const { path: binaryPath, installed } = this.resolveBinaryPath();
    if (!installed) {
      throw new Error('caddy 未安装，请手动安装或使用内置 caddy 的 Docker 镜像');
    }

    this.writeCaddyfile(config);

    this.cmd = spawn(binaryPath, ['run', '--config', this.caddyfilePath, '--adapter', 'caddyfile']);
    this.running = true;
    this.pid = this.cmd.pid;
    this.stopRequested = false;
    this.errorMessage = '';
    this.message = 'caddy is running';
    this.appendLog(`started caddy (pid=${this.pid})`);

    /**
     * 处理 stdout/stderr 输出，将错误关键词标记为 errorMessage
     */
    const handleOutput = (dataChunk, isErr) => {
      const lines = dataChunk.toString().split('\n');
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const lower = line.toLowerCase();
        // NOTE: caddy 通过 stderr 输出结构化日志，仅在包含错误关键词时才标记为错误
        if (lower.includes('"level":"error"') || lower.includes('"level":"fatal"') ||
            lower.includes('error') || lower.includes('failed') || lower.includes('invalid')) {
          this.errorMessage = line;
        }
        this.message = line;
        this.appendLog(line);
      }
    };

    this.cmd.stdout.on('data', (data) => handleOutput(data, false));
    this.cmd.stderr.on('data', (data) => handleOutput(data, true));

    this.cmd.on('close', (code) => {
      this.running = false;
      this.pid = null;
      this.cmd = null;

      if (this.stopRequested) {
        this.message = 'caddy stopped';
        this.errorMessage = '';
        this.appendLog('caddy stopped');
      } else {
        this.message = 'caddy exited unexpectedly';
        const errMsg = `caddy exited unexpectedly with code ${code}`;
        this.errorMessage = errMsg;
        this.appendLog(errMsg);
      }
      this.stopRequested = false;
    });
  }

  /**
   * 保存最新规则并热重载 caddy（不中断已有连接）
   * 未运行时仅保存规则。
   * @param {{ email?: string, sites?: Array }} data
   */
  reload(data) {
    const config = this.saveConfig(data);

    if (!this.running) {
      return { reloaded: false, config };
    }

    if (!config.sites.length) {
      throw new Error('请至少配置一条反向代理规则');
    }

    const { path: binaryPath, installed } = this.resolveBinaryPath();
    if (!installed) {
      throw new Error('caddy 未安装');
    }

    this.writeCaddyfile(config);
    try {
      execSync(`"${binaryPath}" reload --config "${this.caddyfilePath}" --adapter caddyfile`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      this.message = 'caddy reloaded';
      this.appendLog('caddy config reloaded');
      this.errorMessage = '';
    } catch (e) {
      const errMsg = (e.stderr || e.message || '').toString().trim() || 'caddy reload 失败';
      this.errorMessage = errMsg;
      this.appendLog(errMsg);
      throw new Error(errMsg);
    }
    return { reloaded: true, config };
  }

  /**
   * 停止 caddy 进程
   */
  stop() {
    if (!this.running || !this.cmd) {
      return;
    }

    this.stopRequested = true;
    this.message = 'stopping caddy...';

    if (process.platform === 'win32') {
      try {
        execSync(`taskkill /pid ${this.pid} /T /F`);
      } catch (_e) {
        this.cmd.kill();
      }
    } else {
      this.cmd.kill('SIGTERM');
      // NOTE: 10 秒后如果进程仍然存活则强制杀死
      setTimeout(() => {
        if (this.running && this.cmd) {
          this.cmd.kill('SIGKILL');
        }
      }, 10000);
    }
  }
}

module.exports = new CaddyManager();
