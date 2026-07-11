<template>
  <div class="cloudflare-manage">
    <div class="cf-card">
      <div class="cf-card-header">
        <h3 class="cf-card-title">Cloudflare Tunnel</h3>
      </div>
      <div class="cf-card-body">
        <p class="cf-desc">在 Nav-Item 设置面板中直接启动和管理 cloudflared。</p>

        <div class="cf-status-bar">
          <span class="cf-badge" :class="status.installed ? 'cf-badge-success' : 'cf-badge-error'">
            cloudflared: {{ status.installed ? '已安装' : '未安装' }}
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
          <label class="cf-form-label">Cloudflare Tunnel 令牌</label>
          <div class="cf-input-wrapper">
            <input
              v-model="token"
              :type="showToken ? 'text' : 'password'"
              class="cf-form-input"
              :placeholder="status.tokenStored ? '•••••••••••••••• (已安全保存，不会返回到浏览器)' : '请输入 ey... 开头的令牌'"
            />
            <button class="cf-icon-btn" @click="showToken = !showToken" type="button">
              <svg v-if="showToken" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
              <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7a21.77 21.77 0 0 1 5.06-6.06"/><path d="M1 1l22 22"/><path d="M9.53 9.53A3 3 0 0 0 12 15a3 3 0 0 0 2.47-5.47"/></svg>
            </button>
          </div>
          <p class="cf-hint">已保存的令牌会在服务端存储，前端只会知道是否已保存，不会拿到明文令牌。</p>
          <p class="cf-hint">不知道如何获取令牌？请阅读 Uptime Kuma 指南: <a href="https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy-with-Cloudflare-Tunnel" target="_blank" class="cf-link">https://github.com/louislam/uptime-kuma/wiki/Reverse-Proxy-with-Cloudflare-Tunnel</a></p>
        </div>

        <div class="cf-actions">
          <button v-if="!status.running" class="cf-btn cf-btn-primary" @click="startTunnel" :disabled="cfLoading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            启动 cloudflared
          </button>
          <button v-else class="cf-btn cf-btn-danger" @click="stopTunnel" :disabled="cfLoading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/></svg>
            停止 cloudflared
          </button>

          <button class="cf-btn cf-btn-secondary" @click="fetchStatus" :disabled="cfLoading">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :class="{'cf-spin': cfLoading}"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
            刷新
          </button>

          <button v-if="status.tokenStored && !status.running" class="cf-btn cf-btn-warning cf-ml-auto" @click="removeToken" :disabled="cfLoading">
            移除令牌
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
  tokenStored: false
});

const token = ref('');
const showToken = ref(false);
const cfLoading = ref(false);
const logTextarea = ref(null);
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
 * 获取 cloudflared 状态
 */
const fetchStatus = async () => {
  cfLoading.value = true;
  try {
    const res = await fetch('/api/system/cloudflared', { headers: getHeaders() });
    const data = await res.json();
    if (data.code === 200) {
      status.value = data.data;
      scrollToBottom();
    }
  } catch (error) {
    console.error('Failed to fetch cloudflared status:', error);
  } finally {
    cfLoading.value = false;
  }
};

/**
 * 启动隧道
 */
const startTunnel = async () => {
  if (!token.value && !status.value.tokenStored) {
    alert('请输入令牌');
    return;
  }
  cfLoading.value = true;
  try {
    const res = await fetch('/api/system/cloudflared/start', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ token: token.value })
    });
    const data = await res.json();
    if (data.code === 200) {
      status.value = data.data;
      token.value = '';
      scrollToBottom();
    } else {
      alert(data.message || '启动失败');
    }
  } catch (error) {
    console.error('Failed to start cloudflared:', error);
  } finally {
    cfLoading.value = false;
  }
};

/**
 * 停止隧道
 */
const stopTunnel = async () => {
  if (!confirm('确定要停止 cloudflared 吗？')) return;
  cfLoading.value = true;
  try {
    const res = await fetch('/api/system/cloudflared/stop', {
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
    console.error('Failed to stop cloudflared:', error);
  } finally {
    cfLoading.value = false;
  }
};

/**
 * 移除保存的令牌
 */
const removeToken = async () => {
  if (!confirm('确定要移除已保存的令牌吗？')) return;
  cfLoading.value = true;
  try {
    const res = await fetch('/api/system/cloudflared/remove-token', {
      method: 'POST',
      headers: getHeaders()
    });
    const data = await res.json();
    if (data.code === 200) {
      status.value = data.data;
      alert('令牌已移除');
    } else {
      alert(data.message || '移除失败');
    }
  } catch (error) {
    console.error('Failed to remove token:', error);
  } finally {
    cfLoading.value = false;
  }
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
  fetchStatus();
  // NOTE: 每 3 秒轮询一次状态以获取最新日志
  pollInterval = setInterval(fetchStatus, 3000);
});

onUnmounted(() => {
  if (pollInterval) {
    clearInterval(pollInterval);
  }
});
</script>

<style scoped>
.cloudflare-manage {
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
.cf-ml-auto { margin-left: auto; }
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
.cf-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}
.cf-form-input {
  width: 100%;
  padding: 10px 40px 10px 12px;
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
.cf-icon-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  display: flex;
  padding: 4px;
  border-radius: 4px;
}
.cf-icon-btn:hover {
  background: #f0f0f0;
  color: #222;
}
.cf-hint {
  font-size: 13px;
  color: #666;
  margin: 8px 0 0 0;
}
.cf-link {
  color: #2566d8;
  text-decoration: none;
}
.cf-link:hover {
  text-decoration: underline;
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
.cf-btn-warning {
  background: #fff8eb;
  color: #d97706;
  border-color: #fde68a;
}
.cf-btn-warning:hover:not(:disabled) {
  background: #d97706;
  color: #fff;
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
</style>
