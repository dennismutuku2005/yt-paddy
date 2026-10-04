const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = createCRC32Table();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function writePNG(width, height, renderPixel) {
  const rowBytes = 1 + width * 4;
  const rawData = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawData[rowOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = renderPixel(x, y, width, height);
      const pxOffset = rowOffset + 1 + x * 4;
      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

  const ihdrBuf = Buffer.alloc(13);
  ihdrBuf.writeUInt32BE(width, 0);
  ihdrBuf.writeUInt32BE(height, 4);
  ihdrBuf.writeUInt8(8, 8);
  ihdrBuf.writeUInt8(6, 9);
  ihdrBuf.writeUInt8(0, 10);
  ihdrBuf.writeUInt8(0, 11);
  ihdrBuf.writeUInt8(0, 12);

  return Buffer.concat([
    signature,
    createChunk('IHDR', ihdrBuf),
    createChunk('IDAT', compressedData),
    createChunk('IEND', Buffer.alloc(0))
  ]);
}

function createChunk(typeStr, data) {
  const len = data.length;
  const buf = Buffer.alloc(8 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(typeStr, 4, 4, 'ascii');
  data.copy(buf, 8);
  const crcData = buf.subarray(4, 8 + len);
  const crcVal = crc32(crcData);
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

function renderCleanIcon(x, y, w, h) {
  const nx = x / w;
  const ny = y / h;
  const cx = (nx - 0.5) * 2;
  const cy = (ny - 0.5) * 2;

  // Squircle flat base
  const dist = Math.pow(Math.abs(cx), 3.5) + Math.pow(Math.abs(cy), 3.5);
  if (dist > 0.85) {
    return [0, 0, 0, 0];
  }

  // Pure Emerald Green #10B981
  let r = 16;
  let g = 185;
  let b = 129;
  let a = 255;

  // Crisp White Double Arrows (No Flash)
  const inTri1 = (cx >= -0.38 && cx <= 0.05 && Math.abs(cy) <= (0.05 - cx) * 0.95);
  const inTri2 = (cx >= -0.02 && cx <= 0.45 && Math.abs(cy) <= (0.45 - cx) * 0.95);

  if (inTri1 || inTri2) {
    r = 255;
    g = 255;
    b = 255;
  }

  return [r, g, b, a];
}

const sizes = [16, 48, 128];
sizes.forEach(size => {
  const buf = writePNG(size, size, renderCleanIcon);
  const dest = path.join(__dirname, `icon${size}.png`);
  fs.writeFileSync(dest, buf);
  console.log(`Generated clean icon: ${dest} (${buf.length} bytes)`);
});
