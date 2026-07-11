const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const menuRoutes = require('./routes/menu');
const cardRoutes = require('./routes/card');
const uploadRoutes = require('./routes/upload');
const authRoutes = require('./routes/auth');
const adRoutes = require('./routes/ad');
const friendRoutes = require('./routes/friend');
const userRoutes = require('./routes/user');
const systemRoutes = require('./routes/system');
const settingsRoutes = require('./routes/settings');
const compression = require('compression');
const app = express();

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(compression());
app.use('/uploads', express.static(path.join(__dirname, 'database/uploads')));
app.use(express.static(path.join(__dirname, 'web/dist')));

app.use((req, res, next) => {
  if (
    req.method === 'GET' &&
    !req.path.startsWith('/api') &&
    !req.path.startsWith('/uploads') &&
    !fs.existsSync(path.join(__dirname, 'web/dist', req.path))
  ) {
    res.sendFile(path.join(__dirname, 'web/dist', 'index.html'));
  } else {
    next();
  }
});

app.use('/api/menus', menuRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api', authRoutes);
app.use('/api/ads', adRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/users', userRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/settings', settingsRoutes);

app.listen(PORT, () => {
  console.log(`server is running at http://localhost:${PORT}`);

  // NOTE: 根据环境变量自动拉起 Caddy 反向代理（配置即部署），失败不影响主应用
  try {
    const caddy = require('./utils/caddy');
    if (caddy.autostart()) {
      console.log('caddy reverse proxy autostarted from environment variables');
    }
  } catch (e) {
    console.error('caddy autostart error:', e && e.message ? e.message : e);
  }
});
