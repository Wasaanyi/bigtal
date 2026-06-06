#!/usr/bin/env node

/**
 * Downloads and extracts PostgreSQL binaries for the target platform.
 * Usage: node scripts/download-postgres.js [win|mac|linux]
 *
 * Windows: downloads full relocatable binaries from theseus-rs/postgresql-binaries
 * macOS:   installs via Homebrew and copies binaries
 * Linux:   downloads full relocatable binaries from theseus-rs/postgresql-binaries
 *
 * Note: we use theseus-rs GitHub Releases rather than EnterpriseDB because EDB's
 * CDN blocks CI runner IPs (HTTP 403) and never hosted Linux binaries. Unlike
 * the zonky embedded archives (server-only), theseus-rs ships the complete tool
 * set (pg_dump/pg_restore/createdb/dropdb/psql) the backup/restore feature needs.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PG_VERSION = '17.5';
// theseus-rs tags releases as <pgversion>.0 (e.g. 17.5.0).
const THESEUS_VERSION = `${PG_VERSION}.0`;
const THESEUS_TARGET = {
  win: 'x86_64-pc-windows-msvc',
  linux: 'x86_64-unknown-linux-gnu',
};

function theseusUrl(platform) {
  const target = THESEUS_TARGET[platform];
  return `https://github.com/theseus-rs/postgresql-binaries/releases/download/${THESEUS_VERSION}/postgresql-${THESEUS_VERSION}-${target}.tar.gz`;
}

const ESSENTIAL_BINS = [
  'postgres', 'pg_ctl', 'initdb', 'createdb', 'dropdb',
  'pg_dump', 'pg_restore', 'psql',
];

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
    // EnterpriseDB's CDN now returns HTTP 403 to requests without a
    // User-Agent header (Node's http(s).get sends none by default), so set one.
    const options = { headers: { 'User-Agent': 'bigtal-postgres-fetch/1.0' } };
    get(url, options, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        file.close();
        fs.unlinkSync(dest);
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
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
      try { fs.unlinkSync(dest); } catch { /* ignore */ }
      reject(err);
    });
  });
}

// The theseus-rs tarball contains a single top-level directory
// (postgresql-<ver>-<target>/) holding bin/, lib/, share/.
async function extractTheseus(tarPath) {
  const workDir = path.join(path.dirname(tarPath), 'pg-extract');
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.mkdirSync(workDir, { recursive: true });

  console.log('Extracting...');
  // `tar -xf` auto-detects gzip on both GNU tar (Linux) and bsdtar (Windows).
  execSync(`tar -xf "${tarPath}" -C "${workDir}"`, { stdio: 'inherit' });

  const dirs = fs
    .readdirSync(workDir, { withFileTypes: true })
    .filter((e) => e.isDirectory());
  const pgRoot = dirs.length === 1 ? path.join(workDir, dirs[0].name) : workDir;

  copyPgsqlDir(pgRoot);

  // Cleanup
  fs.rmSync(workDir, { recursive: true, force: true });
  fs.unlinkSync(tarPath);
  console.log('  Cleaned up temp files');
}

function copyPgsqlDir(pgsqlDir) {
  fs.mkdirSync(path.join(outDir, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'share'), { recursive: true });

  const ext = targetPlatform === 'win' ? '.exe' : '';

  for (const bin of ESSENTIAL_BINS) {
    const src = path.join(pgsqlDir, 'bin', `${bin}${ext}`);
    const dest = path.join(outDir, 'bin', `${bin}${ext}`);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      if (targetPlatform !== 'win') fs.chmodSync(dest, 0o755);
      console.log(`  Copied ${bin}${ext}`);
    }
  }

  // Copy DLLs (Windows) or shared libraries
  const binDir = path.join(pgsqlDir, 'bin');
  if (fs.existsSync(binDir)) {
    for (const file of fs.readdirSync(binDir)) {
      if (file.endsWith('.dll') || file.endsWith('.so') || file.includes('.so.')) {
        fs.copyFileSync(path.join(binDir, file), path.join(outDir, 'bin', file));
      }
    }
    console.log('  Copied shared libraries from bin/');
  }

  // Copy lib directory
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
}

async function prepareMac() {
  // Install via Homebrew (handles arm64/x64 automatically)
  console.log('Installing PostgreSQL via Homebrew...');
  try {
    execSync('brew install postgresql@17', { stdio: 'inherit' });
  } catch {
    // May already be installed, try to continue
    console.log('brew install failed or already installed, attempting to locate binaries...');
  }

  const prefix = execSync('brew --prefix postgresql@17', { encoding: 'utf8' }).trim();
  if (!fs.existsSync(prefix)) {
    throw new Error(`Homebrew PostgreSQL prefix not found: ${prefix}`);
  }

  console.log(`Using Homebrew PostgreSQL at: ${prefix}`);

  fs.mkdirSync(path.join(outDir, 'bin'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'lib'), { recursive: true });
  fs.mkdirSync(path.join(outDir, 'share'), { recursive: true });

  // Copy essential binaries
  for (const bin of ESSENTIAL_BINS) {
    const src = path.join(prefix, 'bin', bin);
    const dest = path.join(outDir, 'bin', bin);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
      fs.chmodSync(dest, 0o755);
      console.log(`  Copied ${bin}`);
    }
  }

  // Copy lib directory (dylibs)
  const libDir = path.join(prefix, 'lib', 'postgresql@17');
  const libDirAlt = path.join(prefix, 'lib');
  const srcLib = fs.existsSync(libDir) ? libDir : libDirAlt;
  if (fs.existsSync(srcLib)) {
    // Copy only .dylib files to keep size down
    for (const file of fs.readdirSync(srcLib)) {
      if (file.endsWith('.dylib') || file.includes('.dylib.')) {
        fs.copyFileSync(path.join(srcLib, file), path.join(outDir, 'lib', file));
      }
    }
    console.log('  Copied dylibs');
  }

  // Copy share directory
  const shareDir = path.join(prefix, 'share', 'postgresql@17');
  const shareDirAlt = path.join(prefix, 'share');
  const srcShare = fs.existsSync(shareDir) ? shareDir : shareDirAlt;
  if (fs.existsSync(srcShare)) {
    copyDirSync(srcShare, path.join(outDir, 'share'));
    console.log('  Copied share/');
  }
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
    const tarPath = path.join(outDir, '..', 'pg-win.tar.gz');
    await download(theseusUrl('win'), tarPath);
    await extractTheseus(tarPath);
  } else if (targetPlatform === 'mac') {
    await prepareMac();
  } else if (targetPlatform === 'linux') {
    const tarPath = path.join(outDir, '..', 'pg-linux.tar.gz');
    await download(theseusUrl('linux'), tarPath);
    await extractTheseus(tarPath);
  }

  console.log(`\nDone! Binaries ready in: ${outDir}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
