import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import yaml from 'js-yaml';
import FileDataModel from '../shared/data-models/translation-chucks/file';
import FileData from '../shared/translation-chunk-data';
import { isComment } from '../shared/data-models/comment';
import { LICENSE } from '../shared/constants';
import { translationPathFor } from '../shared/translation-path';
import { documentHeight, Layout, layoutFor } from './layout';

const SITE_HOST = 'dka-hero.me';
const SITE_ENTRANCE = `https://${SITE_HOST}/`;
const PAGE_KEY = 'page';
const FIT_KEY = 'fit';
const FIT_WIDTHS = [350, 420, 600];
const FIT_MARGIN = 16;
const SPLASH_WIDTH = 600;
const ACO_LAST = 24;
const MOBILE_QUERY = '(max-width: 60rem)';
const CAUTION =
  '이 사이트 내 그림의 무단전재, 도용, 링크, 캡처, 촬영 등은 금지되어 있으며 자세한 것은 사이트 내 안내를 따라 주십시오. 이 한글 번역은 공식이 아닙니다.';

type Episodes = { [episode: string]: string };
type Series = 'horimiya' | 'aco';
type Translation =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'loaded'; data: FileData };

function parseUrl(input: string): URL | null {
  const text = input.trim();
  if (text === '') return null;
  try {
    const url = new URL(/^[a-z]+:\/\//i.test(text) ? text : `https://${text}`);
    if (url.protocol === 'http:') url.protocol = 'https:';
    return url;
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

async function fetchJson<T>(path: string, fallback: T): Promise<T> {
  const response = await fetch(path);
  return response.ok ? ((await response.json()) as T) : fallback;
}

async function fetchTranslation(page: string): Promise<Translation> {
  const response = await fetch(translationPathFor(`/${page}`).slice(1));
  if (!response.ok) return { status: 'missing' };
  const data = yaml.load(await response.text()) as FileDataModel;
  return { status: 'loaded', data: new FileData(data) };
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

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => matchMedia(query).matches);
  useEffect(() => {
    const list = matchMedia(query);
    const update = () => setMatches(list.matches);
    list.addEventListener('change', update);
    return () => list.removeEventListener('change', update);
  }, [query]);
  return matches;
}

function seriesOf(page: string): Series {
  return /^aco\//.test(page) ? 'aco' : 'horimiya';
}

function acoPage(episode: number): string {
  return `aco/${String(episode).padStart(2, '0')}/c.html`;
}

function episodeOf(page: string, episodes: Episodes): number | null {
  const aco = page.match(/^aco\/0*(\d+)\/c\.html$/);
  if (aco) return Number(aco[1]);
  for (const [episode, path] of Object.entries(episodes)) {
    if (path === page) return Number(episode);
  }
  return null;
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

function Viewer(props: {
  src: string;
  fit: number;
  mobile: boolean;
  docHeight: number | null;
  onScale: (scale: number) => void;
}) {
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
  const scale = width / fit;
  useEffect(() => {
    props.onScale(scale);
  }, [scale]);

  const active = entered;
  const tall = active && props.docHeight !== null;
  const style = {
    '--fit': `${fit}px`,
    '--scale': String(scale),
    '--splash-scale': String(Math.min(1, width / SPLASH_WIDTH)),
    '--doc-height': tall ? `${props.docHeight}px` : undefined,
  } as React.CSSProperties;
  const classes = ['viewer'];
  if (props.mobile) classes.push('mobile');
  if (active) classes.push('entered');
  if (menuOpen) classes.push('menu-open');
  if (tall) classes.push('tall');

  return (
    <div ref={viewer} className={classes.join(' ')} style={style}>
      <iframe
        className="frame"
        src={props.src}
        title={props.src}
        onLoad={(event) => {
          const frames = event.currentTarget.contentWindow?.length ?? 0;
          setEntered(frames > 0);
          setMenuOpen(false);
        }}
      />
      {props.mobile && (
        <button
          type="button"
          className="scrim"
          aria-label="메뉴 닫기"
          onClick={() => setMenuOpen(false)}
        />
      )}
      {active && props.mobile && (
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

function TranslationView(props: {
  data: FileData;
  layout: Layout | null;
  scale: number;
}) {
  const keys = Object.keys(props.data.getData()).filter((key) => key !== '//');
  const positioned = props.layout !== null;
  return (
    <div className={`translation-view${positioned ? ' positioned' : ''}`}>
      {keys.map((key, imageIndex) => {
        const cuts = props.data.getCutTranslations(key);
        return (
          <section key={key} className="image">
            {cuts.map((cut, cutIndex) => {
              const top =
                props.layout === null
                  ? undefined
                  : (props.layout.top +
                      imageIndex * props.layout.pitch +
                      (props.layout.height / cuts.length) * cutIndex) *
                    props.scale;
              return (
                <div key={cutIndex} className="cut" style={{ top }}>
                  {cut.map((line, lineIndex) => {
                    const text = typeof line === 'string' ? line : line.text;
                    if (!text || isComment(text)) return null;
                    const type =
                      typeof line === 'string'
                        ? 'speech'
                        : line.type || 'speech';
                    return (
                      <p
                        key={lineIndex}
                        className={`line ${type}`}
                        dangerouslySetInnerHTML={{ __html: text }}
                      />
                    );
                  })}
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}

function EpisodePicker(props: {
  episodes: Episodes;
  page: string | null;
  onChange: (page: string) => void;
}) {
  const series: Series = props.page ? seriesOf(props.page) : 'horimiya';
  const lastOf = (target: Series) =>
    target === 'aco'
      ? ACO_LAST
      : Math.max(0, ...Object.keys(props.episodes).map(Number));
  const last = lastOf(series);
  const current = props.page ? episodeOf(props.page, props.episodes) : null;

  function choose(target: Series, episode: number) {
    if (episode < 1 || episode > lastOf(target)) return;
    props.onChange(
      target === 'aco' ? acoPage(episode) : props.episodes[episode],
    );
  }

  return (
    <div className="episode-picker">
      <label>
        보고 있는 만화
        <select
          value={series}
          onChange={(event) => choose(event.target.value as Series, 1)}
        >
          <option value="horimiya">호리씨와 미야무라군</option>
          <option value="aco">아코와 밤비</option>
        </select>
      </label>
      <div className="episode-number">
        <button
          type="button"
          aria-label="이전 화"
          disabled={current === null || current <= 1}
          onClick={() => choose(series, (current ?? 1) - 1)}
        >
          −
        </button>
        <label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={last}
            value={current ?? ''}
            onChange={(event) => choose(series, Number(event.target.value))}
          />
          화
        </label>
        <button
          type="button"
          aria-label="다음 화"
          disabled={current === null || current >= last}
          onClick={() => choose(series, (current ?? 0) + 1)}
        >
          +
        </button>
        {series === 'aco' && (
          <span className="hint">
            {ACO_LAST}화까지만 사이트에서 볼 수 있습니다.
          </span>
        )}
      </div>
    </div>
  );
}

function FitPicker(props: { value: number; onChange: (fit: number) => void }) {
  return (
    <div className="fit-picker" role="group" aria-label="만화 폭">
      <span className="label">만화 폭</span>
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

function App() {
  const mobile = useMediaQuery(MOBILE_QUERY);
  const [input, setInput] = useState('');
  const [url, setUrl] = useState<URL | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Episodes>({});
  const [page, setPage] = useState<string | null>(() => loadStored(PAGE_KEY));
  const [fit, setFit] = useState<number>(loadFit);
  const [translation, setTranslation] = useState<Translation>({
    status: 'idle',
  });
  const [panelOpen, setPanelOpen] = useState(true);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    fetchJson<Episodes>('episodes.json', {}).then((loaded) => {
      setEpisodes(loaded);
      if (page === null && loaded[1]) choosePage(loaded[1]);
    });
  }, []);

  useEffect(() => {
    if (page === null) return;
    setTranslation({ status: 'loading' });
    fetchTranslation(page).then(setTranslation);
  }, [page]);

  function enter(text: string) {
    const target = parseUrl(text);
    if (target === null) return;
    if (target.hostname === SITE_HOST) {
      setMessage(
        isEntrance(target)
          ? null
          : '만화 사이트는 첫 화면부터 들어갑니다. 보고 싶은 만화는 사이트 안에서 골라 주세요.',
      );
      setInput(SITE_ENTRANCE);
      setUrl(new URL(SITE_ENTRANCE));
      return;
    }
    setMessage(null);
    setInput(target.href);
    setUrl(target);
  }

  function choosePage(next: string) {
    setPage(next);
    store(PAGE_KEY, next);
  }

  function chooseFit(next: number) {
    setFit(next);
    store(FIT_KEY, String(next));
  }

  const onSite = url !== null;
  const layout = page ? layoutFor(page) : null;
  const images =
    translation.status === 'loaded'
      ? Object.keys(translation.data.getData()).filter((key) => key !== '//')
          .length
      : 0;
  const docHeight = layout && images ? documentHeight(layout, images) : null;
  const height = docHeight === null ? null : docHeight * scale;

  return (
    <div className={`app${onSite && panelOpen ? ' with-panel' : ''}`}>
      <nav>
        <a href="about.html">소개</a>
        <a href="translation-policy.html">번역 원칙</a>
        <a href="https://github.com/aquaclara/hrmy-translate">GitHub</a>
        {onSite && (
          <button
            type="button"
            className="panel-toggle"
            aria-expanded={panelOpen}
            onClick={() => setPanelOpen(!panelOpen)}
          >
            번역
          </button>
        )}
      </nav>
      <div className="workspace">
        <div className="browser">
          <div className="chrome">
            <AddressBar
              value={input}
              onChange={setInput}
              onSubmit={() => enter(input)}
            />
            {message && <p className="message">{message}</p>}
          </div>
          {url === null && (
            <div className="empty">
              <p>
                주소창에 <code>{SITE_HOST}</code> 를 넣으면 만화 사이트가 여기에
                열립니다. 사이트에서 만화를 고른 다음, 번역 창에서도 같은 화를
                고르면 한국어 번역이 나옵니다.
              </p>
              <p className="caution">{CAUTION}</p>
            </div>
          )}
          {url !== null && (
            <Viewer
              src={url.href}
              fit={fit}
              mobile={mobile}
              docHeight={docHeight}
              onScale={setScale}
            />
          )}
        </div>
        {onSite && panelOpen && (
          <aside className="panel">
            <div className="controls">
              <p className="note">
                사이트에서 만화를 고른 다음, 여기서도 같은 화를 골라 주세요.
                그러면 번역이 나옵니다.
              </p>
              <EpisodePicker
                episodes={episodes}
                page={page}
                onChange={choosePage}
              />
              {mobile && <FitPicker value={fit} onChange={chooseFit} />}
            </div>
            <div
              className="translations"
              style={{ minHeight: height ?? undefined }}
            >
              {translation.status === 'loading' && (
                <p className="status">불러오는 중…</p>
              )}
              {translation.status === 'missing' && (
                <p className="status">이 화의 번역이 없습니다.</p>
              )}
              {translation.status === 'loaded' && (
                <TranslationView
                  data={translation.data}
                  layout={layout}
                  scale={scale}
                />
              )}
            </div>
            <section className="license">
              <h3>번역본 이용 조건</h3>
              <pre>{LICENSE}</pre>
            </section>
          </aside>
        )}
      </div>
    </div>
  );
}

createRoot(document.getElementById('app')!).render(<App />);
