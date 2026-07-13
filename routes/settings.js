const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('./authMiddleware');

// NOTE: 背景图与图标统一存放在 database/uploads，与数据库同处一个持久化目录
const uploadDir = path.join(__dirname, '../database/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * 根据上传目标返回文件名前缀，用于区分不同用途的图片（各自独立展示，互不混淆）
 * @param {string} target - favicon | desktop | mobile
 */
const themePrefix = (target) =>
  target === 'favicon' ? 'favicon-'
    : target === 'mobile' ? 'bg-mobile-'
    : 'bg-desktop-';

/**
 * 背景图片上传的 multer 配置
 * 存储到 database/uploads/ 目录，文件名按用途使用不同前缀 + 时间戳
 * NOTE: 前端在 file 之前追加 target 字段，故此处 req.body.target 可用
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, themePrefix(req.body.target) + Date.now() + ext);
  }
});
const upload = multer({ storage });

/**
 * 获取所有站点设置（公开接口，主页需要读取）
 */
router.get('/', (_req, res) => {
  db.all('SELECT key, value FROM site_settings', (err, rows) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    const settings = {};
    (rows || []).forEach(row => { settings[row.key] = row.value; });
    res.json({ code: 200, data: settings });
  });
});

/**
 * 批量更新站点设置（需认证）
 * @param {object} req.body - 键值对形式的设置项
 */
router.put('/', authMiddleware, (req, res) => {
  const settings = req.body;
  if (!settings || typeof settings !== 'object') {
    return res.status(400).json({ code: 400, message: '参数无效' });
  }

  // NOTE: 允许更新的白名单，防止注入非法 key
  const allowedKeys = [
    'site_name', 'admin_theme',
    'bg_desktop_type', 'bg_desktop_value',
    'bg_mobile_type', 'bg_mobile_value',
    'favicon_type', 'favicon_url'
  ];

  const stmt = db.prepare('INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)');
  let updatedCount = 0;

  for (const [key, value] of Object.entries(settings)) {
    if (allowedKeys.includes(key)) {
      stmt.run(key, String(value));
      updatedCount++;
    }
  }

  stmt.finalize((err) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    res.json({ code: 200, message: `已更新 ${updatedCount} 项设置` });
  });
});

/**
 * 上传背景图片（需认证）
 * 返回上传后的文件路径
 */
router.post('/upload-bg', authMiddleware, upload.single('bg'), (req, res) => {
  if (!req.file) return res.status(400).json({ code: 400, message: '未选择文件' });
  res.json({
    code: 200,
    data: { url: '/uploads/' + req.file.filename }
  });
});

/**
 * 列出某个目标（favicon/desktop/mobile）已上传的图片，仅返回该用途的图片
 */
router.get('/uploads', authMiddleware, (req, res) => {
  const prefix = themePrefix(req.query.target);
  fs.readdir(uploadDir, (err, files) => {
    if (err) return res.status(500).json({ code: 500, message: err.message });
    const items = (files || [])
      .filter(f => f.startsWith(prefix))
      .map(f => {
        let mtime = 0;
        try { mtime = fs.statSync(path.join(uploadDir, f)).mtimeMs; } catch (_e) { /* 忽略读取失败的文件 */ }
        return { key: f, url: '/uploads/' + f, mtime };
      })
      // 按修改时间倒序，最新的排在前面
      .sort((a, b) => b.mtime - a.mtime);
    res.json({ code: 200, data: items });
  });
});

/**
 * 删除一张已上传的主题图片（仅允许 bg-/favicon- 前缀，避免误删卡片 logo 等）
 */
router.delete('/uploads/:key', authMiddleware, (req, res) => {
  const key = req.params.key;
  if (!key || !(key.startsWith('bg-') || key.startsWith('favicon-')) || key.includes('/') || key.includes('..')) {
    return res.status(400).json({ code: 400, message: '非法文件名' });
  }
  fs.unlink(path.join(uploadDir, key), (err) => {
    if (err) {
      if (err.code === 'ENOENT') return res.json({ code: 200, message: '已删除' });
      return res.status(500).json({ code: 500, message: err.message });
    }
    res.json({ code: 200, message: '已删除' });
  });
});

module.exports = router;
