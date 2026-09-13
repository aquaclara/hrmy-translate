import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import yaml from 'js-yaml';
import FileDataModel from '../shared/data-models/translation-chucks/file';
import FileData from '../shared/translation-chunk-data';
import { isComment } from '../shared/data-models/comment';
import { LICENSE } from '../shared/constants';
import { translationPathFor } from '../shared/translation-path';
import { pageLabelFor } from '../shared/page-label';

const SITE_HOST = 'dka-hero.me';
const SITE_ENTRANCE = `https://${SITE_HOST}/`;
const PAGE_KEY = 'page';
const CAUTION =
  '이 사이트 내 그림의 무단전재, 도용, 링크, 캡처, 촬영 등은 금지되어 있으며 자세한 것은 사이트 내 안내를 따라 주십시오. 이 한글 번역은 공식이 아닙니다.';

type Translation =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'loaded'; data: FileData };

function parseSiteUrl(input: string): URL | null {
  const text = input.trim();
  if (text === '') return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
    return url.hostname === SITE_HOST ? url : null;
  } catch {
    return null;
  }
}

function isEntrance(url: URL): boolean {
  return (
    (url.pathname === '/' || url.pathname === '/index.html') &&
    url.search === ''
  );
}

async function fetchTranslation(page: string): Promise<Translation> {
  const response = await fetch(translationPathFor(`/${page}`).slice(1));
  if (!response.ok) return { status: 'missing' };
  const data = yaml.load(await response.text()) as FileDataModel;
  return { status: 'loaded', data: new FileData(data) };
}

async function fetchPageList(): Promise<string[]> {
  const response = await fetch('translations/index.json');
  return response.ok ? ((await response.json()) as string[]) : [];
}

function loadPage(): string | null {
  try {
    return localStorage.getItem(PAGE_KEY);
  } catch {
    return null;
  }
}

function savePage(page: string) {
  try {
    localStorage.setItem(PAGE_KEY, page);
  } catch {}
}

function groupOf(page: string): string {
  if (/^hm\d+_\d+\//.test(page)) return '호리씨와 미야무라군';
  if (/^aco\//.test(page)) return '아코와 밤비';
  return '기타';
}

function AddressBar(props: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="address-bar"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      <input
        type="text"
        inputMode="url"
        placeholder={`${SITE_HOST} 를 입력`}
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />
      <button type="submit">이동</button>
    </form>
  );
}

function TranslationView(props: { data: FileData }) {
  const keys = Object.keys(props.data.getData()).filter((key) => key !== '//');
  return (
    <div className="translation-view">
      {keys.map((key) => (
        <section key={key} className="image">
          <h3>{key.substring(key.lastIndexOf('/') + 1)}</h3>
          {props.data.getCutTranslations(key).map((cut, cutIndex) => (
            <div key={cutIndex} className="cut">
              {cut.map((line, lineIndex) => {
                const text = typeof line === 'string' ? line : line.text;
                if (!text || isComment(text)) return null;
                const type =
                  typeof line === 'string' ? 'speech' : line.type || 'speech';
                return (
                  <p
                    key={lineIndex}
                    className={`line ${type}`}
                    dangerouslySetInnerHTML={{ __html: text }}
                  />
                );
              })}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}

function PagePicker(props: {
  pages: string[];
  value: string | null;
  onChange: (page: string) => void;
}) {
  const groups = new Map<string, string[]>([
    ['호리씨와 미야무라군', []],
    ['아코와 밤비', []],
    ['기타', []],
  ]);
  for (const page of props.pages) {
    const group = groupOf(page);
    groups.set(group, [...(groups.get(group) ?? []), page]);
  }
  return (
    <label className="page-picker">
      보고 있는 화
      <select
        value={props.value ?? ''}
        onChange={(event) => props.onChange(event.target.value)}
      >
        <option value="" disabled>
          선택
        </option>
        {[...groups].map(([group, pages]) => (
          <optgroup key={group} label={group}>
            {pages.map((page) => (
              <option key={page} value={page}>
                {pageLabelFor(page)}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

function Drawer(props: {
  pages: string[];
  page: string | null;
  translation: Translation;
  onChange: (page: string) => void;
}) {
  return (
    <aside className="drawer">
      <p className="note">
        이 도구는 프레임 안에서 어느 페이지를 보고 있는지 알 수 없습니다. 사이트
        메뉴로 이동한 뒤, 보고 있는 화를 여기서 골라 주세요.
      </p>
      <PagePicker
        pages={props.pages}
        value={props.page}
        onChange={props.onChange}
      />
      {props.translation.status === 'loading' && (
        <p className="status">불러오는 중…</p>
      )}
      {props.translation.status === 'missing' && (
        <p className="status">이 화의 번역이 없습니다.</p>
      )}
      {props.translation.status === 'loaded' && (
        <TranslationView data={props.translation.data} />
      )}
      <details className="license">
        <summary>번역본 이용 조건</summary>
        <pre>{LICENSE}</pre>
      </details>
    </aside>
  );
}

function App() {
  const [input, setInput] = useState('');
  const [browsing, setBrowsing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [page, setPage] = useState<string | null>(loadPage);
  const [translation, setTranslation] = useState<Translation>({
    status: 'idle',
  });
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    fetchPageList().then(setPages);
  }, []);

  useEffect(() => {
    if (page === null) return;
    setTranslation({ status: 'loading' });
    fetchTranslation(page).then(setTranslation);
  }, [page]);

  function enter(text: string) {
    const target = parseSiteUrl(text);
    if (target === null) {
      setMessage(
        `이 브라우저는 ${SITE_HOST} 만 엽니다. 원본 사이트를 그대로 띄우고 옆에 번역을 보여주는 보조 도구입니다.`,
      );
      return;
    }
    setMessage(
      isEntrance(target)
        ? null
        : '사이트 운영자의 의도대로 입구부터 들어갑니다. 보고 싶은 만화는 사이트 메뉴에서 골라 주세요.',
    );
    setInput(SITE_ENTRANCE);
    setBrowsing(true);
  }

  function choosePage(next: string) {
    setPage(next);
    savePage(next);
  }

  return (
    <div
      className={`app${browsing ? ' browsing' : ''}${drawerOpen ? ' drawer-open' : ''}`}
    >
      <header>
        <AddressBar
          value={input}
          onChange={setInput}
          onSubmit={() => enter(input)}
        />
        <nav>
          <a href="about.html">소개</a>
          <a href="translation-policy.html">번역 원칙</a>
          <a href="https://github.com/aquaclara/hrmy-translate">GitHub</a>
        </nav>
        {message && <p className="message">{message}</p>}
      </header>
      <main>
        {browsing ? (
          <iframe className="frame" src={SITE_ENTRANCE} title={SITE_HOST} />
        ) : (
          <div className="empty">
            <p>
              주소창에 <code>{SITE_HOST}</code> 를 입력하면 원본 사이트가 이
              안에 열립니다. 사이트 메뉴로 만화를 고른 뒤, 옆의 번역 서랍에서
              같은 화를 고르면 한국어 번역이 표시됩니다.
            </p>
            <p className="caution">{CAUTION}</p>
          </div>
        )}
        {browsing && (
          <Drawer
            pages={pages}
            page={page}
            translation={translation}
            onChange={choosePage}
          />
        )}
      </main>
      {browsing && (
        <button
          type="button"
          className="drawer-toggle"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(!drawerOpen)}
        >
          번역
        </button>
      )}
    </div>
  );
}

createRoot(document.getElementById('app')!).render(<App />);
