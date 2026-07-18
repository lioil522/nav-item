# Nav-item - 个人导航站

## 项目简介

一个现代化的导航网站项目，提供简洁美观的导航界面和强大的后台管理系统,快速访问常用网站和工具。

## 🛠️ 技术栈
- Vue 3 + Node.js + SQLite 前后端分离架构

## ✨ 主要功能

### 前端功能
- 🏠 **首页导航**：美观的卡片式导航界面
- 🔍 **聚合搜索**：支持 Google、百度、Bing、GitHub、站内搜索
- 📱 **响应式设计**：完美适配桌面端和移动端
- 🎨 **现代化UI**：采用渐变背景和毛玻璃效果
- 🔗 **友情链接**：支持友情链接展示
- 📢 **广告位**：支持左右两侧广告位展示

### 后台管理功能
- 👤 **用户管理**：管理员登录、用户信息管理
- 📋 **栏目管理**：主菜单和子菜单的增删改查
- 🃏 **卡片管理**：导航卡片的增删改查
- 📢 **广告管理**：广告位的增删改查
- 🔗 **友链管理**：友情链接的增删改查
- 🎨 **主题管理**：站点主题与外观设置
- 📊 **数据统计**：登录时间、IP等统计信息

### 技术特性
- 🔐 **JWT认证**：安全的用户认证机制
- 🗄️ **SQLite数据库**：轻量级数据库，无需额外配置
- 📤 **文件上传**：支持图片上传功能
- 🔍 **搜索功能**：支持站内搜索和外部搜索
- 📱 **移动端适配**：完美的移动端体验

## 🏗️ 项目结构

```
nav-item/
├── app.js                # 后端主入口文件
├── config.js             # 配置文件
├── db.js                 # 数据库初始化
├── package.json          # 后端依赖配置
├── database/             # 持久化数据目录（Docker 只需挂载此目录）
│   ├── nav.db            # SQLite数据库文件
│   └── uploads/          # 上传的图标、背景图片
├── routes/               # 后端路由
│   ├── auth.js           # 认证相关路由
│   ├── authMiddleware.js # JWT 认证中间件
│   ├── menu.js           # 菜单管理路由
│   ├── card.js           # 卡片管理路由
│   ├── ad.js             # 广告管理路由
│   ├── friend.js         # 友链管理路由
│   ├── user.js           # 用户管理路由
│   ├── settings.js       # 站点设置路由（主题等）
│   └── upload.js         # 文件上传路由
├── web/                  # 前端项目目录
│   ├── package.json      # 前端依赖配置
│   ├── vite.config.mjs   # Vite配置文件
│   ├── index.html        # HTML入口文件
│   ├── public/           # 静态资源
│   │   ├── background.webp
│   │   ├── default-favicon.png
│   │   └── robots.txt
│   └── src/              # 前端源码
│       ├── main.js       # Vue应用入口
│       ├── router.js     # 路由配置
│       ├── api.js        # API接口封装
│       ├── App.vue       # 根组件
│       ├── components/   # 公共组件
│       │   ├── MenuBar.vue
│       │   └── CardGrid.vue
│       └── views/        # 页面组件
│           ├── Home.vue  # 首页
│           ├── Admin.vue # 后台管理
│           └── admin/    # 后台管理子页面
│               ├── MenuManage.vue
│               ├── CardManage.vue
│               ├── AdManage.vue
│               ├── FriendLinkManage.vue
│               ├── UserManage.vue
│               └── ThemeManage.vue
├── docker-compose.yml    # Docker Compose 部署配置
├── Dockerfile            # Docker构建文件
```

## ⚙️ 环境变量及配置说明

### 环境变量
- `PORT`: 服务器端口号（默认: 3000）
- `ADMIN_USERNAME`: 管理员用户名（默认: admin）
- `ADMIN_PASSWORD`: 管理员密码（默认: 123456）
- `JWT_SECRET`: JWT 签名密钥（**生产环境务必设为强随机字符串**；不设则用内置默认值）
- `TOKEN_TTL_HOURS`: 登录 token 有效期（小时，默认 `168` = 7 天）

### 🔐 登录与会话
- 登录采用 JWT，token 默认有效期 **7 天**（可用 `TOKEN_TTL_HOURS` 调整）。
- token 过期或失效后，前端会**自动跳回登录页**重新登录即可，**无需清除浏览器「网站数据」**。
- 修改 `JWT_SECRET` 后，已签发的旧 token 会全部失效，需要重新登录一次。

### 数据库配置
系统使用 SQLite 数据库，数据库文件会自动创建在项目 `database/` 目录下，使用 Docker 部署请挂载 `/app/database` 目录实现数据持久化。

## 🚀 部署指南

### 源代码部署

#### 1. 克隆项目
```bash
git clone https://github.com/lioil522/nav-Item.git
cd nav-item
```

#### 2. 安装后端依赖
```bash
npm install
```

#### 3. 构建前端
```bash
cd web && npm install && npm run build
```

#### 4. 启动后端服务
```bash
# 在项目根目录
cd .. && npm start
```

#### 5. 访问应用
- 前端地址：http://localhost:3000
- 后台管理：http://localhost:3000/admin
- 默认管理员账号：admin / 123456

### Docker 部署

#### 1：docker快速部署
   ```bash
   docker run -d \
     --name nav-item \
     -p 3000:3000 \
     -v $(pwd)/database:/app/database \
     -e NODE_ENV=production \
     -e ADMIN_USERNAME=admin \
     -e ADMIN_PASSWORD=123456 \
     ghcr.io/lioil522/nav-item:latest
   ```
### 2: docker-compose.yaml 部署
```yaml
version: '3'

services:
  nav-item:
    image: ghcr.io/lioil522/nav-item:latest
    container_name: nav-item
    ports:
      - "3000:3000"
    environment:
      - PORT=3000             # 监听端口
      - ADMIN_USERNAME=admin  # 后台用户名
      - ADMIN_PASSWORD=123456 # 后台密码
    volumes:
      # 所有持久化数据都在 database 目录下：nav.db 数据库、uploads 上传文件
      - ./database:/app/database
    restart: unless-stopped
```

### 3: docker容器等使用docker image配合环境变量部署
```bash
ghcr.io/lioil522/nav-item:latest
```

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👨‍💻 作者

**eooce** - [GitHub](https://github.com/eooce)

## 🙏 致谢

感谢所有为这个项目做出贡献的开发者！

---

⭐ 如果这个项目对你有帮助，请给它一个星标！ 






