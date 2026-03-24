#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const blogsDir = join(rootDir, 'blogs');
const publicBlogsDir = join(rootDir, 'public', 'blogs');

// Copy assets from blogs/*/assets/ to public/blogs/*/assets/
function copyAssets() {
  if (!existsSync(blogsDir)) {
    console.log('No blogs directory found');
    return;
  }

  // Ensure public/blogs exists
  if (!existsSync(publicBlogsDir)) {
    mkdirSync(publicBlogsDir, { recursive: true });
  }

  // Iterate through blog directories
  const blogDirs = readdirSync(blogsDir).filter(name => {
    const stat = statSync(join(blogsDir, name));
    return stat.isDirectory();
  });

  for (const blogDir of blogDirs) {
    const assetsDir = join(blogsDir, blogDir, 'assets');
    const targetDir = join(publicBlogsDir, blogDir, 'assets');

    if (existsSync(assetsDir)) {
      console.log(`Copying assets from blogs/${blogDir}/assets to public/blogs/${blogDir}/assets`);
      mkdirSync(targetDir, { recursive: true });
      cpSync(assetsDir, targetDir, { recursive: true, force: true });
    }
  }

  console.log('Assets copied successfully');
}

copyAssets();
