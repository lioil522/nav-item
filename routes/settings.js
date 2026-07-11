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
 * 背景图片上传的 multer 配置
 * 存储到 database/uploads/ 目录，文件名使用 bg- 前缀 + 时间戳
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, 'bg-' + Date.now() + ext);
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

module.exports = router;
