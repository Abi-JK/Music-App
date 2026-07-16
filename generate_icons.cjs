const fs = require('fs');
const sharp = require('sharp');
const path = require('path');

const sourceImage = path.join(__dirname, 'public', 'favicon.svg');
const iconsPath = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(iconsPath)) {
  fs.mkdirSync(iconsPath, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

async function generate() {
  const imageBuffer = fs.readFileSync(sourceImage);

  for (const size of sizes) {
    await sharp(imageBuffer)
      .resize(size, size)
      .toFile(path.join(iconsPath, `icon-${size}.png`));
    console.log(`Generated icon-${size}.png`);
  }

  for (const size of [192, 512]) {
    await sharp(imageBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 7, g: 11, b: 20, alpha: 1 }
      })
      .toFile(path.join(iconsPath, `icon-maskable-${size}.png`));
    console.log(`Generated icon-maskable-${size}.png`);
  }

  await sharp(imageBuffer)
    .resize(64, 64)
    .toFile(path.join(__dirname, 'public', 'favicon.png'));
  console.log('Generated favicon.png');
}

generate().catch(console.error);
