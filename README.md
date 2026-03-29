# Nginx Config Generator

一个 VS Code 扩展，为 Web 项目自动生成 Nginx 配置文件。支持 React、Vue、Angular、Next.js、Nuxt.js 等主流前端框架。

## ✨ 功能特性

- 🔍 **自动检测项目类型** - 自动识别 React、Vue、Angular、Next.js、Nuxt.js 等项目
- 📝 **生成基础配置** - 一键生成适合项目的 Nginx 基础配置
- ⚙️ **高级配置选项** - 支持 HTTPS、反向代理、负载均衡、跨域等高级功能
- 👀 **实时预览** - 在 VS Code 内预览生成的配置
- 📋 **一键复制** - 快速复制配置到剪贴板

## 🚀 使用方法

### 方式一：命令面板

1. 打开 VS Code 命令面板 (`Cmd+Shift+P` 或 `Ctrl+Shift+P`)
2. 输入 "Nginx Generator" 查看可用命令
3. 选择：
   - **生成 Nginx 配置** - 自动生成基础配置
   - **生成高级 Nginx 配置** - 自定义高级选项
   - **预览 Nginx 配置** - 预览但不保存

### 方式二：右键菜单

在资源管理器中右键点击项目文件夹，选择 "生成 Nginx 配置"。

## 📋 支持的框架

| 框架 | 检测依据 | 特殊处理 |
|------|----------|----------|
| React (Vite) | `vite` + `react` | SPA 路由 |
| React (CRA) | `react-scripts` | build 目录 |
| Vue 3 | `vue` + `vite` | SPA 路由 |
| Vue 2 (CLI) | `vue` + `@vue/cli` | 读取 vue.config.js |
| Angular | `@angular/core` | 读取 angular.json |
| Next.js | `next` | SSR 支持 |
| Nuxt | `nuxt` 或 `nuxt3` | SSR 支持 |
| Svelte | `svelte` | SPA 路由 |

## ⚙️ 配置选项

### 基础配置
- **端口** - Nginx 监听端口 (默认: 80)
- **服务器名称** - 域名配置

### 高级配置
- ✅ **HTTPS** - SSL/TLS 证书配置
- ✅ **Gzip 压缩** - 静态资源压缩
- ✅ **反向代理** - API 请求转发
- ✅ **负载均衡** - 多后端服务器轮询
- ✅ **跨域 (CORS)** - 自动添加跨域头
- ✅ **静态缓存** - 静态资源缓存策略

## 📁 生成的配置示例

### React/Vue SPA 项目
```nginx
server {
    listen 80;
    server_name localhost;
    
    root /var/www/my-app/dist;
    index index.html;
    
    # SPA 路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 带反向代理的配置
```nginx
server {
    listen 80;
    server_name api.example.com;
    
    # 前端静态文件
    location / {
        root /var/www/frontend/dist;
        try_files $uri $uri/ /index.html;
    }
    
    # API 反向代理
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 负载均衡配置
```nginx
upstream backend {
    server localhost:3000 weight=3;
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    
    location /api/ {
        proxy_pass http://backend;
    }
}
```

## 🛠️ 安装依赖和开发

```bash
# 安装依赖
npm install

# 编译
npm run compile

# 调试
按 F5 打开 Extension Development Host

# 打包
npm run package
```

## 📝 部署步骤

1. 在 VS Code 中生成配置
2. 将配置文件保存到服务器：
   ```bash
   sudo cp nginx.conf /etc/nginx/conf.d/my-app.conf
   ```
3. 测试配置：
   ```bash
   sudo nginx -t
   ```
4. 重新加载 Nginx：
   ```bash
   sudo nginx -s reload
   ```

## 🔧 扩展设置

在 VS Code 设置中搜索 "Nginx Generator"：

- `nginxGen.defaultPort` - 默认端口 (默认: 80)
- `nginxGen.enableHttps` - 默认启用 HTTPS (默认: false)
- `nginxGen.enableGzip` - 默认启用 Gzip (默认: true)
- `nginxGen.enableCache` - 默认启用缓存 (默认: true)

## 🐛 常见问题

**Q: 为什么生成的配置无法直接使用？**
A: 需要根据你的实际服务器环境修改路径、域名等信息。

**Q: 如何配置 HTTPS？**
A: 使用高级配置选项，填写 SSL 证书路径。

**Q: 支持 Docker 部署吗？**
A: 生成的配置可以直接用于 Docker Nginx 容器。

## 📄 开源协议

MIT License

## 🤝 贡献

欢迎提交 Issue 和 PR！
