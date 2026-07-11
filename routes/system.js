const express = require('express');
const router = express.Router();
const cloudflared = require('../utils/cloudflared');
const caddy = require('../utils/caddy');
const authMiddleware = require('./authMiddleware');

// NOTE: 所有系统管理接口都需要登录认证
router.use(authMiddleware);

/**
 * 获取 cloudflared 运行状态
 */
router.get('/cloudflared', (_req, res) => {
  try {
    const status = cloudflared.status();
    res.json({ code: 200, data: status });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

/**
 * 启动 cloudflared 隧道
 * @param {string} req.body.token - 可选，Cloudflare Tunnel 令牌
 */
router.post('/cloudflared/start', (req, res) => {
  const { token } = req.body;
  try {
    if (token) {
      cloudflared.saveToken(token);
    }
    cloudflared.start(token);
    res.json({ code: 200, message: 'cloudflared 启动成功', data: cloudflared.status() });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

/**
 * 停止 cloudflared 隧道
 */
router.post('/cloudflared/stop', (_req, res) => {
  try {
    cloudflared.stop();
    res.json({ code: 200, message: 'cloudflared 正在停止', data: cloudflared.status() });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

/**
 * 移除已保存的隧道令牌
 */
router.post('/cloudflared/remove-token', (_req, res) => {
  try {
    cloudflared.removeToken();
    res.json({ code: 200, message: '令牌已移除', data: cloudflared.status() });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

/**
 * 获取 caddy 反向代理运行状态及规则
 */
router.get('/caddy', (_req, res) => {
  try {
    const status = caddy.status();
    res.json({ code: 200, data: status });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

/**
 * 保存反向代理规则（不启动进程）
 * @param {string} req.body.email - 可选，ACME 证书申请邮箱
 * @param {Array}  req.body.sites - 反向代理规则 [{ domain, upstream }]
 */
router.post('/caddy/config', (req, res) => {
  const { email, sites } = req.body;
  try {
    caddy.saveConfig({ email, sites });
    res.json({ code: 200, message: '规则已保存', data: caddy.status() });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

/**
 * 启动 caddy 反向代理
 * @param {string} req.body.email - 可选，ACME 证书申请邮箱
 * @param {Array}  req.body.sites - 可选，反向代理规则，传入时会先保存
 */
router.post('/caddy/start', (req, res) => {
  const { email, sites } = req.body;
  try {
    caddy.start({ email, sites });
    res.json({ code: 200, message: 'caddy 启动成功', data: caddy.status() });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

/**
 * 保存规则并热重载 caddy（运行中时生效，不中断连接）
 * @param {string} req.body.email - 可选，ACME 证书申请邮箱
 * @param {Array}  req.body.sites - 反向代理规则
 */
router.post('/caddy/reload', (req, res) => {
  const { email, sites } = req.body;
  try {
    const result = caddy.reload({ email, sites });
    const message = result.reloaded ? 'caddy 已热重载' : '规则已保存（caddy 未运行）';
    res.json({ code: 200, message, data: caddy.status() });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

/**
 * 停止 caddy 反向代理
 */
router.post('/caddy/stop', (_req, res) => {
  try {
    caddy.stop();
    res.json({ code: 200, message: 'caddy 正在停止', data: caddy.status() });
  } catch (error) {
    res.status(500).json({ code: 500, message: error.message });
  }
});

module.exports = router;
