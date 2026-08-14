import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createZipFromDir(sourceDir, outPath) {
  if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory ${sourceDir} does not exist. Run 'npm run build' first.`);
    process.exit(1);
  }

  // Create a clean zip file structure using standard zip format
  const files = [];
  function walk(dir, relPath = '') {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const entryRelPath = relPath ? `${relPath}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(fullPath, entryRelPath);
      } else {
        files.push({ fullPath, relPath: entryRelPath });
      }
    }
  }

  walk(sourceDir);

  const localHeaders = [];
  const centralHeaders = [];
  let offset = 0;

  for (const file of files) {
    const content = fs.readFileSync(file.fullPath);
    const uncompressedSize = content.length;
    const compressed = zlib.deflateRawSync(content, { level: 9 });
    const compressedSize = compressed.length;
    const crc = crc32(content);
    const nameBuffer = Buffer.from(file.relPath.replace(/\\/g, '/'), 'utf8');

    // Local file header (30 bytes) + name + data
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0x0800, 6); // flags (UTF-8)
    localHeader.writeUInt16LE(8, 8); // compression method (deflate)
    localHeader.writeUInt16LE(0, 10); // time
    localHeader.writeUInt16LE(0, 12); // date
    localHeader.writeUInt32LE(crc, 14); // crc32
    localHeader.writeUInt32LE(compressedSize, 18);
    localHeader.writeUInt32LE(uncompressedSize, 22);
    localHeader.writeUInt16LE(nameBuffer.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra length

    localHeaders.push(localHeader, nameBuffer, compressed);

    // Central directory header (46 bytes) + name
    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4); // version made by
    centralHeader.writeUInt16LE(20, 6); // version needed
    centralHeader.writeUInt16LE(0x0800, 8); // flags
    centralHeader.writeUInt16LE(8, 10); // compression method
    centralHeader.writeUInt16LE(0, 12); // time
    centralHeader.writeUInt16LE(0, 14); // date
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressedSize, 20);
    centralHeader.writeUInt32LE(uncompressedSize, 24);
    centralHeader.writeUInt16LE(nameBuffer.length, 28);
    centralHeader.writeUInt16LE(0, 30); // extra length
    centralHeader.writeUInt16LE(0, 32); // comment length
    centralHeader.writeUInt16LE(0, 34); // disk number
    centralHeader.writeUInt16LE(0, 36); // internal attr
    centralHeader.writeUInt32LE(0, 38); // external attr
    centralHeader.writeUInt32LE(offset, 42); // relative offset of local header

    centralHeaders.push(centralHeader, nameBuffer);

    offset += 30 + nameBuffer.length + compressedSize;
  }

  const centralDirOffset = offset;
  const centralDirSize = centralHeaders.reduce((sum, b) => sum + b.length, 0);

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(files.length, 8); // entries on disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  const totalZip = Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
  fs.writeFileSync(outPath, totalZip);
  console.log(`Created standalone zip asset bundle at ${outPath} (${(totalZip.length / 1024).toFixed(1)} KB) with ${files.length} files.`);
}

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (~crc) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  table[i] = c >>> 0;
}

// Copy icon and prepare dist zip
const desktopDir = path.resolve('desktop-app');
fs.mkdirSync(desktopDir, { recursive: true });

// Copy clean PNG icon if exists
const candidateIcons = [
  'src/assets/images/app_icon_1786628184831.jpg',
];

for (const iconPath of candidateIcons) {
  if (fs.existsSync(iconPath)) {
    fs.copyFileSync(iconPath, path.join(desktopDir, 'app_icon.png'));
    console.log(`Copied icon to ${path.join(desktopDir, 'app_icon.png')}`);
    break;
  }
}

// Create dist zip
createZipFromDir(path.resolve('dist'), path.join(desktopDir, 'app_dist.zip'));
