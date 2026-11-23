import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const entry = path.join(__dirname, 'calibrateEngine.ts');
const tmpOut = path.join(os.tmpdir(), `brasileirao-calibrate-${Date.now()}.mjs`);

try {
  await esbuild.build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outfile: tmpOut,
    tsconfig: path.join(rootDir, 'tsconfig.json'),
    logLevel: 'silent',
  });

  execFileSync(process.execPath, [tmpOut], { stdio: 'inherit' });
} finally {
  if (fs.existsSync(tmpOut)) {
    fs.unlinkSync(tmpOut);
  }
}
