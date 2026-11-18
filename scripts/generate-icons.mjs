// Builds every app icon from the original logo, assets/brand/azim-trainer-logo.jpg.
// Re-run only if the logo changes:
//   npm install --no-save sharp   (or install sharp anywhere and set NODE_PATH)
//   node scripts/generate-icons.mjs
//
// The logo is only trimmed to an exact square and resized, never stretched or redrawn.
// Two derived variants exist because platforms require them:
//   - maskable icons: Android crops icons to circles/squircles, so the whole logo is
//     shrunk into the safe zone on the logo's own blue, keeping the "Azim Trainer" text visible.
//   - badge: Android shows the small status-bar icon as a single-colour silhouette, so the
//     logo's dark navy shapes are turned into a white-on-transparent mask.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'assets/brand/azim-trainer-logo.jpg');
const outDir = path.join(root, 'public/icons');
const EDGE_BLUE = { r: 37, g: 84, b: 226, alpha: 1 }; // sampled from the logo's outer edge
mkdirSync(outDir, { recursive: true });

const meta = await sharp(source).metadata();
const side = Math.min(meta.width, meta.height);
const square = await sharp(source)
  .extract({
    left: Math.floor((meta.width - side) / 2),
    top: Math.floor((meta.height - side) / 2),
    width: side,
    height: side
  })
  .toBuffer();

const png = (size) =>
  sharp(square).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();

const write = (name, buf) => {
  writeFileSync(path.join(outDir, name), buf);
  console.log('wrote', `public/icons/${name}`, `${(buf.length / 1024).toFixed(1)} kB`);
};

// Standard icons (favicon, PWA "any", in-app logo)
for (const size of [16, 32, 48, 192, 512]) write(`icon-${size}.png`, await png(size));
write('logo-256.png', await png(256));

// iOS home screen: opaque 180x180 (iOS rounds the corners itself)
write('apple-touch-icon.png', await png(180));

// Android maskable: logo at 78% inside the 80% safe-zone circle, on the logo's blue
for (const size of [192, 512]) {
  const inner = Math.round(size * 0.78);
  const logo = await sharp(square).resize(inner, inner, { kernel: 'lanczos3' }).png().toBuffer();
  const buf = await sharp({ create: { width: size, height: size, channels: 4, background: EDGE_BLUE } })
    .composite([{ input: logo, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  write(`maskable-${size}.png`, buf);
}

// Notification badge: the athlete figure (top part of the logo) as a white silhouette
{
  // Figure area only (above the "Azim" lettering), mask built at full resolution.
  const region = {
    left: Math.round(side * 0.08),
    top: Math.round(side * 0.06),
    width: Math.round(side * 0.84),
    height: Math.round(side * 0.54)
  };
  const { data, info } = await sharp(square).extract(region).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
  for (let p = 0; p < info.width * info.height; p++) {
    const r = data[p * 3], g = data[p * 3 + 1], b = data[p * 3 + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    const alpha = lum < 70 ? 255 : lum < 110 ? Math.round(((110 - lum) / 40) * 255) : 0;
    rgba[p * 4] = rgba[p * 4 + 1] = rgba[p * 4 + 2] = 255;
    rgba[p * 4 + 3] = alpha;
    if (alpha > 128) {
      const x = p % info.width, y = Math.floor(p / info.width);
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const trimmed = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .png()
    .toBuffer();
  const badge = await sharp(trimmed)
    .resize(88, 88, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  write('badge-96.png', badge);
}

// favicon.ico (16, 32, 48) as PNG-in-ICO, supported by every current browser
{
  const images = await Promise.all([16, 32, 48].map(png));
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((img, i) => {
    const size = [16, 32, 48][i];
    const e = 6 + 16 * i;
    header.writeUInt8(size, e);
    header.writeUInt8(size, e + 1);
    header.writeUInt8(0, e + 2);
    header.writeUInt8(0, e + 3);
    header.writeUInt16LE(1, e + 4);
    header.writeUInt16LE(32, e + 6);
    header.writeUInt32LE(img.length, e + 8);
    header.writeUInt32LE(offset, e + 12);
    offset += img.length;
  });
  const ico = Buffer.concat([header, ...images]);
  writeFileSync(path.join(root, 'public/favicon.ico'), ico);
  console.log('wrote public/favicon.ico', `${(ico.length / 1024).toFixed(1)} kB`);
}
