const express = require('express');
const router = express.Router();
const db = require('../db');
const authMiddleware = require('./authMiddleware');

const BACKUP_VERSION = 1;
// 允许导入/导出的表 —— 顺序即为导入时的写入顺序（先父后子）
const TABLES = [
  'menus',
  'sub_menus',
  'cards',
  'ads',
  'friends',
  'site_settings',
  'users',
];

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows || [])));
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

/**
 * 导出所有配置数据为 JSON
 * 包含菜单、子菜单、卡片、广告、友链、站点设置、用户账号（含密码 hash）
 * 不包含 uploads 目录下的图片文件
 */
router.get('/export', authMiddleware, async (_req, res) => {
  try {
    const data = {};
    for (const t of TABLES) {
      data[t] = await all(`SELECT * FROM ${t}`);
    }
    const payload = {
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      source: 'nav-item',
      data,
    };
    const filename = `nav-item-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(JSON.stringify(payload, null, 2));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/**
 * 导入配置数据（会清空现有数据后写入）
 * body: { data: {menus, sub_menus, cards, ads, friends, site_settings, users} }
 * 用户表将被完全替换（含密码 hash），导入完成后需用备份时的账号密码登录
 */
router.post('/import', authMiddleware, async (req, res) => {
  const body = req.body || {};
  const payload = body.data && body.data.data ? body.data : body;
  const data = payload.data;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ error: '备份文件格式无效' });
  }

  try {
    await run('BEGIN');
    // 关掉外键约束以简化清空顺序
    await run('PRAGMA foreign_keys = OFF');
    // 先删子表再删父表，避免外键触发
    const clearOrder = ['cards', 'sub_menus', 'menus', 'ads', 'friends', 'site_settings', 'users'];
    for (const t of clearOrder) {
      await run(`DELETE FROM ${t}`);
      // 重置自增序列（若存在 sqlite_sequence 记录）
      await run(`DELETE FROM sqlite_sequence WHERE name = ?`, [t]).catch(() => {});
    }

    let inserted = 0;
    for (const t of TABLES) {
      const rows = Array.isArray(data[t]) ? data[t] : [];
      for (const row of rows) {
        const cols = Object.keys(row);
        if (cols.length === 0) continue;
        const placeholders = cols.map(() => '?').join(', ');
        const quoted = cols.map((c) => `"${c}"`).join(', ');
        const values = cols.map((c) => row[c]);
        await run(`INSERT INTO ${t} (${quoted}) VALUES (${placeholders})`, values);
        inserted++;
      }
    }

    await run('PRAGMA foreign_keys = ON');
    await run('COMMIT');
    res.json({ code: 200, message: `导入成功，共写入 ${inserted} 条记录`, inserted });
  } catch (e) {
    await run('ROLLBACK').catch(() => {});
    await run('PRAGMA foreign_keys = ON').catch(() => {});
    res.status(500).json({ error: '导入失败: ' + e.message });
  }
});

module.exports = router;
