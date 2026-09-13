import { cp, readdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { marked } from 'marked';
import { compile } from 'sass';

const PAGES = [
  { source: 'docs/about.md', out: 'about.html', title: '소개', comments: true },
];

function pageHtml(title, body, comments) {
  const disqus = comments
    ? `<section id="disqus_thread"></section>
    <script>
      (function () {
        var s = document.createElement('script');
        s.src = 'https://hrmy-translate.disqus.com/embed.js';
        s.setAttribute('data-timestamp', +new Date());
        (document.head || document.body).appendChild(s);
      })();
    </script>`
    : '';
  return `<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <title>${title} - 호리씨와 미야무라군 번역</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="icon" href="favicon.svg" />
    <link href="dist/web.css" rel="stylesheet" />
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-GVY1S94CWM"></script>
    <script>
      window.dataLayer = window.dataLayer || [];
      function gtag() {
        dataLayer.push(arguments);
      }
      gtag('js', new Date());
      gtag('config', 'G-GVY1S94CWM');
    </script>
  </head>
  <body class="page">
    <article>
    <h1>${title}</h1>
${body}
    ${disqus}
    </article>
  </body>
</html>
`;
}

async function buildPages() {
  for (const page of PAGES) {
    const body = marked.parse(await readFile(page.source, 'utf8'));
    await writeFile(
      `web/${page.out}`,
      pageHtml(page.title, body, page.comments),
    );
  }
}

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
  'src/legacy/scss/styles.scss',
  'src/legacy/scss',
  'legacy/dist/index.css',
);
await buildJs(
  ['src/legacy/index.tsx', 'src/legacy/background.ts'],
  'legacy/dist',
);
await cp('translations', 'legacy/translations', { recursive: true });

await buildCss('src/web/scss/styles.scss', 'src/web/scss', 'web/dist/web.css');
await buildJs([{ in: 'src/web/index.tsx', out: 'web' }], 'web/dist');
await cp('translations', 'web/translations', { recursive: true });
await writeFile(
  'web/translations/index.json',
  JSON.stringify(await listPages()),
);
await buildPages();
