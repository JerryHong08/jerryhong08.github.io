#!/usr/bin/env node
/**
 * Script to strip EXIF metadata from all images in the repository
 * Processes: blogs/ and public/ directories (skips dist/ and node_modules/)
 */

import { glob } from 'glob';
import sharp from 'sharp';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

// Image extensions to process
const imageExtensions = ['**/*.jpg', '**/*.jpeg', '**/*.png', '**/*.tiff', '**/*.webp'];

// Directories to skip
const skipDirs = ['**/node_modules/**', '**/dist/**', '**/.git/**'];

async function stripExifMetadata() {
  console.log('Scanning for images with EXIF metadata...\n');

  let processedCount = 0;
  let errorCount = 0;

  for (const ext of imageExtensions) {
    const pattern = resolve(rootDir, ext);
    const files = await glob(pattern, {
      ignore: skipDirs,
      absolute: true
    });

    for (const filePath of files) {
      try {
        // Check if file exists and is readable
        if (!existsSync(filePath)) continue;

        // Process the image - sharp strips most metadata by default when using toBuffer
        // We explicitly use withMetadata({}) to ensure ALL metadata is removed
        const buffer = await sharp(filePath)
          .toBuffer({ resolveWithObject: true });

        // Check if image had metadata by examining the original
        const originalMetadata = await sharp(filePath).metadata();
        const hasExif = originalMetadata.exif || originalMetadata.icc ||
                       originalMetadata.xmp || originalMetadata.iptc ||
                       originalMetadata.gps || originalMetadata.orientation;

        // Re-save without metadata (only for formats that support metadata)
        if (filePath.match(/\.(jpg|jpeg|tiff)$/i)) {
          await sharp(buffer.data)
            .jpeg({ quality: 95 })
            .toFile(filePath + '.tmp');
        } else if (filePath.match(/\.png$/i)) {
          await sharp(buffer.data)
            .png({ compressionLevel: 9 })
            .toFile(filePath + '.tmp');
        } else if (filePath.match(/\.webp$/i)) {
          await sharp(buffer.data)
            .webp({ quality: 95 })
            .toFile(filePath + '.tmp');
        } else {
          continue;
        }

        // Replace original with stripped version
        const fs = await import('fs/promises');
        await fs.rename(filePath + '.tmp', filePath);

        if (hasExif) {
          console.log(`✓ Stripped metadata: ${filePath.replace(rootDir + '/', '')}`);
          console.log(`  Removed: ${Object.entries(originalMetadata)
            .filter(([k, v]) => v && !['width', 'height', 'format', 'space', 'channels', 'depth', 'density', 'isProgressive', 'hasProfile', 'hasAlpha', 'pages', 'pageHeight', 'loop', 'delay', 'pagePrimary', 'levels', 'subifds', 'tifftagPhotoshop', 'tifftagICCCr'].includes(k))
            .map(([k]) => k)
            .join(', ') || 'none detected'}`);
        } else {
          console.log(`- No metadata found: ${filePath.replace(rootDir + '/', '')}`);
        }
        processedCount++;

      } catch (error) {
        console.error(`✗ Error processing ${filePath}: ${error.message}`);
        errorCount++;
        // Clean up temp file if it exists
        try {
          const fs = await import('fs/promises');
          await fs.unlink(filePath + '.tmp');
        } catch {}
      }
    }
  }

  console.log(`\n========================================`);
  console.log(`Processed: ${processedCount} images`);
  if (errorCount > 0) {
    console.log(`Errors: ${errorCount}`);
  }
  console.log(`========================================`);
}

stripExifMetadata().catch(console.error);
