const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * Cloudflare Tunnel 进程管理器
 * 负责 cloudflared 的启动、停止、状态查询和令牌存储
 */
class CloudflaredManager {
  constructor() {
    this.cmd = null;
    this.running = false;
    this.message = 'cloudflared is not running';
    this.errorMessage = '';
    this.logs = [];
    this.maxLogLines = 80;
    this.pid = null;
    this.stopRequested = false;

    // NOTE: 令牌存储在 database/data/cloudflared.json 中，与数据库同处一个持久化目录
    this.dataDir = path.join(__dirname, '..', 'database', 'data');
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    this.configPath = path.join(this.dataDir, 'cloudflared.json');
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
   * 在系统中查找 cloudflared 可执行文件
   * @returns {{ path: string, installed: boolean }}
   */
  resolveBinaryPath() {
    const candidates = ['cloudflared'];
    if (process.platform === 'win32') {
      candidates.push(
        path.join(this.dataDir, 'cloudflared.exe'),
        path.join(this.dataDir, 'bin', 'cloudflared.exe')
      );
    } else {
      candidates.push(
        path.join(this.dataDir, 'cloudflared'),
        path.join(this.dataDir, 'bin', 'cloudflared'),
        '/usr/local/bin/cloudflared',
        '/usr/bin/cloudflared'
      );
    }

    for (const candidate of candidates) {
      try {
        if (candidate === 'cloudflared') {
          const cmd = process.platform === 'win32' ? 'where cloudflared' : 'which cloudflared';
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
   * 从配置文件加载已保存的令牌
   * @returns {string}
   */
  loadToken() {
    if (fs.existsSync(this.configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
        return config.token || '';
      } catch (_e) {
        return '';
      }
    }
    return '';
  }

  /**
   * 将令牌保存到配置文件
   * @param {string} token
   */
  saveToken(token) {
    let config = {};
    if (fs.existsSync(this.configPath)) {
      try {
        config = JSON.parse(fs.readFileSync(this.configPath, 'utf8'));
      } catch (_e) {
        // ignore
      }
    }
    config.token = token.trim();
    fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2), 'utf8');
  }

  /**
   * 移除已保存的令牌，要求先停止进程
   */
  removeToken() {
    if (this.running) {
      throw new Error('请先停止 cloudflared 再移除令牌');
    }
    this.saveToken('');
  }

  /**
   * 获取当前运行时状态
   * @returns {object}
   */
  status() {
    const { path: binaryPath, installed } = this.resolveBinaryPath();
    const token = this.loadToken();

    return {
      installed,
      running: this.running,
      message: this.message,
      errorMessage: this.errorMessage,
      logs: [...this.logs],
      pid: this.pid,
      binaryPath,
      tokenStored: !!token
    };
  }

  /**
   * 启动 cloudflared tunnel 进程
   * @param {string} token 可选，传入时会保存并使用该令牌
   */
  start(token) {
    if (this.running) {
      throw new Error('cloudflared 已经在运行中');
    }

    const actualToken = (token && token.trim()) ? token.trim() : this.loadToken();
    if (!actualToken) {
      throw new Error('未配置 Cloudflare Tunnel 令牌');
    }

    const { path: binaryPath, installed } = this.resolveBinaryPath();
    if (!installed) {
      throw new Error('cloudflared 未安装，请手动安装或使用内置 cloudflared 的 Docker 镜像');
    }

    const env = Object.assign({}, process.env, { TUNNEL_TOKEN: actualToken });

    this.cmd = spawn(binaryPath, ['tunnel', '--no-autoupdate', 'run'], { env });
    this.running = true;
    this.pid = this.cmd.pid;
    this.stopRequested = false;
    this.errorMessage = '';
    this.message = 'cloudflared is running';
    this.appendLog(`started cloudflared (pid=${this.pid})`);

    /**
     * 处理 stdout/stderr 输出，将错误关键词标记为 errorMessage
     */
    const handleOutput = (data, isErr) => {
      const lines = data.toString().split('\n');
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const lower = line.toLowerCase();
        if (isErr || lower.includes('error') || lower.includes('failed') || lower.includes('invalid') || lower.includes('unauthorized')) {
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
        this.message = 'cloudflared stopped';
        this.errorMessage = '';
        this.appendLog('cloudflared stopped');
      } else {
        this.message = 'cloudflared exited unexpectedly';
        const errMsg = `cloudflared exited unexpectedly with code ${code}`;
        this.errorMessage = errMsg;
        this.appendLog(errMsg);
      }
      this.stopRequested = false;
    });
  }

  /**
   * 停止 cloudflared 进程
   */
  stop() {
    if (!this.running || !this.cmd) {
      return;
    }

    this.stopRequested = true;
    this.message = 'stopping cloudflared...';

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

module.exports = new CloudflaredManager();
