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
            <div class="tm-pick">
              <button class="tm-upload-btn" @click.stop="toggleMenu('favicon')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                选择图标
                <svg class="tm-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div v-if="activeMenu === 'favicon'" class="tm-menu">
                <button class="tm-menu-item" @click="pickLocal('favicon')">本地图标</button>
                <button class="tm-menu-item" @click="openGallery('favicon')">已上传图标</button>
              </div>
            </div>
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
            <div class="tm-pick">
              <button class="tm-upload-btn" @click.stop="toggleMenu('desktop')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                选择图片
                <svg class="tm-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div v-if="activeMenu === 'desktop'" class="tm-menu">
                <button class="tm-menu-item" @click="pickLocal('desktop')">本地图片</button>
                <button class="tm-menu-item" @click="openGallery('desktop')">已上传图片</button>
              </div>
            </div>
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
            <div class="tm-pick">
              <button class="tm-upload-btn" @click.stop="toggleMenu('mobile')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                选择图片
                <svg class="tm-caret" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div v-if="activeMenu === 'mobile'" class="tm-menu">
                <button class="tm-menu-item" @click="pickLocal('mobile')">本地图片</button>
                <button class="tm-menu-item" @click="openGallery('mobile')">已上传图片</button>
              </div>
            </div>
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

    <!-- 已上传图片选择器 -->
    <div v-if="galleryOpen" class="tm-modal-mask" @click.self="closeGallery">
      <div class="tm-modal">
        <div class="tm-modal-header">
          <h4 class="tm-modal-title">选择已上传图片</h4>
          <button class="tm-modal-close" @click="closeGallery">×</button>
        </div>
        <div class="tm-modal-body">
          <div v-if="loadingGallery" class="tm-gallery-tip">加载中...</div>
          <div v-else-if="uploadedImages.length === 0" class="tm-gallery-tip">暂无已上传图片</div>
          <div v-else class="tm-gallery">
            <div
              v-for="img in uploadedImages"
              :key="img.key"
              class="tm-thumb"
              :class="{ selected: isSelected(img) }"
              @click="selectImage(img)"
            >
              <img :src="img.url" class="tm-thumb-img" @error="e => e.target.style.opacity='0.2'" />
              <span v-if="isSelected(img)" class="tm-thumb-badge">当前</span>
              <button v-if="!isSelected(img)" class="tm-thumb-del" title="删除" @click.stop="askDelete(img)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 删除二次确认 -->
    <div v-if="pendingDelete" class="tm-modal-mask" @click.self="pendingDelete = null">
      <div class="tm-confirm">
        <p class="tm-confirm-text">确定删除这张已上传图片吗？<br />删除后不可恢复。</p>
        <div class="tm-confirm-preview">
          <img :src="pendingDelete.url" @error="e => e.target.style.opacity='0.2'" />
        </div>
        <div class="tm-confirm-actions">
          <button class="tm-btn-cancel" @click="pendingDelete = null" :disabled="deleting">取消</button>
          <button class="tm-btn-danger" @click="doDelete" :disabled="deleting">{{ deleting ? '删除中...' : '确认删除' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue';

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

// 文件输入框引用
const faviconFileInput = ref(null);
const desktopFileInput = ref(null);
const mobileFileInput = ref(null);

// 选择图片下拉菜单 / 已上传图片选择器状态
const activeMenu = ref(null);       // 当前展开菜单的目标：favicon | desktop | mobile | null
const galleryOpen = ref(false);     // 已上传图片选择器是否打开
const galleryTarget = ref(null);    // 选择器当前作用的目标
const uploadedImages = ref([]);     // 已上传图片列表
const loadingGallery = ref(false);
const pendingDelete = ref(null);    // 待删除的图片对象（用于二次确认）
const deleting = ref(false);

const getHeaders = () => ({
  'Authorization': `Bearer ${localStorage.getItem('token')}`,
  'Content-Type': 'application/json'
});

const getAuthHeader = () => ({ 'Authorization': `Bearer ${localStorage.getItem('token')}` });

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
 * @param {'desktop'|'mobile'|'favicon'} target - 上传目标
 */
const handleUpload = async (e, target) => {
  const file = e.target.files[0];
  if (!file) return;

  const loading = target === 'desktop' ? uploadingDesktop : (target === 'mobile' ? uploadingMobile : uploadingFavicon);
  loading.value = true;

  const formData = new FormData();
  // NOTE: target 需在 file 之前追加，保证后端（multer）在生成文件名时能读到该字段
  formData.append('target', target);
  formData.append('bg', file);

  try {
    const res = await fetch('/api/settings/upload-bg', {
      method: 'POST',
      headers: getAuthHeader(),
      body: formData
    });
    const data = await res.json();
    if (data.code === 200) {
      applyImage(target, data.data.url);
    } else {
      alert(data.message || '上传失败');
    }
  } catch (error) {
    alert('上传失败');
  } finally {
    loading.value = false;
    // NOTE: 清空输入框，保证再次选择同一文件仍能触发 change
    e.target.value = '';
  }
};

/**
 * 将图片 URL 写入对应目标字段
 */
const applyImage = (target, url) => {
  if (target === 'desktop') form.value.bg_desktop_value = url;
  else if (target === 'mobile') form.value.bg_mobile_value = url;
  else form.value.favicon_url = url;
};

/**
 * 切换「选择图片」下拉菜单
 */
const toggleMenu = (target) => {
  activeMenu.value = activeMenu.value === target ? null : target;
};

/**
 * 选择本地图片：触发对应的文件输入框
 */
const pickLocal = (target) => {
  activeMenu.value = null;
  const el = target === 'favicon' ? faviconFileInput.value
    : target === 'desktop' ? desktopFileInput.value
    : mobileFileInput.value;
  if (el) el.click();
};

/**
 * 打开已上传图片选择器
 */
const openGallery = async (target) => {
  activeMenu.value = null;
  galleryTarget.value = target;
  galleryOpen.value = true;
  await loadUploaded(target);
};

const closeGallery = () => { galleryOpen.value = false; };

/**
 * 加载某个目标已上传的图片列表（仅该用途的图片）
 * @param {'favicon'|'desktop'|'mobile'} target
 */
const loadUploaded = async (target) => {
  loadingGallery.value = true;
  try {
    const res = await fetch('/api/settings/uploads?target=' + encodeURIComponent(target), { headers: getAuthHeader() });
    const data = await res.json();
    uploadedImages.value = (data.code === 200 && Array.isArray(data.data)) ? data.data : [];
  } catch (error) {
    uploadedImages.value = [];
  } finally {
    loadingGallery.value = false;
  }
};

/**
 * 当前目标字段正在使用的图片 URL
 */
const currentValue = () => {
  const t = galleryTarget.value;
  return t === 'favicon' ? form.value.favicon_url
    : t === 'desktop' ? form.value.bg_desktop_value
    : form.value.bg_mobile_value;
};

const isSelected = (img) => currentValue() === img.url;

/**
 * 选中一张已上传图片
 */
const selectImage = (img) => {
  applyImage(galleryTarget.value, img.url);
  closeGallery();
};

/**
 * 请求删除某张图片（弹出二次确认）
 */
const askDelete = (img) => {
  // NOTE: 当前正在使用的图片不允许删除
  if (isSelected(img)) return;
  pendingDelete.value = img;
};

/**
 * 执行删除
 */
const doDelete = async () => {
  if (!pendingDelete.value) return;
  const target = pendingDelete.value;
  deleting.value = true;
  try {
    const res = await fetch('/api/settings/uploads/' + encodeURIComponent(target.key), {
      method: 'DELETE',
      headers: getAuthHeader()
    });
    const data = await res.json();
    if (data.code === 200) {
      uploadedImages.value = uploadedImages.value.filter(i => i.key !== target.key);
      // NOTE: 若被删除的图片正被某个字段引用，则一并清空
      ['favicon_url', 'bg_desktop_value', 'bg_mobile_value'].forEach(k => {
        if (form.value[k] === target.url) form.value[k] = '';
      });
      pendingDelete.value = null;
    } else {
      alert(data.message || '删除失败');
    }
  } catch (error) {
    alert('删除失败');
  } finally {
    deleting.value = false;
  }
};

/**
 * 点击页面其他区域时关闭下拉菜单
 */
const handleClickOutside = (e) => {
  if (!e.target.closest('.tm-pick')) activeMenu.value = null;
};

// NOTE: 主题模式切换时立即通知父组件，实现实时预览
watch(() => form.value.admin_theme, (newTheme) => {
  emit('theme-change', newTheme);
});

onMounted(() => {
  loadSettings();
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
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
.tm-pick {
  position: relative;
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
.tm-caret {
  margin-left: 2px;
  opacity: 0.7;
}
.tm-menu {
  position: absolute;
  top: calc(100% + 6px);
  left: 0;
  z-index: 20;
  min-width: 140px;
  background: var(--admin-card-bg, #fff);
  border: 1px solid var(--admin-border, #d0d7e2);
  border-radius: 8px;
  box-shadow: 0 6px 20px rgba(0,0,0,0.12);
  padding: 4px;
  display: flex;
  flex-direction: column;
}
.tm-menu-item {
  text-align: left;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: var(--admin-text, #222);
  font-size: 14px;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
.tm-menu-item:hover {
  background: var(--admin-active-bg, #eff5ff);
  color: #2566d8;
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

/* ==================== 已上传图片选择器 ==================== */
.tm-modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}
.tm-modal {
  width: 100%;
  max-width: 640px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--admin-card-bg, #fff);
  border: 1px solid var(--admin-border, #eaeaea);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
}
.tm-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--admin-border, #eaeaea);
  background: var(--admin-card-header-bg, #fafbfc);
}
.tm-modal-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--admin-text, #222);
}
.tm-modal-close {
  border: none;
  background: transparent;
  font-size: 22px;
  line-height: 1;
  cursor: pointer;
  color: var(--admin-text-secondary, #888);
}
.tm-modal-close:hover {
  color: var(--admin-text, #222);
}
.tm-modal-body {
  padding: 20px;
  overflow-y: auto;
}
.tm-gallery-tip {
  text-align: center;
  color: var(--admin-text-secondary, #888);
  font-size: 14px;
  padding: 40px 0;
}
.tm-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
}
.tm-thumb {
  position: relative;
  aspect-ratio: 16 / 10;
  border-radius: 8px;
  overflow: hidden;
  border: 2px solid var(--admin-border, #eaeaea);
  cursor: pointer;
  background: var(--admin-active-bg, #f5f6fa);
  transition: border-color 0.15s, transform 0.15s;
}
.tm-thumb:hover {
  border-color: #2566d8;
  transform: translateY(-2px);
}
.tm-thumb.selected {
  border-color: #2566d8;
  box-shadow: 0 0 0 2px rgba(37,102,216,0.25);
}
.tm-thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.tm-thumb-badge {
  position: absolute;
  left: 6px;
  bottom: 6px;
  padding: 2px 8px;
  font-size: 12px;
  border-radius: 10px;
  background: #2566d8;
  color: #fff;
}
.tm-thumb-del {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 6px;
  background: rgba(209,48,43,0.9);
  color: #fff;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.15s;
}
.tm-thumb:hover .tm-thumb-del {
  opacity: 1;
}
.tm-thumb-del:hover {
  background: #b0231f;
}

/* ==================== 删除二次确认 ==================== */
.tm-confirm {
  width: 100%;
  max-width: 360px;
  background: var(--admin-card-bg, #fff);
  border: 1px solid var(--admin-border, #eaeaea);
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.25);
}
.tm-confirm-text {
  margin: 0 0 16px 0;
  font-size: 15px;
  line-height: 1.6;
  color: var(--admin-text, #222);
  text-align: center;
}
.tm-confirm-preview {
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--admin-border, #eaeaea);
  margin-bottom: 20px;
}
.tm-confirm-preview img {
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  display: block;
}
.tm-confirm-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}
.tm-btn-cancel,
.tm-btn-danger {
  padding: 9px 22px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.tm-btn-cancel {
  border: 1px solid var(--admin-border, #d0d7e2);
  background: var(--admin-card-bg, #fff);
  color: var(--admin-text, #222);
}
.tm-btn-cancel:hover:not(:disabled) {
  background: var(--admin-active-bg, #f5f6fa);
}
.tm-btn-danger {
  border: none;
  background: #d1302b;
  color: #fff;
}
.tm-btn-danger:hover:not(:disabled) {
  background: #b0231f;
}
.tm-btn-cancel:disabled,
.tm-btn-danger:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
