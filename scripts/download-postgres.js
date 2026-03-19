#!/usr/bin/env node

/**
 * Downloads and extracts PostgreSQL 16 binaries for the target platform.
 * Usage: node scripts/download-postgres.js [win|mac|linux]
 *
 * Downloads from EnterpriseDB (Windows) or official PostgreSQL (macOS/Linux).
 * Extracts only the essential binaries needed for embedded use.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PG_VERSION = '17.5';

const ESSENTIAL_BINS = [
  'postgres', 'pg_ctl', 'initdb', 'createdb', 'dropdb',
  'pg_dump', 'pg_restore', 'psql',
];

const URLS = {
  win: `https://get.enterprisedb.com/postgresql/postgresql-${PG_VERSION}-1-windows-x64-binaries.zip`,
  // For macOS and Linux, users should use system PostgreSQL or Homebrew/apt
  // These URLs are placeholders — real builds may need to be sourced differently
};

const targetPlatform = process.argv[2] || {
  win32: 'win',
  darwin: 'mac',
  linux: 'linux',
}[process.platform];

if (!targetPlatform) {
  console.error('Usage: node scripts/download-postgres.js [win|mac|linux]');
  process.exit(1);
}

const outDir = path.join(__dirname, '..', 'postgres-binaries', targetPlatform);

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const get = url.startsWith('https') ? https.get : http.get;
    get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      const total = parseInt(response.headers['content-length'] || '0', 10);
      let downloaded = 0;
      response.on('data', (chunk) => {
        downloaded += chunk.length;
        if (total > 0) {
          const pct = Math.round((downloaded / total) * 100);
          process.stdout.write(`\rDownloading... ${pct}%`);
        }
      });
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log('\nDownload complete');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function extractWindows(zipPath) {
  const extractDir = path.join(path.dirname(zipPath), 'pg-extract');

  // Use PowerShell to extract
  console.log('Extracting...');
  execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`, {
    stdio: 'inherit',
  });

  // Find the pgsql directory
  const pgsqlDir = path.join(extractDir, 'pgsql');

  // Copy essential binaries
  fs.mkdirSync(path.join(outDir, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'share'), { recursive: true });

  for (const bin of ESSENTIAL_BINS) {
    const src = path.join(pgsqlDir, 'bin', `${bin}.exe`);
    const dest = path.join(outDir, 'bin', `${bin}.exe`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      console.log(`  Copied ${bin}.exe`);
    }
  }

  // Copy required DLLs from bin/
  const binDir = path.join(pgsqlDir, 'bin');
  if (fs.existsSync(binDir)) {
    for (const file of fs.readdirSync(binDir)) {
      if (file.endsWith('.dll')) {
        fs.copyFileSync(path.join(binDir, file), path.join(outDir, 'bin', file));
      }
    }
    console.log('  Copied DLLs');
  }

  // Copy lib directory (needed for shared libraries)
  const libDir = path.join(pgsqlDir, 'lib');
  if (fs.existsSync(libDir)) {
    copyDirSync(libDir, path.join(outDir, 'lib'));
    console.log('  Copied lib/');
  }

  // Copy share directory (needed for initdb timezone/locale data)
  const shareDir = path.join(pgsqlDir, 'share');
  if (fs.existsSync(shareDir)) {
    copyDirSync(shareDir, path.join(outDir, 'share'));
    console.log('  Copied share/');
  }

  // Cleanup
  fs.rmSync(extractDir, { recursive: true, force: true });
  fs.unlinkSync(zipPath);
  console.log('  Cleaned up temp files');
}

function copyDirSync(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  console.log(`Preparing PostgreSQL ${PG_VERSION} binaries for ${targetPlatform}...`);

  if (fs.existsSync(outDir)) {
    console.log(`Output directory already exists: ${outDir}`);
    console.log('Delete it manually to re-download.');
    return;
  }

  fs.mkdirSync(outDir, { recursive: true });

  if (targetPlatform === 'win') {
    const zipPath = path.join(outDir, '..', 'pg-win.zip');
    await download(URLS.win, zipPath);
    await extractWindows(zipPath);
  } else if (targetPlatform === 'mac') {
    console.log('macOS: Use Homebrew to install PostgreSQL 16, then copy binaries:');
    console.log('  brew install postgresql@16');
    console.log(`  cp -R $(brew --prefix postgresql@16)/{bin,lib,share} ${outDir}/`);
    console.log('Then trim to essential binaries only.');
  } else if (targetPlatform === 'linux') {
    console.log('Linux: Use your package manager to install PostgreSQL 16, then copy binaries:');
    console.log('  sudo apt install postgresql-16');
    console.log(`  mkdir -p ${outDir}/{bin,lib,share}`);
    console.log(`  cp /usr/lib/postgresql/16/bin/{${ESSENTIAL_BINS.join(',')}} ${outDir}/bin/`);
    console.log('Then copy required shared libraries and share/ data.');
  }

  console.log(`\nDone! Binaries ready in: ${outDir}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
