import React, { useEffect, useRef, useState } from 'react';
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
const FIT_KEY = 'fit';
const FIT_WIDTHS = [350, 420, 600];
const FIT_MARGIN = 16;
const SPLASH_WIDTH = 600;
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

function loadStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function loadFit(): number {
  const stored = Number(loadStored(FIT_KEY));
  return FIT_WIDTHS.includes(stored) ? stored : FIT_WIDTHS[1];
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

function Viewer(props: { fit: number }) {
  const viewer = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [entered, setEntered] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const element = viewer.current!;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const fit = Math.max(props.fit + FIT_MARGIN, width);
  const style = {
    '--fit': `${fit}px`,
    '--scale': String(width / fit),
    '--splash-scale': String(Math.min(1, width / SPLASH_WIDTH)),
  } as React.CSSProperties;

  return (
    <div
      ref={viewer}
      className={`viewer${entered ? ' entered' : ''}${menuOpen ? ' menu-open' : ''}`}
      style={style}
    >
      <iframe
        className="frame"
        src={SITE_ENTRANCE}
        title={SITE_HOST}
        onLoad={(event) => {
          const frames = event.currentTarget.contentWindow?.length ?? 0;
          setEntered(frames > 0);
          setMenuOpen(false);
        }}
      />
      <button
        type="button"
        className="scrim"
        aria-label="메뉴 닫기"
        onClick={() => setMenuOpen(false)}
      />
      {entered && (
        <button
          type="button"
          className="fab"
          aria-label="메뉴"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(!menuOpen)}
        />
      )}
    </div>
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

function FitPicker(props: { value: number; onChange: (fit: number) => void }) {
  return (
    <div className="fit-picker" role="group" aria-label="만화 폭">
      만화 폭
      {FIT_WIDTHS.map((width) => (
        <button
          key={width}
          type="button"
          aria-pressed={props.value === width}
          onClick={() => props.onChange(width)}
        >
          {width}
        </button>
      ))}
    </div>
  );
}

function Drawer(props: {
  pages: string[];
  page: string | null;
  translation: Translation;
  fit: number;
  onChangePage: (page: string) => void;
  onChangeFit: (fit: number) => void;
}) {
  return (
    <aside className="drawer">
      <p className="note">
        사이트에서 만화를 고른 다음, 여기서도 같은 화를 골라 주세요. 그러면
        번역이 나옵니다.
      </p>
      <PagePicker
        pages={props.pages}
        value={props.page}
        onChange={props.onChangePage}
      />
      <FitPicker value={props.fit} onChange={props.onChangeFit} />
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
  const [page, setPage] = useState<string | null>(() => loadStored(PAGE_KEY));
  const [fit, setFit] = useState<number>(loadFit);
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
      setMessage(`여기서는 ${SITE_HOST} 만 열 수 있습니다.`);
      return;
    }
    setMessage(
      isEntrance(target)
        ? null
        : '만화 사이트는 첫 화면부터 들어갑니다. 보고 싶은 만화는 사이트 안에서 골라 주세요.',
    );
    setInput(SITE_ENTRANCE);
    setBrowsing(true);
  }

  function choosePage(next: string) {
    setPage(next);
    store(PAGE_KEY, next);
  }

  function chooseFit(next: number) {
    setFit(next);
    store(FIT_KEY, String(next));
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
          <Viewer fit={fit} />
        ) : (
          <div className="empty">
            <p>
              주소창에 <code>{SITE_HOST}</code> 를 넣으면 만화 사이트가 여기에
              열립니다. 사이트에서 만화를 고른 다음, 번역 창에서도 같은 화를
              고르면 한국어 번역이 나옵니다.
            </p>
            <p className="caution">{CAUTION}</p>
          </div>
        )}
        {browsing && (
          <Drawer
            pages={pages}
            page={page}
            translation={translation}
            fit={fit}
            onChangePage={choosePage}
            onChangeFit={chooseFit}
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
