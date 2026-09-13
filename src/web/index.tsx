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
const CAUTION =
  '이 사이트 내 그림의 무단전재, 도용, 링크, 캡처, 촬영 등은 금지되어 있으며 자세한 것은 사이트 내 안내를 따라 주십시오. 이 한글 번역은 공식이 아닙니다.';

type Loaded = { status: 'loaded'; data: FileData };
type Translation =
  { status: 'idle' } | { status: 'loading' } | { status: 'missing' } | Loaded;

function parseSiteUrl(input: string): URL | null {
  const text = input.trim();
  if (text === '') return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
    if (url.hostname !== SITE_HOST) return null;
    url.protocol = 'https:';
    return url;
  } catch {
    return null;
  }
}

async function fetchTranslation(pathname: string): Promise<Translation> {
  const response = await fetch(translationPathFor(pathname).replace(/^\//, ''));
  if (!response.ok) return { status: 'missing' };
  const data = yaml.load(await response.text()) as FileDataModel;
  return { status: 'loaded', data: new FileData(data) };
}

async function fetchPageList(): Promise<string[]> {
  const response = await fetch('translations/index.json');
  return response.ok ? ((await response.json()) as string[]) : [];
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
        placeholder={`${SITE_HOST} 주소를 입력`}
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

function PageList(props: {
  pages: string[];
  onSelect: (page: string) => void;
}) {
  return (
    <details className="page-list">
      <summary>번역이 있는 페이지</summary>
      <ul>
        {props.pages.map((page) => (
          <li key={page}>
            <button type="button" onClick={() => props.onSelect(page)}>
              {pageLabelFor(page)}
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}

function Drawer(props: {
  url: URL;
  translation: Translation;
  pages: string[];
  onSelect: (page: string) => void;
}) {
  return (
    <aside className="drawer">
      <p className="note">
        {pageLabelFor(props.url.pathname.replace(/^\//, ''))} — 프레임 안에서
        링크로 이동한 페이지는 여기에 반영되지 않습니다. 주소를 직접 입력하거나
        목록에서 고르세요.
      </p>
      <PageList pages={props.pages} onSelect={props.onSelect} />
      {props.translation.status === 'loading' && (
        <p className="status">불러오는 중…</p>
      )}
      {props.translation.status === 'missing' && (
        <p className="status">이 페이지의 번역이 없습니다.</p>
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
  const [url, setUrl] = useState<URL | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [translation, setTranslation] = useState<Translation>({
    status: 'idle',
  });
  const [pages, setPages] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(true);

  useEffect(() => {
    fetchPageList().then(setPages);
  }, []);

  function navigate(text: string) {
    const target = parseSiteUrl(text);
    if (target === null) {
      setError(
        `이 브라우저는 ${SITE_HOST} 만 엽니다. 원본 사이트를 그대로 띄우고 옆에 번역을 보여주는 보조 도구입니다.`,
      );
      return;
    }
    setError(null);
    setInput(target.href);
    setUrl(target);
    setTranslation({ status: 'loading' });
    fetchTranslation(target.pathname).then(setTranslation);
  }

  return (
    <div
      className={`app${url ? ' browsing' : ''}${drawerOpen ? ' drawer-open' : ''}`}
    >
      <header>
        <AddressBar
          value={input}
          onChange={setInput}
          onSubmit={() => navigate(input)}
        />
        <nav>
          <a href="about.html">소개</a>
          <a href="translation-policy.html">번역 원칙</a>
          <a href="https://github.com/aquaclara/hrmy-translate">GitHub</a>
        </nav>
        {error && <p className="error">{error}</p>}
      </header>
      <main>
        {url ? (
          <iframe className="frame" src={url.href} title={SITE_HOST} />
        ) : (
          <div className="empty">
            <p>
              주소창에 <code>{SITE_HOST}</code> 를 입력하면 원본 사이트가 이
              안에 열리고, 번역이 있는 페이지에서는 옆에 번역 서랍이 나타납니다.
            </p>
            <p className="caution">{CAUTION}</p>
          </div>
        )}
        {url && (
          <Drawer
            url={url}
            translation={translation}
            pages={pages}
            onSelect={(page) => navigate(`https://${SITE_HOST}/${page}`)}
          />
        )}
      </main>
      {url && (
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
