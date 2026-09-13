import { build } from 'esbuild';
import { compile } from 'sass';

const css = compile('src/scss/styles.scss', { style: 'expanded' }).css;

await build({
  stdin: {
    contents: css,
    loader: 'css',
    resolveDir: 'src/scss',
    sourcefile: 'styles.css',
  },
  bundle: true,
  loader: { '.svg': 'dataurl' },
  outfile: 'dist/index.css',
});

await build({
  entryPoints: ['src/scripts/index.tsx', 'src/scripts/background.ts'],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  define: { 'process.env.NODE_ENV': '"production"' },
  outdir: 'dist',
});
