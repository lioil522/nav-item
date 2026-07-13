require('dotenv').config();

module.exports = {
  admin: {
    username: process.env.ADMIN_USERNAME || 'admin',
    password: process.env.ADMIN_PASSWORD || '123456'
  },
  server: {
    port: process.env.PORT || 3000,
    jwtSecret: process.env.JWT_SECRET || 'nav-item-jwt-secret-2024-secure-key',
    // token 有效期（小时），默认 7 天，可用环境变量 TOKEN_TTL_HOURS 覆盖
    tokenTtlHours: parseInt(process.env.TOKEN_TTL_HOURS) || 24 * 7
  }
}; 