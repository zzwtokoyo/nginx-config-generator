export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}

export class NginxConfigValidator {
    
    validate(config: string): ValidationResult {
        const result: ValidationResult = {
            valid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };

        // 检查基本语法
        this.checkBrackets(config, result);
        this.checkSemicolons(config, result);
        
        // 检查安全最佳实践
        this.checkSecurity(config, result);
        
        // 检查性能优化
        this.checkPerformance(config, result);
        
        // 检查常见错误
        this.checkCommonMistakes(config, result);

        result.valid = result.errors.length === 0;
        return result;
    }

    private checkBrackets(config: string, result: ValidationResult): void {
        const openBrackets = (config.match(/\{/g) || []).length;
        const closeBrackets = (config.match(/\}/g) || []).length;
        
        if (openBrackets !== closeBrackets) {
            result.errors.push(`括号不匹配: 有 ${openBrackets} 个左括号，${closeBrackets} 个右括号`);
        }
    }

    private checkSemicolons(config: string, result: ValidationResult): void {
        const lines = config.split('\n');
        
        lines.forEach((line, index) => {
            const trimmed = line.trim();
            
            // 跳过注释、空行、块开始/结束
            if (!trimmed || 
                trimmed.startsWith('#') || 
                trimmed.endsWith('{') || 
                trimmed === '}') {
                return;
            }

            // 检查指令是否以分号结尾
            if (!trimmed.endsWith(';') && !trimmed.endsWith('{')) {
                result.errors.push(`第 ${index + 1} 行缺少分号: ${trimmed.substring(0, 50)}...`);
            }
        });
    }

    private checkSecurity(config: string, result: ValidationResult): void {
        // 检查是否暴露版本号
        if (!config.includes('server_tokens off')) {
            result.warnings.push('建议添加 "server_tokens off;" 隐藏 Nginx 版本号');
        }

        // 检查安全头
        const securityHeaders = [
            { name: 'X-Frame-Options', suggestion: '添加 X-Frame-Options 防止点击劫持' },
            { name: 'X-Content-Type-Options', suggestion: '添加 X-Content-Type-Options 防止 MIME 嗅探' },
            { name: 'X-XSS-Protection', suggestion: '添加 X-XSS-Protection 启用 XSS 过滤' }
        ];

        securityHeaders.forEach(header => {
            if (!config.includes(header.name)) {
                result.suggestions.push(header.suggestion);
            }
        });

        // 检查 SSL 配置
        if (config.includes('listen 443 ssl')) {
            if (!config.includes('ssl_protocols')) {
                result.warnings.push('SSL 配置中应指定 ssl_protocols (建议 TLSv1.2 TLSv1.3)');
            }
            if (!config.includes('ssl_ciphers')) {
                result.warnings.push('SSL 配置中应指定安全的 ssl_ciphers');
            }
        }
    }

    private checkPerformance(config: string, result: ValidationResult): void {
        // 检查 Gzip
        if (!config.includes('gzip on')) {
            result.suggestions.push('建议启用 Gzip 压缩提升传输效率');
        }

        // 检查缓存配置
        if (!config.includes('expires') && !config.includes('Cache-Control')) {
            result.suggestions.push('建议为静态资源添加浏览器缓存配置');
        }

        // 检查 keepalive
        if (!config.includes('keepalive_timeout')) {
            result.suggestions.push('建议配置 keepalive_timeout 优化连接复用');
        }
    }

    private checkCommonMistakes(config: string, result: ValidationResult): void {
        // 检查 root 指令位置
        const locationBlocks = config.match(/location\s+[^}]+\{[^}]*\}/g) || [];
        locationBlocks.forEach(block => {
            if (block.includes('root ') && block.indexOf('alias') === -1) {
                // root 在 location 块中可能是个问题
            }
        });

        // 检查 try_files 配置
        if (config.includes('try_files') && !config.includes('try_files')?.toString().includes('/index.html')) {
            const spaMatch = config.match(/try_files\s+[^;]+/);
            if (spaMatch && !spaMatch[0].includes('=404')) {
                result.warnings.push('SPA 应用的 try_files 应以 /index.html 结尾');
            }
        }

        // 检查 proxy_pass 末尾斜杠
        const proxyMatches = config.match(/proxy_pass\s+http[^;]+;/g) || [];
        proxyMatches.forEach(match => {
            if (match.includes('/api') && !match.endsWith('/;')) {
                result.warnings.push(`proxy_pass URL 末尾缺少斜杠可能导致路径问题: ${match}`);
            }
        });
    }

    // 自动修复常见问题
    autoFix(config: string): string {
        let fixed = config;

        // 添加 server_tokens off
        if (!fixed.includes('server_tokens')) {
            fixed = fixed.replace(
                /http\s*\{/,
                `http {\n    server_tokens off;`
            );
        }

        // 确保 server 块有安全头
        if (!fixed.includes('X-Frame-Options')) {
            fixed = fixed.replace(
                /(server\s*\{[\s\S]*?)(location\s)/,
                `$1    # 安全头\n    add_header X-Frame-Options "SAMEORIGIN" always;\n    add_header X-Content-Type-Options "nosniff" always;\n    add_header X-XSS-Protection "1; mode=block" always;\n\n    $2`
            );
        }

        return fixed;
    }
}
