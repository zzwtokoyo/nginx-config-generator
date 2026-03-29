const fs = require('fs');

// 创建一个简单的 SVG 图标
const svgIcon = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <!-- 背景 -->
  <rect width="128" height="128" rx="20" fill="#009639"/>
  
  <!-- N 字母 -->
  <text x="64" y="88" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="white" text-anchor="middle">N</text>
  
  <!-- 小字 -->
  <text x="64" y="108" font-family="Arial, sans-serif" font-size="14" fill="white" text-anchor="middle">GEN</text>
  
  <!-- 装饰线条 -->
  <rect x="20" y="25" width="88" height="4" rx="2" fill="#00C853" opacity="0.6"/>
  <rect x="20" y="115" width="60" height="3" rx="1.5" fill="#00C853" opacity="0.6"/>
</svg>`;

fs.writeFileSync('icon.svg', svgIcon);
console.log('✅ 图标已创建: icon.svg');

// 同时创建一个简单的 PNG 数据 URI（用于 README 展示）
console.log('请使用 icon.svg 或将其转换为 PNG 格式');
