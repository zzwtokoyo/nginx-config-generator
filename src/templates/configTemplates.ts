export interface ConfigTemplate {
    name: string;
    description: string;
    generate: (options: TemplateOptions) => string;
}

export interface TemplateOptions {
    projectName: string;
    buildDir: string;
    port: number;
    serverName: string;
    enableHttps?: boolean;
    enableGzip?: boolean;
    enableCache?: boolean;
    enableCors?: boolean;
    enableRateLimit?: boolean;
    enableSecurityHeaders?: boolean;
    proxyTarget?: string;
    proxyPrefix?: string;
    upstreamServers?: string[];
    sslCertificate?: string;
    sslCertificateKey?: string;
}

// 基础 SPA 配置模板
export const spaTemplate: ConfigTemplate = {
    name: 'spa',
    description: '单页应用 (SPA) 基础配置',
    generate: (opts) => `server {
    listen ${opts.port};
    server_name ${opts.serverName};

    root /var/www/${opts.projectName}/${opts.buildDir};
    index index.html;

    ${opts.enableGzip !== false ? generateGzipConfig() : ''}

    ${opts.enableSecurityHeaders !== false ? generateSecurityHeaders() : ''}

    # SPA 路由支持 - 所有路由指向 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    ${opts.enableCache !== false ? generateCacheConfig() : ''}

    # 错误页面
    error_page 404 /index.html;
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
`
};

// SSR 配置模板（Next.js, Nuxt）
export const ssrTemplate: ConfigTemplate = {
    name: 'ssr',
    description: '服务端渲染 (SSR) 配置',
    generate: (opts) => `server {
    listen ${opts.port};
    server_name ${opts.serverName};

    ${opts.enableSecurityHeaders !== false ? generateSecurityHeaders() : ''}

    # 反向代理到 Node.js 服务
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 86400;
    }

    ${opts.enableGzip !== false ? generateGzipConfig() : ''}
}
`
};

// API 反向代理模板
export const apiProxyTemplate: ConfigTemplate = {
    name: 'api-proxy',
    description: '前端 + API 反向代理',
    generate: (opts) => {
        const proxyPath = opts.proxyPrefix || '/api';
        const target = opts.proxyTarget || 'http://localhost:3000';
        
        return `server {
    listen ${opts.port};
    server_name ${opts.serverName};

    root /var/www/${opts.projectName}/${opts.buildDir};
    index index.html;

    ${opts.enableSecurityHeaders !== false ? generateSecurityHeaders() : ''}

    ${opts.enableCors ? generateCorsConfig() : ''}

    # 前端静态资源
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location ${proxyPath}/ {
        proxy_pass ${target}${proxyPath}/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket 支持（如果需要）
    location ${proxyPath}/ws {
        proxy_pass ${target};
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    ${opts.enableGzip !== false ? generateGzipConfig() : ''}
}
`;
    }
};

// 负载均衡模板
export const loadBalanceTemplate: ConfigTemplate = {
    name: 'load-balance',
    description: '多后端负载均衡',
    generate: (opts) => {
        const servers = opts.upstreamServers || ['localhost:3000', 'localhost:3001'];
        const upstreamName = `${opts.projectName}_backend`;
        
        return `# 负载均衡上游配置
upstream ${upstreamName} {
    ${servers.map(s => `server ${s};`).join('\n    ')}
    
    # 负载均衡策略（可选）
    # least_conn;  # 最少连接
    # ip_hash;     # IP 哈希（会话保持）
    # fair;        # 公平调度（需要第三方模块）
}

server {
    listen ${opts.port};
    server_name ${opts.serverName};

    root /var/www/${opts.projectName}/${opts.buildDir};
    index index.html;

    ${opts.enableSecurityHeaders !== false ? generateSecurityHeaders() : ''}

    # 前端应用
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 负载均衡代理
    location /api/ {
        proxy_pass http://${upstreamName}/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 健康检查（需要 nginx_upstream_check_module）
        # check interval=3000 rise=2 fall=5 timeout=1000 type=http;
        # check_http_send "GET /health HTTP/1.0\\r\\n\\r\\n";
        # check_http_expect_alive http_2xx http_3xx;
    }

    ${opts.enableGzip !== false ? generateGzipConfig() : ''}
}
`;
    }
};

// HTTPS 配置模板
export const httpsTemplate: ConfigTemplate = {
    name: 'https',
    description: 'SSL/HTTPS 安全配置',
    generate: (opts) => {
        const certPath = opts.sslCertificate || `/etc/nginx/ssl/${opts.serverName}.crt`;
        const keyPath = opts.sslCertificateKey || `/etc/nginx/ssl/${opts.serverName}.key`;
        
        return `# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name ${opts.serverName};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${opts.serverName};

    root /var/www/${opts.projectName}/${opts.buildDir};
    index index.html;

    # SSL 证书配置
    ssl_certificate ${certPath};
    ssl_certificate_key ${keyPath};

    # SSL 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;

    # HSTS (可选，启用后需谨慎)
    # add_header Strict-Transport-Security "max-age=63072000" always;

    ${opts.enableSecurityHeaders !== false ? generateSecurityHeaders() : ''}

    # SPA 路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    ${opts.enableGzip !== false ? generateGzipConfig() : ''}
    ${opts.enableCache !== false ? generateCacheConfig() : ''}
}
`;
    }
};

// Docker 部署模板
export const dockerTemplate: ConfigTemplate = {
    name: 'docker',
    description: 'Docker 容器部署配置',
    generate: (opts) => `server {
    listen ${opts.port};
    server_name ${opts.serverName};

    root /usr/share/nginx/html;
    index index.html;

    ${opts.enableSecurityHeaders !== false ? generateSecurityHeaders() : ''}

    # Docker 健康检查
    location /nginx-health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    ${opts.enableGzip !== false ? generateGzipConfig() : ''}
    ${opts.enableCache !== false ? generateCacheConfig() : ''}
}
`
};

// 辅助函数：生成 Gzip 配置
function generateGzipConfig(): string {
    return `# Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types
        text/plain
        text/css
        text/xml
        text/javascript
        application/javascript
        application/xml+rss
        application/json
        font/truetype
        font/opentype
        application/vnd.ms-fontobject
        image/svg+xml;`;
}

// 辅助函数：生成安全头
function generateSecurityHeaders(): string {
    return `# 安全响应头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    # CSP (根据实际情况调整)
    # add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline';" always;`;
}

// 辅助函数：生成缓存配置
function generateCacheConfig(): string {
    return `# 静态资源缓存
    location ~* \\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # HTML 不缓存
    location ~* \\.html$ {
        expires -1;
        add_header Cache-Control "no-store, no-cache, must-revalidate";
    }`;
}

// 辅助函数：生成 CORS 配置
function generateCorsConfig(): string {
    return `# 跨域配置
    add_header 'Access-Control-Allow-Origin' '*' always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range,Authorization' always;
    add_header 'Access-Control-Expose-Headers' 'Content-Length,Content-Range' always;

    if ($request_method = 'OPTIONS') {
        return 204;
    }`;
}

// 导出所有模板
export const allTemplates: ConfigTemplate[] = [
    spaTemplate,
    ssrTemplate,
    apiProxyTemplate,
    loadBalanceTemplate,
    httpsTemplate,
    dockerTemplate
];
