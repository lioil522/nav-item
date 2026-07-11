<template>
  <div class="theme-manage">
    <div class="tm-card">
      <div class="tm-card-header">
        <h3 class="tm-card-title">主题管理</h3>
      </div>
      <div class="tm-card-body">
        <!-- 深色/浅色模式切换 -->
        <div class="tm-section">
          <label class="tm-label">后台主题模式</label>
          <div class="tm-theme-switch">
            <button
              :class="['tm-switch-btn', { active: form.admin_theme === 'light' }]"
              @click="form.admin_theme = 'light'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
              浅色
            </button>
            <button
              :class="['tm-switch-btn', { active: form.admin_theme === 'dark' }]"
              @click="form.admin_theme = 'dark'"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              深色
            </button>
          </div>
        </div>

        <!-- 站点名称 -->
        <div class="tm-section">
          <label class="tm-label">站点名称</label>
          <input v-model="form.site_name" class="tm-input" placeholder="请输入站点名称" />
          <p class="tm-hint">同时应用到浏览器标签页标题和主页展示</p>
        </div>

        <!-- 自定义 Favicon -->
        <div class="tm-section">
          <label class="tm-label">自定义 Favicon</label>
          <div class="tm-tabs">
            <button :class="['tm-tab', { active: form.favicon_type === 'upload' }]" @click="form.favicon_type = 'upload'">上传图标</button>
            <button :class="['tm-tab', { active: form.favicon_type === 'url' }]" @click="form.favicon_type = 'url'">图标 API / URL</button>
          </div>
          <div v-if="form.favicon_type === 'upload'" class="tm-upload-area">
            <input type="file" accept="image/*" @change="e => handleUpload(e, 'favicon')" ref="faviconFileInput" class="tm-file-input" />
            <button class="tm-upload-btn" @click="$refs.faviconFileInput.click()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              选择图标
            </button>
            <span v-if="uploadingFavicon" class="tm-uploading">上传中...</span>
          </div>
          <div v-else>
            <input v-model="form.favicon_url" class="tm-input" placeholder="请输入 Favicon 图片 URL" />
          </div>
          <div v-if="form.favicon_url" class="tm-preview" style="border:none; margin-top:8px;">
            <img :src="form.favicon_url" class="tm-favicon-preview" @error="e => e.target.style.display='none'" />
          </div>
        </div>

        <!-- 桌面端背景图片 -->
        <div class="tm-section">
          <label class="tm-label">桌面端背景图片</label>
          <div class="tm-tabs">
            <button :class="['tm-tab', { active: form.bg_desktop_type === 'upload' }]" @click="form.bg_desktop_type = 'upload'">上传图片</button>
            <button :class="['tm-tab', { active: form.bg_desktop_type === 'url' }]" @click="form.bg_desktop_type = 'url'">图片 API / URL</button>
          </div>
          <div v-if="form.bg_desktop_type === 'upload'" class="tm-upload-area">
            <input type="file" accept="image/*" @change="e => handleUpload(e, 'desktop')" ref="desktopFileInput" class="tm-file-input" />
            <button class="tm-upload-btn" @click="$refs.desktopFileInput.click()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              选择图片
            </button>
            <span v-if="uploadingDesktop" class="tm-uploading">上传中...</span>
          </div>
          <div v-else>
            <input v-model="form.bg_desktop_value" class="tm-input" placeholder="请输入背景图片 URL 或 API 地址" />
          </div>
          <div v-if="form.bg_desktop_value" class="tm-preview">
            <img :src="form.bg_desktop_value" class="tm-preview-img" @error="e => e.target.style.display='none'" />
          </div>
        </div>

        <!-- 移动端背景图片 -->
        <div class="tm-section">
          <label class="tm-label">移动端背景图片</label>
          <p class="tm-hint">留空则使用桌面端背景图片</p>
          <div class="tm-tabs">
            <button :class="['tm-tab', { active: form.bg_mobile_type === 'upload' }]" @click="form.bg_mobile_type = 'upload'">上传图片</button>
            <button :class="['tm-tab', { active: form.bg_mobile_type === 'url' }]" @click="form.bg_mobile_type = 'url'">图片 API / URL</button>
          </div>
          <div v-if="form.bg_mobile_type === 'upload'" class="tm-upload-area">
            <input type="file" accept="image/*" @change="e => handleUpload(e, 'mobile')" ref="mobileFileInput" class="tm-file-input" />
            <button class="tm-upload-btn" @click="$refs.mobileFileInput.click()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              选择图片
            </button>
            <span v-if="uploadingMobile" class="tm-uploading">上传中...</span>
          </div>
          <div v-else>
            <input v-model="form.bg_mobile_value" class="tm-input" placeholder="请输入移动端背景图片 URL（留空使用桌面端）" />
          </div>
          <div v-if="form.bg_mobile_value" class="tm-preview">
            <img :src="form.bg_mobile_value" class="tm-preview-img tm-preview-mobile" @error="e => e.target.style.display='none'" />
          </div>
        </div>

        <!-- 保存按钮 -->
        <div class="tm-actions">
          <button class="tm-save-btn" @click="saveSettings" :disabled="saving">
            {{ saving ? '保存中...' : '保存设置' }}
          </button>
          <span v-if="saveMsg" class="tm-save-msg" :class="saveMsgType">{{ saveMsg }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';

const emit = defineEmits(['theme-change']);

const form = ref({
  site_name: '',
  admin_theme: 'light',
  bg_desktop_type: 'url',
  bg_desktop_value: '',
  bg_mobile_type: 'url',
  bg_mobile_value: '',
  favicon_type: 'url',
  favicon_url: ''
});

const saving = ref(false);
const saveMsg = ref('');
const saveMsgType = ref('success');
const uploadingDesktop = ref(false);
const uploadingMobile = ref(false);
const uploadingFavicon = ref(false);

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

/**
 * 加载当前站点设置
 */
const loadSettings = async () => {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (data.code === 200 && data.data) {
      Object.keys(form.value).forEach(key => {
        if (data.data[key] !== undefined) {
          form.value[key] = data.data[key];
        }
      });
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
  }
};

/**
 * 保存设置到后端
 */
const saveSettings = async () => {
  saving.value = true;
  saveMsg.value = '';
  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(form.value)
    });
    const data = await res.json();
    if (data.code === 200) {
      saveMsg.value = '保存成功';
      saveMsgType.value = 'success';
      // NOTE: 同步更新 localStorage 缓存，避免主页刷新时闪烁旧设置
      localStorage.setItem('siteSettings', JSON.stringify(form.value));
      // NOTE: 通知父组件切换主题
      emit('theme-change', form.value.admin_theme);
    } else {
      saveMsg.value = data.message || '保存失败';
      saveMsgType.value = 'error';
    }
  } catch (error) {
    saveMsg.value = '保存失败';
    saveMsgType.value = 'error';
  } finally {
    saving.value = false;
    setTimeout(() => { saveMsg.value = ''; }, 3000);
  }
};

/**
 * 处理背景图片上传
 * @param {Event} e - 文件选择事件
 * @param {'desktop'|'mobile'} target - 上传目标
 */
const handleUpload = async (e, target) => {
  const file = e.target.files[0];
  if (!file) return;

  const loading = target === 'desktop' ? uploadingDesktop : (target === 'mobile' ? uploadingMobile : uploadingFavicon);
  loading.value = true;

  const formData = new FormData();
  formData.append('bg', file);

  try {
    const res = await fetch('/api/settings/upload-bg', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: formData
    });
    const data = await res.json();
    if (data.code === 200) {
      if (target === 'desktop') {
        form.value.bg_desktop_value = data.data.url;
      } else if (target === 'mobile') {
        form.value.bg_mobile_value = data.data.url;
      } else {
        form.value.favicon_url = data.data.url;
      }
    } else {
      alert(data.message || '上传失败');
    }
  } catch (error) {
    alert('上传失败');
  } finally {
    loading.value = false;
  }
};

// NOTE: 主题模式切换时立即通知父组件，实现实时预览
watch(() => form.value.admin_theme, (newTheme) => {
  emit('theme-change', newTheme);
});

onMounted(loadSettings);
</script>

<style scoped>
.theme-manage {
  width: 100%;
  max-width: 800px;
  padding: 20px;
}
.tm-card {
  background: var(--admin-card-bg, #fff);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  border: 1px solid var(--admin-border, #eaeaea);
  overflow: hidden;
}
.tm-card-header {
  padding: 16px 24px;
  border-bottom: 1px solid var(--admin-border, #eaeaea);
  background: var(--admin-card-header-bg, #fafbfc);
}
.tm-card-title {
  margin: 0;
  font-size: 1.25rem;
  color: var(--admin-text, #222);
  font-weight: 600;
}
.tm-card-body {
  padding: 24px;
}
.tm-section {
  margin-bottom: 28px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--admin-border, #eaeaea);
}
.tm-section:last-of-type {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}
.tm-label {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--admin-text, #222);
  margin-bottom: 10px;
}
.tm-hint {
  font-size: 13px;
  color: var(--admin-text-secondary, #888);
  margin: 6px 0 0 0;
}
.tm-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--admin-input-border, #d0d7e2);
  border-radius: 6px;
  font-size: 14px;
  background: var(--admin-input-bg, #fff);
  color: var(--admin-text, #222);
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.tm-input:focus {
  outline: none;
  border-color: #2566d8;
}
.tm-input-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tm-favicon-preview {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 4px;
  border: 1px solid var(--admin-border, #eaeaea);
  flex-shrink: 0;
}
.tm-theme-switch {
  display: flex;
  gap: 12px;
}
.tm-switch-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: 2px solid var(--admin-border, #e3e6ef);
  background: var(--admin-card-bg, #fff);
  color: var(--admin-text-secondary, #888);
  transition: all 0.2s;
}
.tm-switch-btn.active {
  border-color: #2566d8;
  color: #2566d8;
  background: var(--admin-active-bg, #eff5ff);
}
.tm-tabs {
  display: flex;
  gap: 0;
  margin-bottom: 12px;
}
.tm-tab {
  padding: 8px 16px;
  border: 1px solid var(--admin-border, #d0d7e2);
  background: var(--admin-card-bg, #fff);
  color: var(--admin-text-secondary, #888);
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}
.tm-tab:first-child {
  border-radius: 6px 0 0 6px;
}
.tm-tab:last-child {
  border-radius: 0 6px 6px 0;
  border-left: none;
}
.tm-tab.active {
  background: #2566d8;
  color: #fff;
  border-color: #2566d8;
}
.tm-upload-area {
  display: flex;
  align-items: center;
  gap: 12px;
}
.tm-file-input {
  display: none;
}
.tm-upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
  border: 1px solid var(--admin-border, #d0d7e2);
  background: var(--admin-card-bg, #fff);
  color: var(--admin-text, #222);
  transition: all 0.2s;
}
.tm-upload-btn:hover {
  background: var(--admin-active-bg, #f5f6fa);
}
.tm-uploading {
  font-size: 13px;
  color: #2566d8;
}
.tm-preview {
  margin-top: 12px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--admin-border, #eaeaea);
}
.tm-preview-img {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  display: block;
}
.tm-preview-mobile {
  max-width: 200px;
  max-height: 350px;
  object-fit: cover;
}
.tm-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 24px;
}
.tm-save-btn {
  padding: 10px 28px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background: #2566d8;
  color: #fff;
  transition: background 0.2s;
}
.tm-save-btn:hover:not(:disabled) {
  background: #174ea6;
}
.tm-save-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.tm-save-msg {
  font-size: 14px;
}
.tm-save-msg.success {
  color: #0d8a57;
}
.tm-save-msg.error {
  color: #d1302b;
}
</style>
