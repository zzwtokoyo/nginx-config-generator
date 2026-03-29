// 使用 Node.js 内置模块创建一个简单的 128x128 PNG
const fs = require('fs');

// PNG 文件头 + IHDR 数据
const width = 128;
const height = 128;

// 创建简单的 RGBA 像素数据
const pixels = Buffer.alloc(width * height * 4);

// 填充绿色背景和白色文字
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const idx = (y * width + x) * 4;
    
    // 圆角效果（简单版）
    const inCorner = (x < 20 && y < 20) || (x > 108 && y < 20) || 
                     (x < 20 && y > 108) || (x > 108 && y > 108);
    
    if (inCorner && ((x-10)**2 + (y-10)**2 > 100) && 
                    ((x-118)**2 + (y-10)**2 > 100) &&
                    ((x-10)**2 + (y-118)**2 > 100) &&
                    ((x-118)**2 + (y-118)**2 > 100)) {
      pixels[idx] = 0;
      pixels[idx + 1] = 0;
      pixels[idx + 2] = 0;
      pixels[idx + 3] = 0; // 透明
    } else {
      // Nginx 绿色 #009639
      pixels[idx] = 0;
      pixels[idx + 1] = 150;
      pixels[idx + 2] = 57;
      pixels[idx + 3] = 255;
    }
  }
}

// 在中心绘制 "N" 字样（简化版像素绘制）
const drawPixel = (px, py, r, g, b) => {
  if (px >= 0 && px < width && py >= 0 && py < height) {
    const idx = (py * width + px) * 4;
    pixels[idx] = r;
    pixels[idx + 1] = g;
    pixels[idx + 2] = b;
    pixels[idx + 3] = 255;
  }
};

// 绘制 "N" 字母（粗体）
const centerX = 64;
const centerY = 60;
const drawN = () => {
  // 左边竖线
  for (let y = 20; y < 100; y++) {
    for (let x = 0; x < 16; x++) {
      drawPixel(centerX - 35 + x, centerY - 30 + y, 255, 255, 255);
    }
  }
  // 右边竖线
  for (let y = 20; y < 100; y++) {
    for (let x = 0; x < 16; x++) {
      drawPixel(centerX + 20 + x, centerY - 30 + y, 255, 255, 255);
    }
  }
  // 中间斜线
  for (let y = 20; y < 100; y++) {
    const x = Math.floor((y - 20) * 0.55) - 10;
    for (let dx = 0; dx < 16; dx++) {
      drawPixel(centerX - 35 + x + dx, centerY - 30 + y, 255, 255, 255);
    }
  }
};

drawN();

// 底部 "GEN" 小字
for (let y = 100; y < 115; y++) {
  for (let x = 35; x < 93; x++) {
    if ((y > 103 && y < 108) || x === 35 || x === 92) {
      drawPixel(x, y, 200, 255, 200);
    }
  }
}

// PNG 编码函数
function crc32(buffer) {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  
  let crc = -1;
  for (let i = 0; i < buffer.length; i++) {
    crc = table[(crc ^ buffer[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type);
  const chunk = Buffer.concat([len, typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([chunk, crc]);
}

// PNG 签名
const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

// IHDR
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(width, 0);
ihdr.writeUInt32BE(height, 4);
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type: RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// IDAT (压缩图像数据)
const zlib = require('zlib');
const rowSize = width * 4 + 1; // +1 for filter byte
const rawData = Buffer.alloc(height * rowSize);

for (let y = 0; y < height; y++) {
  rawData[y * rowSize] = 0; // filter type: none
  for (let x = 0; x < width; x++) {
    const srcIdx = (y * width + x) * 4;
    const dstIdx = y * rowSize + 1 + x * 4;
    rawData[dstIdx] = pixels[srcIdx];
    rawData[dstIdx + 1] = pixels[srcIdx + 1];
    rawData[dstIdx + 2] = pixels[srcIdx + 2];
    rawData[dstIdx + 3] = pixels[srcIdx + 3];
  }
}

const compressed = zlib.deflateSync(rawData);

// IEND
const iend = Buffer.alloc(0);

// 组装 PNG
const png = Buffer.concat([
  signature,
  createChunk('IHDR', ihdr),
  createChunk('IDAT', compressed),
  createChunk('IEND', iend)
]);

fs.writeFileSync('icon.png', png);
console.log('✅ 图标已创建: icon.png (128x128)');
