/**
 * 体验图片 E2E 样本：结构完整的最小 JPEG / PNG。
 * 后端只信任魔数并剥离元数据，因此样本必须能被真实解析；不带 EXIF 的样本
 * 用于 A5 / E2E 主路径，带 GPS / 设备 EXIF 的样本在 T10 的反向用例中补充。
 */
export type PhotoFixture = {
  name: string;
  mimeType: string;
  buffer: Buffer;
};

// 1×1 JPEG（SOI + APP0 + DQT + SOF0 + DHT + SOS + EOI）
const JPEG_BASE64 =
  '/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';

// 1×1 PNG（IHDR + IDAT + IEND）
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const experiencePhotoJpeg: PhotoFixture = {
  name: '体验照片-1.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.from(JPEG_BASE64, 'base64'),
};

export const experiencePhotoPng: PhotoFixture = {
  name: '体验照片-2.png',
  mimeType: 'image/png',
  buffer: Buffer.from(PNG_BASE64, 'base64'),
};

export const experiencePhotoJpegThird: PhotoFixture = {
  name: '体验照片-3.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.from(JPEG_BASE64, 'base64'),
};

function jpegWithApp1(): Buffer {
  const base = Buffer.from(JPEG_BASE64, 'base64');
  const payload = Buffer.concat([
    Buffer.from('Exif\0\0', 'latin1'),
    // 最小 TIFF header + GPS IFD 指针（tag 0x8825），供剥离 / 字节搜索断言
    Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x88, 0x08, 0x00, 0x00, 0x00]),
    Buffer.from('RouteMeE2E', 'latin1'),
  ]);
  const length = payload.length + 2;
  const header = Buffer.from([0xff, 0xe1, (length >> 8) & 0xff, length & 0xff]);
  return Buffer.concat([base.subarray(0, 2), header, payload, base.subarray(2)]);
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }
    table[index] = value >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBytes = Buffer.from(type, 'latin1');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function pngWithMetadata(): Buffer {
  const base = Buffer.from(PNG_BASE64, 'base64');
  const ihdrEnd = 8 + 4 + 4 + 13 + 4;
  const metadata = Buffer.concat([
    pngChunk('eXIf', Buffer.from('Exif\0\0', 'latin1')),
    pngChunk('tEXt', Buffer.from('RouteMeE2E\0GPS 22.27,113.58', 'latin1')),
  ]);
  return Buffer.concat([base.subarray(0, ihdrEnd), metadata, base.subarray(ihdrEnd)]);
}

function webpChunk(fourCC: string, payload: Buffer): Buffer {
  const size = Buffer.alloc(4);
  const padded = payload.length % 2 === 0 ? payload : Buffer.concat([payload, Buffer.from([0])]);
  size.writeUInt32LE(payload.length, 0);
  return Buffer.concat([Buffer.from(fourCC, 'latin1'), size, padded]);
}

function webpWithExif(): Buffer {
  const vp8x = Buffer.alloc(10);
  vp8x[0] = 0x0c; // EXIF | XMP flags，供「清 flag」断言
  vp8x.writeUIntLE(0, 4, 3);
  vp8x.writeUIntLE(0, 7, 3);
  const exif = Buffer.concat([
    Buffer.from('Exif\0\0', 'latin1'),
    Buffer.from([0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]),
  ]);
  const chunks = Buffer.concat([
    webpChunk('VP8X', vp8x),
    webpChunk('EXIF', exif),
    webpChunk('VP8L', Buffer.from([0x2f, 0x00, 0x00, 0x00, 0x00])),
  ]);
  const riffSize = Buffer.alloc(4);
  riffSize.writeUInt32LE(chunks.length + 4, 0);
  return Buffer.concat([
    Buffer.from('RIFF', 'latin1'),
    riffSize,
    Buffer.from('WEBP', 'latin1'),
    chunks,
  ]);
}

/** 带 GPS / 设备标记的 JPEG；后端 A5 断言剥离后不再包含 `Exif\0\0`。 */
export const experiencePhotoJpegWithExif: PhotoFixture = {
  name: '带 EXIF-1.jpg',
  mimeType: 'image/jpeg',
  buffer: jpegWithApp1(),
};

/** 带 `eXIf` / `tEXt` chunk 的 PNG；后端剥离后两类 chunk 消失。 */
export const experiencePhotoPngWithMetadata: PhotoFixture = {
  name: '带元数据-2.png',
  mimeType: 'image/png',
  buffer: pngWithMetadata(),
};

/** 带 VP8X EXIF flag 与 `EXIF` chunk 的 WebP；后端剥离并清 flag。 */
export const experiencePhotoWebpWithExif: PhotoFixture = {
  name: '带 EXIF-3.webp',
  mimeType: 'image/webp',
  buffer: webpWithExif(),
};

/** 5 MB + 1 字节；按需生成，不落库。 */
export function oversizedJpeg(): PhotoFixture {
  return {
    name: '超大-4.jpg',
    mimeType: 'image/jpeg',
    buffer: Buffer.alloc(5 * 1024 * 1024 + 1, 0xff),
  };
}

/** 扩展名与 MIME 伪装成 JPEG，字节实际不是图片；后端按魔数拒绝。 */
export const experiencePhotoDisguised: PhotoFixture = {
  name: '伪装-5.jpg',
  mimeType: 'image/jpeg',
  buffer: Buffer.from('not-a-real-image', 'latin1'),
};
