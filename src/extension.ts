import * as vscode from 'vscode';
import { NginxConfigGenerator } from './nginxGenerator';
import { ProjectDetector, ProjectType } from './projectDetector';

export function activate(context: vscode.ExtensionContext) {
    console.log('Nginx Config Generator 扩展已激活');

    const generator = new NginxConfigGenerator();
    const detector = new ProjectDetector();

    // 注册：生成基础 Nginx 配置
    let disposableGenerate = vscode.commands.registerCommand('nginxGen.generate', async (uri: vscode.Uri) => {
        const workspaceFolder = uri || vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('请先打开一个工作区文件夹');
            return;
        }

        const targetPath = uri?.fsPath || (workspaceFolder as vscode.WorkspaceFolder).uri.fsPath;
        
        try {
            // 检测项目类型
            const projectInfo = await detector.detect(targetPath);
            
            // 生成配置
            const config = generator.generate(projectInfo);
            
            // 保存文件
            const configPath = await saveConfigFile(targetPath, config, 'nginx.conf');
            
            vscode.window.showInformationMessage(
                `Nginx 配置已生成: ${configPath}`,
                '打开文件',
                '预览配置'
            ).then(selection => {
                if (selection === '打开文件') {
                    vscode.workspace.openTextDocument(configPath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                } else if (selection === '预览配置') {
                    previewConfig(config);
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`生成失败: ${error}`);
        }
    });

    // 注册：生成高级 Nginx 配置
    let disposableAdvanced = vscode.commands.registerCommand('nginxGen.generateAdvanced', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('请先打开一个工作区文件夹');
            return;
        }

        try {
            // 获取高级选项
            const options = await promptAdvancedOptions();
            if (!options) return;

            // 检测项目类型
            const projectInfo = await detector.detect(workspaceFolder.uri.fsPath);
            
            // 生成高级配置
            const config = generator.generateAdvanced(projectInfo, options);
            
            // 保存文件
            const configPath = await saveConfigFile(
                workspaceFolder.uri.fsPath, 
                config, 
                'nginx-advanced.conf'
            );
            
            vscode.window.showInformationMessage(
                `高级 Nginx 配置已生成: ${configPath}`,
                '打开文件'
            ).then(selection => {
                if (selection === '打开文件') {
                    vscode.workspace.openTextDocument(configPath).then(doc => {
                        vscode.window.showTextDocument(doc);
                    });
                }
            });
        } catch (error) {
            vscode.window.showErrorMessage(`生成失败: ${error}`);
        }
    });

    // 注册：预览配置
    let disposablePreview = vscode.commands.registerCommand('nginxGen.preview', async () => {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('请先打开一个工作区文件夹');
            return;
        }

        try {
            const projectInfo = await detector.detect(workspaceFolder.uri.fsPath);
            const config = generator.generate(projectInfo);
            previewConfig(config);
        } catch (error) {
            vscode.window.showErrorMessage(`预览失败: ${error}`);
        }
    });

    context.subscriptions.push(disposableGenerate, disposableAdvanced, disposablePreview);
}

async function saveConfigFile(targetPath: string, content: string, filename: string): Promise<string> {
    const fs = require('fs');
    const path = require('path');
    
    // 默认保存到项目根目录
    let configPath = path.join(targetPath, filename);
    
    // 如果有 nginx 目录，保存到 nginx 目录
    const nginxDir = path.join(targetPath, 'nginx');
    if (fs.existsSync(nginxDir)) {
        configPath = path.join(nginxDir, filename);
    }
    
    fs.writeFileSync(configPath, content, 'utf8');
    return configPath;
}

function previewConfig(config: string) {
    const panel = vscode.window.createWebviewPanel(
        'nginxConfigPreview',
        'Nginx 配置预览',
        vscode.ViewColumn.One,
        {}
    );

    panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { 
                    font-family: monospace; 
                    padding: 20px;
                    background: #1e1e1e;
                    color: #d4d4d4;
                }
                pre {
                    white-space: pre-wrap;
                    word-wrap: break-word;
                    background: #252526;
                    padding: 20px;
                    border-radius: 8px;
                    overflow-x: auto;
                }
                .comment { color: #6a9955; }
                .directive { color: #569cd6; }
                .value { color: #ce9178; }
                h2 { color: #fff; }
                .copy-btn {
                    background: #0e639c;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 4px;
                    cursor: pointer;
                    margin-bottom: 10px;
                }
                .copy-btn:hover { background: #1177bb; }
            </style>
        </head>
        <body>
            <h2>🚀 Nginx 配置预览</h2>
            <button class="copy-btn" onclick="copyToClipboard()">复制配置</button>
            <pre id="config"><code>${escapeHtml(config)}</code></pre>
            <script>
                function copyToClipboard() {
                    const config = \`${config.replace(/`/g, '\\`')}\`;
                    navigator.clipboard.writeText(config).then(() => {
                        alert('配置已复制到剪贴板！');
                    });
                }
                function escapeHtml(text) {
                    return text
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                }
            </script>
        </body>
        </html>
    `;
}

async function promptAdvancedOptions(): Promise<any | undefined> {
    const options = {
        port: 80,
        serverName: '',
        enableHttps: false,
        enableGzip: true,
        enableCache: true,
        enableProxy: false,
        proxyTarget: '',
        enableLoadBalance: false,
        upstreamServers: '',
        enableCors: true,
        enableRateLimit: false
    };

    // 端口
    const portInput = await vscode.window.showInputBox({
        prompt: '请输入 Nginx 监听端口',
        value: '80',
        validateInput: (value) => {
            const port = parseInt(value);
            if (isNaN(port) || port < 1 || port > 65535) {
                return '请输入有效的端口号 (1-65535)';
            }
            return null;
        }
    });
    if (portInput === undefined) return undefined;
    options.port = parseInt(portInput);

    // 服务器名称
    const serverNameInput = await vscode.window.showInputBox({
        prompt: '请输入服务器域名（可选，如: example.com）',
        placeHolder: '留空使用 localhost'
    });
    if (serverNameInput === undefined) return undefined;
    options.serverName = serverNameInput || 'localhost';

    // HTTPS
    const httpsPick = await vscode.window.showQuickPick(['否', '是'], {
        placeHolder: '是否启用 HTTPS？'
    });
    if (httpsPick === undefined) return undefined;
    options.enableHttps = httpsPick === '是';

    // 反向代理
    const proxyPick = await vscode.window.showQuickPick(['否', '是'], {
        placeHolder: '是否启用反向代理（API 转发）？'
    });
    if (proxyPick === undefined) return undefined;
    options.enableProxy = proxyPick === '是';

    if (options.enableProxy) {
        const proxyInput = await vscode.window.showInputBox({
            prompt: '请输入代理目标地址（如: http://localhost:3000）',
            placeHolder: 'http://localhost:3000',
            validateInput: (value) => {
                if (!value || !value.startsWith('http')) {
                    return '请输入有效的 URL，以 http:// 或 https:// 开头';
                }
                return null;
            }
        });
        if (proxyInput === undefined) return undefined;
        options.proxyTarget = proxyInput;
    }

    // 负载均衡
    const lbPick = await vscode.window.showQuickPick(['否', '是'], {
        placeHolder: '是否启用负载均衡？'
    });
    if (lbPick === undefined) return undefined;
    options.enableLoadBalance = lbPick === '是';

    if (options.enableLoadBalance) {
        const upstreamInput = await vscode.window.showInputBox({
            prompt: '请输入后端服务器列表（用逗号分隔）',
            placeHolder: 'localhost:3000, localhost:3001, localhost:3002',
            validateInput: (value) => {
                if (!value || value.split(',').length < 2) {
                    return '至少需要两个服务器，用逗号分隔';
                }
                return null;
            }
        });
        if (upstreamInput === undefined) return undefined;
        options.upstreamServers = upstreamInput;
    }

    return options;
}

export function deactivate() {}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
