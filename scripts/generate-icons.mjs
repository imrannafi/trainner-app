// Builds every app icon from the original logo, assets/brand/oliul-azim-logo.jpg.
// Re-run only if the logo changes:
//   npm install --no-save sharp   (or install sharp anywhere and set NODE_PATH)
//   node scripts/generate-icons.mjs
//
// The logo is only trimmed to an exact square and resized, never redrawn or recoloured.
// Derived variants exist where platforms need them:
//   - favicon (16-48 px): the full logo's lettering turns to noise this small, so the logo's
//     own gold "A" emblem is lifted out (gold pixels only) and placed on the logo's black.
//   - maskable icons: Android crops icons to circles/squircles, so the whole logo is shrunk
//     into the safe zone on the logo's black background.
//   - badge: Android shows the status-bar icon as a single-colour silhouette, so the gold
//     "A" emblem becomes a white-on-transparent mask.
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'assets/brand/oliul-azim-logo.jpg');
const outDir = path.join(root, 'public/icons');
const BLACK = { r: 10, g: 10, b: 10, alpha: 1 }; // the logo's background
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

const write = (name, buf) => {
  writeFileSync(path.join(outDir, name), buf);
  console.log('wrote', `public/icons/${name}`, `${(buf.length / 1024).toFixed(1)} kB`);
};
const png = (input, size) =>
  sharp(input).resize(size, size, { kernel: 'lanczos3' }).png({ compressionLevel: 9 }).toBuffer();

// The gold "A" emblem (centre of the logo, between the barbells), gold pixels only.
const emblem = async () => {
  const region = {
    left: Math.round(side * 0.36),
    top: Math.round(side * 0.35),
    width: Math.round(side * 0.295),
    height: Math.round(side * 0.232)
  };
  const { data, info } = await sharp(square).extract(region).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let p = 0; p < info.width * info.height; p++) {
    const r = data[p * 3], g = data[p * 3 + 1], b = data[p * 3 + 2];
    const warm = r - b; // gold is strongly warm; the grey figures and white lettering are not
    const a = warm > 120 && r > 150 ? 255 : warm > 80 && r > 110 ? Math.round(((warm - 80) / 40) * 255) : 0;
    rgba.set([r, g, b, a], p * 4);
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).trim({ threshold: 10 }).png().toBuffer();
};
const mark = await emblem();
const onBlack = async (input, size, fill) => {
  const inner = Math.round(size * fill);
  const sized = await sharp(input)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: BLACK } })
    .composite([{ input: sized, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toBuffer();
};

// Small icons: the gold emblem. Large icons and in-app logo: the full logo.
for (const size of [16, 32, 48]) write(`icon-${size}.png`, await onBlack(mark, size, 0.86));
for (const size of [192, 512]) write(`icon-${size}.png`, await png(square, size));
write('logo-256.png', await png(square, 256));

// iOS home screen: opaque 180x180 (iOS rounds the corners itself)
write('apple-touch-icon.png', await png(square, 180));

// Android maskable: whole logo inside the 80% safe-zone circle, on black
for (const size of [192, 512]) write(`maskable-${size}.png`, await onBlack(square, size, 0.8));

// Notification badge: the emblem as a white silhouette
{
  const { data, info } = await sharp(mark).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (let p = 0; p < info.width * info.height; p++) data[p * 4] = data[p * 4 + 1] = data[p * 4 + 2] = 255;
  const white = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
  const badge = await sharp(white)
    .resize(88, 88, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 }, kernel: 'lanczos3' })
    .extend({ top: 4, bottom: 4, left: 4, right: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  write('badge-96.png', badge);
}

// favicon.ico (16, 32, 48) as PNG-in-ICO, supported by every current browser
{
  const sizes = [16, 32, 48];
  const images = await Promise.all(sizes.map((s) => onBlack(mark, s, 0.86)));
  const header = Buffer.alloc(6 + 16 * images.length);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  let offset = header.length;
  images.forEach((img, i) => {
    const e = 6 + 16 * i;
    header.writeUInt8(sizes[i], e);
    header.writeUInt8(sizes[i], e + 1);
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
