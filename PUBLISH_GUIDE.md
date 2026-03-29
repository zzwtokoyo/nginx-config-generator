# 发布指南

## 🚀 本地开发测试

### 1. 安装依赖

```bash
npm install
```

### 2. 编译项目

```bash
npm run compile
```

或者使用 watch 模式（开发时自动重新编译）：

```bash
npm run watch
```

### 3. 调试运行

按 `F5` 打开 Extension Development Host，在新窗口中测试扩展功能。

## 📦 打包扩展

### 安装 vsce 工具

```bash
npm install -g @vscode/vsce
```

### 打包

```bash
vsce package
```

这将生成 `nginx-config-generator-1.0.0.vsix` 文件。

### 本地安装测试

```bash
code --install-extension nginx-config-generator-1.0.0.vsix
```

## 🌐 发布到 VS Code Marketplace

### 1. 创建 Publisher

访问 https://aka.ms/vscode-create-publisher 创建发布者账号。

需要：
- Microsoft / Azure 账号
- Publisher ID（唯一标识）
- 显示名称

### 2. 登录

```bash
vsce login <publisher-id>
```

输入 Personal Access Token。

### 3. 发布

```bash
vsce publish
```

或者指定版本：

```bash
vsce publish minor  # 自动增加次版本号
vsce publish patch  # 自动增加修订号
vsce publish 1.1.0  # 指定版本号
```

## 🔧 发布前检查清单

- [ ] 更新 `package.json` 中的版本号
- [ ] 更新 `CHANGELOG.md`
- [ ] 运行 `npm run compile` 无错误
- [ ] 测试所有命令正常工作
- [ ] 检查 README.md 是否完整
- [ ] 确认图标和截图存在

## 🐛 常见问题

### 编译错误

如果看到 `Cannot find module` 错误：

```bash
rm -rf node_modules out
npm install
npm run compile
```

### 发布失败

检查 token 权限是否包含 `Marketplace (Publish)`。

## 📄 目录结构说明

```
.
├── .vscode/              # VS Code 配置
├── out/                  # 编译输出（.gitignore）
├── src/                  # 源代码
│   ├── extension.ts      # 入口文件
│   ├── projectDetector.ts
│   ├── nginxGenerator.ts
│   ├── configValidator.ts
│   ├── deployScriptGenerator.ts
│   └── templates/
├── .gitignore
├── package.json          # 扩展配置
├── README.md
├── CHANGELOG.md
└── LICENSE
```

## 📝 更新日志格式

创建 `CHANGELOG.md`：

```markdown
# Change Log

## [1.0.0] - 2024-03-29

### Added
- 初始版本发布
- 支持 React、Vue、Angular 项目检测
- 基础 Nginx 配置生成
- 高级配置选项（HTTPS、反向代理、负载均衡）
```
