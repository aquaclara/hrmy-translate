import { cp } from 'node:fs/promises';
import { build } from 'esbuild';
import { compile } from 'sass';

const css = compile('src/extension/scss/styles.scss', {
  style: 'expanded',
}).css;

await build({
  stdin: {
    contents: css,
    loader: 'css',
    resolveDir: 'src/extension/scss',
    sourcefile: 'styles.css',
  },
  bundle: true,
  loader: { '.svg': 'dataurl' },
  outfile: 'extension/dist/index.css',
});

await build({
  entryPoints: ['src/extension/index.tsx', 'src/extension/background.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"' },
  outdir: 'extension/dist',
});

await cp('translations', 'extension/translations', { recursive: true });
