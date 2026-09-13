import { writeFile } from 'node:fs/promises';

const MENU_URL = 'https://dka-hero.me/h_01.html';
const OUT = 'web/episodes.json';

const bytes = await (await fetch(MENU_URL)).arrayBuffer();
const html = new TextDecoder('shift_jis').decode(bytes);
const episodes = {};
for (const match of html.matchAll(
  /<a [^>]*href="(hm[^"]+)"[^>]*>(.*?)<\/a>/gs,
)) {
  const label = match[2].replace(/<[^>]+>/g, '').trim();
  const number = label.match(/^[０-９0-9]+/);
  if (!number) continue;
  const episode = Number(
    number[0].replace(/[０-９]/g, (d) =>
      String.fromCharCode(d.charCodeAt(0) - 0xfee0),
    ),
  );
  episodes[episode] = match[1];
}
await writeFile(OUT, JSON.stringify(episodes, null, 2) + '\n');
console.log(`${Object.keys(episodes).length} episodes -> ${OUT}`);
