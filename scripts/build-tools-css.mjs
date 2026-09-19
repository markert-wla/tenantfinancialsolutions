// Compiles a static Tailwind stylesheet for each coach tool in public/tools/
// that previously used the cdn.tailwindcss.com Play CDN (removed for CSP:
// the Play CDN requires script-src 'unsafe-eval').
//
// Each tool's palette lives in its own inline `tailwind.config = {...}` script
// tag — that block stays in the HTML as the source of truth and is parsed from
// there. After editing a tool's markup or its inline config, re-run:
//
//   node scripts/build-tools-css.mjs
//
// and commit the regenerated public/tools/css/*.css files.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const TOOLS = [
  'emotional-money-map',
  'hop-goal-setting',
  'money-diagnostic',
  'mvp-alignment',
  'press-pause-number',
  'spending-audit',
];

const root = path.resolve(new URL('..', import.meta.url).pathname);
const outDir = path.join(root, 'public/tools/css');
mkdirSync(outDir, { recursive: true });

const work = path.join(tmpdir(), 'tfs-tools-css');
rmSync(work, { recursive: true, force: true });
mkdirSync(work, { recursive: true });
writeFileSync(path.join(work, 'base.css'), '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');

for (const tool of TOOLS) {
  const htmlPath = path.join(root, 'public/tools', `${tool}.html`);
  const html = readFileSync(htmlPath, 'utf8');
  const m = html.match(/tailwind\.config\s*=\s*(\{[\s\S]*?\});?\s*<\/script>/);
  if (!m) throw new Error(`${tool}: no inline tailwind.config block found`);
  const config = new Function(`return (${m[1]})`)();

  const cfgPath = path.join(work, `${tool}.config.cjs`);
  writeFileSync(
    cfgPath,
    `module.exports = ${JSON.stringify({ content: [htmlPath], theme: config.theme ?? {} })};\n`
  );
  execFileSync(
    'npx',
    ['tailwindcss', '-c', cfgPath, '-i', path.join(work, 'base.css'), '-o', path.join(outDir, `${tool}.css`), '--minify'],
    { cwd: root, stdio: 'inherit' }
  );
  console.log(`built ${tool}.css`);
}

rmSync(work, { recursive: true, force: true });
