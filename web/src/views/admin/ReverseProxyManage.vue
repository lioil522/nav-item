<template>
  <div class="rp-manage">
    <div class="rp-tabs">
      <button
        class="rp-tab"
        :class="{ active: tab === 'cloudflare' }"
        @click="tab = 'cloudflare'"
        type="button"
      >
        Cloudflare Tunnel
      </button>
      <button
        class="rp-tab"
        :class="{ active: tab === 'caddy' }"
        @click="tab = 'caddy'"
        type="button"
      >
        Caddy 反向代理
      </button>
    </div>
    <!-- NOTE: 用 v-show 保留组件状态，切换标签页时不重置轮询与表单 -->
    <CloudflareManage v-show="tab === 'cloudflare'" />
    <CaddyManage v-show="tab === 'caddy'" />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import CloudflareManage from './CloudflareManage.vue';
import CaddyManage from './CaddyManage.vue';

const tab = ref('cloudflare');
</script>

<style scoped>
.rp-manage {
  width: 100%;
  max-width: 1000px;
  padding: 20px 20px 0 20px;
  box-sizing: border-box;
}
.rp-tabs {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--admin-border, #e3e6ef);
}
.rp-tab {
  padding: 10px 20px;
  border: none;
  background: none;
  font-size: 15px;
  font-weight: 500;
  color: var(--admin-text-secondary, #888);
  cursor: pointer;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
  transition: color 0.2s, border-color 0.2s;
}
.rp-tab:hover {
  color: var(--admin-active-color, #2566d8);
}
.rp-tab.active {
  color: var(--admin-active-color, #2566d8);
  border-bottom-color: var(--admin-active-color, #2566d8);
  font-weight: 600;
}
/* NOTE: 子组件自带 padding，这里移除标签页与卡片间的额外内边距 */
.rp-manage :deep(.cloudflare-manage),
.rp-manage :deep(.caddy-manage) {
  padding: 20px 0 0 0;
}
</style>
