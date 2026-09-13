import { cp, readdir, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { compile } from 'sass';

async function buildCss(entry, resolveDir, outfile) {
  await build({
    stdin: {
      contents: compile(entry, { style: 'expanded' }).css,
      loader: 'css',
      resolveDir,
      sourcefile: 'styles.css',
    },
    bundle: true,
    loader: { '.svg': 'dataurl' },
    outfile,
  });
}

async function buildJs(entryPoints, outdir) {
  await build({
    entryPoints,
    bundle: true,
    format: 'iife',
    target: 'es2020',
    define: { 'process.env.NODE_ENV': '"production"' },
    outdir,
  });
}

async function listPages() {
  const pages = [];
  for (const entry of await readdir('translations', { recursive: true })) {
    if (entry.endsWith('.yaml')) pages.push(entry.replace(/\.yaml$/, '.html'));
  }
  return pages.sort();
}

await buildCss(
  'src/extension/scss/styles.scss',
  'src/extension/scss',
  'extension/dist/index.css',
);
await buildJs(
  ['src/extension/index.tsx', 'src/extension/background.ts'],
  'extension/dist',
);
await cp('translations', 'extension/translations', { recursive: true });

await buildCss('src/web/scss/styles.scss', 'src/web/scss', 'web/dist/web.css');
await buildJs([{ in: 'src/web/index.tsx', out: 'web' }], 'web/dist');
await cp('translations', 'web/translations', { recursive: true });
await writeFile(
  'web/translations/index.json',
  JSON.stringify(await listPages()),
);
