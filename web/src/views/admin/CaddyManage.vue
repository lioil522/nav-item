<template>
  <div class="caddy-manage">
    <div class="cf-card">
      <div class="cf-card-header">
        <h3 class="cf-card-title">Caddy 自动反向代理</h3>
      </div>
      <div class="cf-card-body">
        <p class="cf-desc">填写「域名 → 后端地址」即可，Caddy 会自动申请并续期 HTTPS 证书，无需手动配置。</p>

        <div class="cf-status-bar">
          <span class="cf-badge" :class="status.installed ? 'cf-badge-success' : 'cf-badge-error'">
            caddy: {{ status.installed ? '已安装' : '未安装' }}
          </span>
          <span class="cf-badge" :class="status.running ? 'cf-badge-success' : 'cf-badge-info'">
            状态: {{ status.running ? '运行中' : '未运行' }}
          </span>
          <span v-if="status.pid" class="cf-badge cf-badge-secondary">PID: {{ status.pid }}</span>
        </div>

        <div class="cf-info-row" v-if="status.binaryPath">
          <span class="cf-info-label">二进制路径:</span>
          <span class="cf-info-value">{{ status.binaryPath }}</span>
        </div>

        <div class="cf-form-group">
          <label class="cf-form-label">ACME 邮箱（可选）</label>
          <input
            v-model="email"
            type="text"
            class="cf-form-input caddy-plain-input"
            placeholder="用于接收 Let's Encrypt 证书到期提醒，例如 admin@example.com"
          />
          <p class="cf-hint">留空也可自动签发证书，但建议填写以便接收证书相关通知。</p>
        </div>

        <div class="cf-form-group">
          <label class="cf-form-label">反向代理规则</label>
          <div class="caddy-rules">
            <div class="caddy-rule-head">
              <span class="caddy-col-domain">域名</span>
              <span class="caddy-col-upstream">后端地址</span>
              <span class="caddy-col-action"></span>
            </div>
            <div v-for="(site, index) in sites" :key="index" class="caddy-rule-row">
              <input
                v-model="site.domain"
                type="text"
                class="cf-form-input caddy-plain-input caddy-col-domain"
                placeholder="app.example.com"
              />
              <input
                v-model="site.upstream"
                type="text"
                class="cf-form-input caddy-plain-input caddy-col-upstream"
                placeholder="localhost:3000"
              />
              <button class="cf-btn cf-btn-danger caddy-col-action" @click="removeRule(index)" type="button" title="删除该规则">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
            <p v-if="!sites.length" class="cf-hint caddy-empty">暂无规则，点击下方「添加规则」新增一条。</p>
          </div>
          <button class="cf-btn cf-btn-secondary caddy-add-btn" @click="addRule" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            添加规则
          </button>
          <p class="cf-hint">后端地址支持 <code>host:port</code> 或 <code>https://host:port</code>，例如 <code>localhost:3000</code>、<code>https://127.0.0.1:8443</code>。</p>
          <p class="cf-hint">请确保域名已解析到本机公网 IP，且 80/443 端口可访问，否则证书签发会失败。</p>
        </div>

        <div class="cf-actions">
          <button v-if="!status.running" class="cf-btn cf-btn-primary" @click="startCaddy" :disabled="caddyLoading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            启动 caddy
          </button>
          <button v-else class="cf-btn cf-btn-danger" @click="stopCaddy" :disabled="caddyLoading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
            停止 caddy
          </button>

          <button v-if="status.running" class="cf-btn cf-btn-primary" @click="reloadCaddy" :disabled="caddyLoading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
            保存并热重载
          </button>
          <button v-else class="cf-btn cf-btn-secondary" @click="saveConfig" :disabled="caddyLoading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
            保存规则
          </button>

          <button class="cf-btn cf-btn-secondary" @click="fetchStatus" :disabled="caddyLoading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{'cf-spin': caddyLoading}"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            刷新
          </button>
        </div>

        <div class="cf-log-section cf-mt-20">
          <label class="cf-form-label">最近状态: <span class="cf-status-msg">{{ status.message || '无' }}</span></label>
        </div>

        <div class="cf-log-section cf-mt-10" v-if="status.errorMessage">
          <label class="cf-form-label cf-text-error">错误信息</label>
          <div class="cf-log-box cf-error-box">{{ status.errorMessage }}</div>
        </div>

        <div class="cf-log-section cf-mt-20">
          <label class="cf-form-label">近期日志</label>
          <textarea class="cf-log-box" readonly v-model="logsText" ref="logTextarea"></textarea>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';

const status = ref({
  installed: false,
  running: false,
  message: '',
  errorMessage: '',
  logs: [],
  pid: null,
  binaryPath: '',
  caddyfilePath: '',
  email: '',
  sites: []
});

const email = ref('');
const sites = ref([]);
const caddyLoading = ref(false);
const logTextarea = ref(null);
// NOTE: 用户正在编辑时暂停用轮询结果覆盖本地表单
let userEditing = false;
let pollInterval = null;

const logsText = computed(() => {
  return status.value.logs.join('\n');
});

/**
 * 获取认证请求头
 * @returns {object}
 */
const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

/**
 * 用服务端返回的规则同步本地表单
 * @param {object} data
 */
const syncForm = (data) => {
  email.value = data.email || '';
  // NOTE: 深拷贝，避免直接引用响应对象导致后续轮询覆盖编辑内容
  sites.value = (data.sites || []).map((s) => ({ domain: s.domain, upstream: s.upstream }));
};

/**
 * 获取 caddy 状态
 * @param {boolean} syncOnce - 是否用返回结果覆盖本地表单
 */
const fetchStatus = async (syncOnce = false) => {
  caddyLoading.value = true;
  try {
    const res = await fetch('/api/system/caddy', { headers: getHeaders() });
    const data = await res.json();
    if (data.code === 200) {
      status.value = data.data;
      // NOTE: 仅在首次加载或用户未编辑时同步表单，防止覆盖正在输入的内容
      if (syncOnce || !userEditing) {
        syncForm(data.data);
      }
      scrollToBottom();
    }
  } catch (error) {
    console.error('Failed to fetch caddy status:', error);
  } finally {
    caddyLoading.value = false;
  }
};

/**
 * 添加一条空规则
 */
const addRule = () => {
  userEditing = true;
  sites.value.push({ domain: '', upstream: '' });
};

/**
 * 删除指定规则
 * @param {number} index
 */
const removeRule = (index) => {
  userEditing = true;
  sites.value.splice(index, 1);
};

/**
 * 构造发送给后端的规则请求体
 * @returns {{ email: string, sites: Array }}
 */
const buildPayload = () => ({
  email: email.value.trim(),
  sites: sites.value
    .map((s) => ({ domain: (s.domain || '').trim(), upstream: (s.upstream || '').trim() }))
    .filter((s) => s.domain || s.upstream)
});

/**
 * 调用指定接口并处理返回
 * @param {string} url
 * @param {string} okMessage
 */
const postConfig = async (url, okMessage) => {
  caddyLoading.value = true;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(buildPayload())
    });
    const data = await res.json();
    if (data.code === 200) {
      status.value = data.data;
      userEditing = false;
      syncForm(data.data);
      scrollToBottom();
      if (okMessage) alert(data.message || okMessage);
    } else {
      alert(data.message || '操作失败');
    }
  } catch (error) {
    console.error('Failed to update caddy:', error);
    alert('请求失败，请稍后重试');
  } finally {
    caddyLoading.value = false;
  }
};

/**
 * 启动 caddy
 */
const startCaddy = () => {
  const payload = buildPayload();
  if (!payload.sites.length) {
    alert('请至少配置一条反向代理规则');
    return;
  }
  postConfig('/api/system/caddy/start', '');
};

/**
 * 停止 caddy
 */
const stopCaddy = async () => {
  if (!confirm('确定要停止 caddy 吗？停止后已配置的域名将无法访问。')) return;
  caddyLoading.value = true;
  try {
    const res = await fetch('/api/system/caddy/stop', {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (data.code === 200) {
      status.value = data.data;
      scrollToBottom();
    } else {
      alert(data.message || '停止失败');
    }
  } catch (error) {
    console.error('Failed to stop caddy:', error);
  } finally {
    caddyLoading.value = false;
  }
};

/**
 * 仅保存规则（未运行时）
 */
const saveConfig = () => {
  postConfig('/api/system/caddy/config', '规则已保存');
};

/**
 * 保存并热重载
 */
const reloadCaddy = () => {
  const payload = buildPayload();
  if (!payload.sites.length) {
    alert('请至少配置一条反向代理规则');
    return;
  }
  postConfig('/api/system/caddy/reload', '已热重载');
};

/**
 * 日志自动滚动到底部
 */
const scrollToBottom = () => {
  nextTick(() => {
    if (logTextarea.value) {
      logTextarea.value.scrollTop = logTextarea.value.scrollHeight;
    }
  });
};

onMounted(() => {
  fetchStatus(true);
  // NOTE: 每 3 秒轮询一次状态以获取最新日志
  pollInterval = setInterval(() => fetchStatus(false), 3000);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>

<style scoped>
.caddy-manage {
  width: 100%;
  max-width: 1000px;
  padding: 20px;
}
.cf-card {
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid #eaeaea;
  overflow: hidden;
}
.cf-card-header {
  padding: 16px 24px;
  border-bottom: 1px solid #eaeaea;
  background: #fafbfc;
}
.cf-card-title {
  margin: 0;
  font-size: 1.25rem;
  color: #222;
  font-weight: 600;
}
.cf-card-body {
  padding: 24px;
}
.cf-desc {
  color: #666;
  margin-top: 0;
  margin-bottom: 20px;
}
.cf-status-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.cf-badge {
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
}
.cf-badge-success {
  background: #e6f8f1;
  color: #0d8a57;
  border: 1px solid #c2eedc;
}
.cf-badge-error {
  background: #fdf3f2;
  color: #d1302b;
  border: 1px solid #f9d8d6;
}
.cf-badge-info {
  background: #eff5ff;
  color: #2566d8;
  border: 1px solid #d4e4ff;
}
.cf-badge-secondary {
  background: #f5f6fa;
  color: #555;
  border: 1px solid #eaeaea;
}
.cf-info-row {
  font-size: 14px;
  margin-bottom: 20px;
}
.cf-info-label {
  color: #666;
  margin-right: 8px;
}
.cf-info-value {
  color: #222;
  font-family: monospace;
  background: #f5f6fa;
  padding: 2px 6px;
  border-radius: 4px;
}
.cf-mt-10 { margin-top: 10px; }
.cf-mt-20 { margin-top: 20px; }
.cf-form-group {
  background: #fafbfc;
  padding: 20px;
  border-radius: 8px;
  border: 1px solid #eaeaea;
  margin-top: 20px;
}
.cf-form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #222;
  margin-bottom: 8px;
}
.cf-form-input {
  padding: 10px 12px;
  border: 1px solid #d0d7e2;
  border-radius: 6px;
  font-size: 14px;
  background: #fff;
  transition: border-color 0.2s;
  font-family: monospace;
  box-sizing: border-box;
}
.cf-form-input:focus {
  outline: none;
  border-color: #2566d8;
}
.caddy-plain-input {
  width: 100%;
}
.cf-hint {
  font-size: 13px;
  color: #666;
  margin: 8px 0 0 0;
}
.cf-hint code {
  background: #eef1f6;
  padding: 1px 5px;
  border-radius: 4px;
  font-size: 12px;
}
.cf-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
  align-items: center;
  flex-wrap: wrap;
}
.cf-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}
.cf-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.cf-btn-primary {
  background: #2566d8;
  color: #fff;
}
.cf-btn-primary:hover:not(:disabled) {
  background: #174ea6;
}
.cf-btn-danger {
  background: #fdf3f2;
  color: #d1302b;
  border-color: #f9d8d6;
}
.cf-btn-danger:hover:not(:disabled) {
  background: #d1302b;
  color: #fff;
}
.cf-btn-secondary {
  background: #fff;
  color: #444;
  border-color: #d0d7e2;
}
.cf-btn-secondary:hover:not(:disabled) {
  background: #f5f6fa;
}
.cf-spin {
  animation: cf-spin-anim 1s linear infinite;
}
@keyframes cf-spin-anim {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
.cf-status-msg {
  font-weight: normal;
  color: #555;
  font-family: monospace;
}
.cf-text-error {
  color: #d1302b;
}
.cf-log-box {
  width: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
  border: 1px solid #333;
  border-radius: 6px;
  padding: 12px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 13px;
  line-height: 1.5;
  min-height: 200px;
  max-height: 400px;
  overflow-y: auto;
  resize: vertical;
  box-sizing: border-box;
}
.cf-error-box {
  background: #2d1a1a;
  color: #fca5a5;
  border-color: #7f1d1d;
  min-height: auto;
  padding: 12px;
}
.cf-log-section {
  width: 100%;
}

/* ===================== 反向代理规则表 ===================== */
.caddy-rules {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.caddy-rule-head,
.caddy-rule-row {
  display: flex;
  gap: 10px;
  align-items: center;
}
.caddy-rule-head {
  font-size: 13px;
  color: #888;
  font-weight: 600;
  padding: 0 2px;
}
.caddy-col-domain {
  flex: 1 1 40%;
}
.caddy-col-upstream {
  flex: 1 1 45%;
}
.caddy-col-action {
  flex: 0 0 auto;
  padding: 8px 10px;
}
.caddy-empty {
  margin: 4px 0;
  font-style: italic;
}
.caddy-add-btn {
  margin-top: 12px;
}
@media (max-width: 640px) {
  .caddy-rule-head {
    display: none;
  }
  .caddy-rule-row {
    flex-wrap: wrap;
  }
  .caddy-col-domain,
  .caddy-col-upstream {
    flex: 1 1 100%;
  }
}
</style>
