import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { execFileSync, spawn, ChildProcess } from 'child_process';

const isDev = !app.isPackaged;

let pgPort: number | null = null;
let pgProcess: ChildProcess | null = null;

function getBinPath(): string {
  if (isDev) {
    // In development, use system-installed PostgreSQL from PATH
    return '';
  }
  // In production, use bundled binaries from extraResources
  const resourcesPath = process.resourcesPath;
  return path.join(resourcesPath, 'postgres', 'bin');
}

function getBinFile(name: string): string {
  const binPath = getBinPath();
  const ext = process.platform === 'win32' ? '.exe' : '';
  if (binPath) {
    return path.join(binPath, name + ext);
  }
  // On PATH — just use the name (or name.exe on Windows)
  return name + ext;
}

function getDataDir(): string {
  return path.join(app.getPath('userData'), 'bigtal-pgdata');
}

function getLibPath(): string | null {
  if (isDev) return null;
  const resourcesPath = process.resourcesPath;
  const libDir = path.join(resourcesPath, 'postgres', 'lib');
  return fs.existsSync(libDir) ? libDir : null;
}

function getSharePath(): string | null {
  if (isDev) return null;
  const resourcesPath = process.resourcesPath;
  const shareDir = path.join(resourcesPath, 'postgres', 'share');
  return fs.existsSync(shareDir) ? shareDir : null;
}

function makeEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env };
  const libPath = getLibPath();
  if (libPath) {
    if (process.platform === 'win32') {
      env.PATH = `${path.join(path.dirname(libPath), 'bin')};${env.PATH || ''}`;
    } else if (process.platform === 'darwin') {
      env.DYLD_LIBRARY_PATH = `${libPath}:${env.DYLD_LIBRARY_PATH || ''}`;
    } else {
      env.LD_LIBRARY_PATH = `${libPath}:${env.LD_LIBRARY_PATH || ''}`;
    }
  }
  const sharePath = getSharePath();
  if (sharePath) {
    env.PGSHAREDIR = sharePath;
  }
  return env;
}

async function findFreePort(): Promise<number> {
  for (let port = 15432; port <= 15532; port++) {
    const available = await new Promise<boolean>((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, '127.0.0.1');
    });
    if (available) return port;
  }
  throw new Error('No free port found in range 15432-15532');
}

function initCluster(): void {
  const dataDir = getDataDir();
  if (fs.existsSync(path.join(dataDir, 'PG_VERSION'))) {
    return; // Already initialized
  }

  console.log('Initializing PostgreSQL cluster at', dataDir);
  fs.mkdirSync(dataDir, { recursive: true });

  const initdb = getBinFile('initdb');
  const args = [
    '-D', dataDir,
    '-U', 'postgres',
    '-E', 'UTF8',
    '--no-locale',
    '-A', 'trust',
  ];

  // In production, explicitly tell initdb where the share directory is,
  // since the compiled-in path won't match the bundled location
  const sharePath = getSharePath();
  if (sharePath) {
    args.push('-L', sharePath);
  }

  execFileSync(initdb, args, { env: makeEnv(), stdio: 'pipe' });

  console.log('PostgreSQL cluster initialized');
}

function configureCluster(port: number): void {
  const dataDir = getDataDir();

  const postgresqlConf = `
# Bigtal embedded PostgreSQL configuration
listen_addresses = '127.0.0.1'
port = ${port}
max_connections = 10
shared_buffers = 32MB
wal_level = minimal
max_wal_senders = 0
fsync = on
log_destination = 'stderr'
logging_collector = off
# Disable TCP keepalive issues on Windows
`.trim() + '\n';

  fs.writeFileSync(path.join(dataDir, 'postgresql.conf'), postgresqlConf);

  const pgHbaConf = `
# TYPE  DATABASE  USER  ADDRESS       METHOD
local   all       all                 trust
host    all       all   127.0.0.1/32  trust
host    all       all   ::1/128       trust
`.trim() + '\n';

  fs.writeFileSync(path.join(dataDir, 'pg_hba.conf'), pgHbaConf);
}

async function waitForReady(port: number, timeoutMs = 15000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        const socket = net.createConnection({ host: '127.0.0.1', port }, () => {
          socket.end();
          resolve();
        });
        socket.once('error', reject);
        socket.setTimeout(500, () => {
          socket.destroy();
          reject(new Error('timeout'));
        });
      });
      return; // Connected successfully
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`PostgreSQL did not become ready within ${timeoutMs}ms`);
}

function cleanStalePid(): void {
  const dataDir = getDataDir();
  const pidFile = path.join(dataDir, 'postmaster.pid');
  if (!fs.existsSync(pidFile)) return;

  const content = fs.readFileSync(pidFile, 'utf8');
  const lines = content.trim().split('\n');
  const pid = parseInt(lines[0], 10);

  if (isNaN(pid)) {
    fs.unlinkSync(pidFile);
    return;
  }

  // Check if the process is actually running
  try {
    process.kill(pid, 0); // Signal 0 = check if process exists
    // Process exists — try to stop it gracefully
    try {
      const pgCtl = getBinFile('pg_ctl');
      execFileSync(pgCtl, ['stop', '-D', dataDir, '-m', 'fast', '-w'], {
        env: makeEnv(),
        stdio: 'pipe',
        timeout: 10000,
      });
    } catch {
      // If pg_ctl stop fails, the PID might be a different process
      // Remove stale PID file
      fs.unlinkSync(pidFile);
    }
  } catch {
    // Process doesn't exist — stale PID file
    fs.unlinkSync(pidFile);
  }
}

async function start(): Promise<{ port: number }> {
  const dataDir = getDataDir();

  // Initialize cluster if needed
  initCluster();

  // Clean up stale PID file from previous crash
  cleanStalePid();

  // Find a free port
  const port = await findFreePort();

  // Write config with chosen port
  configureCluster(port);

  console.log(`Starting PostgreSQL on port ${port}...`);

  const postgres = getBinFile('postgres');
  const stderrChunks: string[] = [];
  let earlyExit = false;
  let exitCode: number | null = null;

  pgProcess = spawn(postgres, ['-D', dataDir], {
    env: makeEnv(),
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: false,
  });

  pgProcess.stdout?.on('data', (data: Buffer) => {
    console.log('[postgres]', data.toString().trim());
  });

  pgProcess.stderr?.on('data', (data: Buffer) => {
    const msg = data.toString().trim();
    if (msg) {
      console.log('[postgres]', msg);
      stderrChunks.push(msg);
    }
  });

  pgProcess.on('exit', (code) => {
    console.log(`PostgreSQL process exited with code ${code}`);
    earlyExit = true;
    exitCode = code;
    pgProcess = null;
  });

  // Wait for PostgreSQL to accept connections, but fail fast if process exits
  try {
    await waitForReady(port);
  } catch (err) {
    const pgLog = stderrChunks.join('\n');
    if (earlyExit) {
      throw new Error(
        `PostgreSQL exited immediately with code ${exitCode}.\n\nPostgreSQL log:\n${pgLog || '(no output)'}`
      );
    }
    throw new Error(
      `PostgreSQL did not become ready within 15s.\n\nPostgreSQL log:\n${pgLog || '(no output)'}`
    );
  }
  pgPort = port;

  console.log(`PostgreSQL ready on port ${port}`);

  // Ensure the 'bigtal' database exists
  await ensureDatabase(port);

  return { port };
}

async function ensureDatabase(port: number): Promise<void> {
  const createdb = getBinFile('createdb');
  try {
    execFileSync(createdb, [
      '-h', '127.0.0.1',
      '-p', String(port),
      '-U', 'postgres',
      'bigtal',
    ], { env: makeEnv(), stdio: 'pipe' });
    console.log('Database "bigtal" created');
  } catch (err: any) {
    // Error code 1 with "already exists" is fine
    const stderr = err.stderr?.toString() || '';
    if (stderr.includes('already exists')) {
      console.log('Database "bigtal" already exists');
    } else {
      throw new Error(`Failed to create database: ${stderr}`);
    }
  }
}

async function stop(): Promise<void> {
  const dataDir = getDataDir();

  if (pgProcess) {
    console.log('Stopping PostgreSQL...');
    try {
      const pgCtl = getBinFile('pg_ctl');
      execFileSync(pgCtl, ['stop', '-D', dataDir, '-m', 'fast', '-w'], {
        env: makeEnv(),
        stdio: 'pipe',
        timeout: 15000,
      });
      console.log('PostgreSQL stopped');
    } catch (err) {
      console.warn('pg_ctl stop failed, killing process:', err);
      pgProcess.kill('SIGTERM');
    }
    pgProcess = null;
    pgPort = null;
  }
}

function getPort(): number {
  if (pgPort === null) {
    throw new Error('PostgreSQL is not running');
  }
  return pgPort;
}

function isRunning(): boolean {
  return pgProcess !== null && pgPort !== null;
}

export const postgresManager = {
  start,
  stop,
  getPort,
  isRunning,
  getBinFile,
  makeEnv,
  getDataDir,
};
