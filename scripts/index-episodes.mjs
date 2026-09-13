import { writeFile } from 'node:fs/promises';

const SITE = 'https://dka-hero.me/';
const MENU_URL = `${SITE}h_01.html`;
const ACO_LAST = 24;
const OUT = 'web/episodes.json';
const CONCURRENCY = 8;

async function fetchHtml(url) {
  const bytes = await (await fetch(url)).arrayBuffer();
  return new TextDecoder('shift_jis').decode(bytes);
}

function toNumber(text) {
  return Number(
    text.replace(/[０-９]/g, (d) =>
      String.fromCharCode(d.charCodeAt(0) - 0xfee0),
    ),
  );
}

async function describe(page) {
  const html = await fetchHtml(SITE + page);
  const sources = [
    ...html.matchAll(/<img[^>]*src="([^"]+)"[^>]*width="(?:350|420)"/g),
  ].map((m) => m[1]);
  const first = sources[0]?.match(/(\d+)\.(?:gif|jpg|png)$/);
  const links = [...html.matchAll(/href="([^"]+\.html)"/g)].map((m) =>
    new URL(m[1], SITE + page).pathname.slice(1),
  );
  return {
    page,
    images: sources.length,
    first: first ? Number(first[1]) : null,
    links,
  };
}

async function chain(page, known) {
  const pages = [];
  let current = page;
  while (current && pages.length < 8) {
    const info = await describe(current);
    pages.push({ page: info.page, images: info.images, first: info.first });
    current = info.links.find(
      (link) =>
        link !== current &&
        !known.has(link) &&
        !pages.some((p) => p.page === link) &&
        /\/pict_com_\d+\.html$/.test(link) &&
        link.localeCompare(current) > 0,
    );
  }
  return pages;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: limit }, async () => {
      while (next < items.length) {
        const index = next++;
        results[index] = await fn(items[index]);
      }
    }),
  );
  return results;
}

const menu = await fetchHtml(MENU_URL);
const horimiya = [];
for (const match of menu.matchAll(
  /<a [^>]*href="(hm[^"]+)"[^>]*>(.*?)<\/a>/gs,
)) {
  const label = match[2].replace(/<[^>]+>/g, '').trim();
  const number = label.match(/^[０-９0-9]+/);
  if (number) horimiya.push([toNumber(number[0]), match[1]]);
}
const aco = Array.from({ length: ACO_LAST }, (_, i) => [
  i + 1,
  `aco/${String(i + 1).padStart(2, '0')}/c.html`,
]);

const known = new Set([...horimiya, ...aco].map(([, page]) => page));
const episodes = { horimiya: {}, aco: {} };
for (const [series, list] of [
  ['horimiya', horimiya],
  ['aco', aco],
]) {
  const described = await mapLimit(
    list,
    CONCURRENCY,
    async ([episode, page]) => [episode, { pages: await chain(page, known) }],
  );
  for (const [episode, info] of described) episodes[series][episode] = info;
}
await writeFile(OUT, JSON.stringify(episodes, null, 2) + '\n');
console.log(`${horimiya.length} + ${aco.length} episodes -> ${OUT}`);
