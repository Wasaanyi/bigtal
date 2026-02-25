import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { readFile, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ICONS_DIR = join(__dirname, '../assets/icons');
const SVG_PATH = join(ICONS_DIR, 'icon.svg');
const SIZES = [16, 32, 48, 64, 128, 256, 512];

async function generateIcons() {
  console.log('Reading SVG file...');
  const svgBuffer = await readFile(SVG_PATH);

  // Generate PNG files at each size
  const pngPaths = [];
  for (const size of SIZES) {
    const outputPath = join(ICONS_DIR, `icon-${size}.png`);
    console.log(`Generating ${size}x${size} PNG...`);

    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);

    pngPaths.push(outputPath);
  }

  // Generate ICO file from PNG files (use 16, 32, 48, 256 for ICO)
  console.log('Generating ICO file...');
  const icoSizes = [16, 32, 48, 256];
  const icoPngPaths = icoSizes.map(size => join(ICONS_DIR, `icon-${size}.png`));

  const icoBuffer = await pngToIco(icoPngPaths);
  const icoPath = join(ICONS_DIR, 'icon.ico');
  await writeFile(icoPath, icoBuffer);

  console.log('\nGenerated icons:');
  for (const size of SIZES) {
    console.log(`  - icon-${size}.png`);
  }
  console.log('  - icon.ico');
  console.log('\nDone!');
}

generateIcons().catch(err => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
