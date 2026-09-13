import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import yaml from 'js-yaml';
import FileDataModel from '../shared/data-models/translation-chucks/file';
import FileData from '../shared/translation-chunk-data';
import { isComment } from '../shared/data-models/comment';
import { translationPathFor } from '../shared/translation-path';
import { documentHeight, layoutFor } from './layout';
import { Address, BUBBLE_COLUMN, Patch, TranslationView } from './bubbles';
import { LICENSE, YAML_OPTION } from '../shared/constants';

const SITE_HOST = 'dka-hero.me';
const SITE_ENTRANCE = `https://${SITE_HOST}/`;
const HOME_URL = new URL('about.html', location.href);
const PAGE_KEY = 'page';
const FIT_KEY = 'fit';
const OFFSET_KEY = 'offset';
const DRAFT_KEY = 'draft';
const FIT_WIDTHS = [350, 420, 600];
const FIT_MARGIN = 16;
const SPLASH_WIDTH = 600;
const MOBILE_QUERY = '(max-width: 60rem)';
const MENU_WIDTH = 188;
const DRAG_THRESHOLD = 60;
const OVERLAY_INSET = 8;

type EpisodeInfo = { page: string; images: number; first: number | null };
type Episodes = {
  horimiya: { [episode: string]: EpisodeInfo };
  aco: { [episode: string]: EpisodeInfo };
};
const NO_EPISODES: Episodes = { horimiya: {}, aco: {} };
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

function draftKey(page: string): string {
  return `${DRAFT_KEY}:${page}`;
}

function loadDraft(page: string): FileDataModel | null {
  try {
    const stored = loadStored(draftKey(page));
    return stored === null ? null : (JSON.parse(stored) as FileDataModel);
  } catch {
    return null;
  }
}

async function fetchTranslation(page: string): Promise<Translation> {
  const draft = loadDraft(page);
  if (draft !== null) return { status: 'loaded', data: new FileData(draft) };
  const response = await fetch(translationPathFor(`/${page}`).slice(1));
  if (!response.ok) return { status: 'missing' };
  const data = yaml.load(await response.text()) as FileDataModel;
  return { status: 'loaded', data: new FileData(data) };
}

function toYaml(data: FileData): string {
  const document: FileDataModel = { ...data.getData() };
  document['//'] = LICENSE as unknown as FileDataModel[string];
  return yaml.dump(document, YAML_OPTION) + '\n';
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

type Offset = { x: number; y: number };

function loadOffset(): Offset {
  try {
    const stored = JSON.parse(loadStored(OFFSET_KEY) ?? '');
    if (typeof stored.x === 'number' && typeof stored.y === 'number') {
      return { x: stored.x, y: stored.y };
    }
  } catch {}
  return { x: 0, y: 0 };
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

function isFrameset(win: Window | null): boolean {
  return win !== null && win.length === 2 && win.frames[0].length === 0;
}

function seriesOf(page: string): Series {
  return /^aco\//.test(page) ? 'aco' : 'horimiya';
}

function infoOf(page: string, episodes: Episodes): EpisodeInfo | null {
  for (const series of [episodes.horimiya, episodes.aco]) {
    for (const info of Object.values(series)) {
      if (info.page === page) return info;
    }
  }
  return null;
}

function episodeOf(page: string, episodes: Episodes): number | null {
  const series = seriesOf(page) === 'aco' ? episodes.aco : episodes.horimiya;
  for (const [episode, info] of Object.entries(series)) {
    if (info.page === page) return Number(episode);
  }
  return null;
}

function AddressBar(props: {
  value: string;
  current: string;
  mobile: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onHome: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        input.current?.focus();
        input.current?.select();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <form
      className="address-bar"
      onSubmit={(event) => {
        event.preventDefault();
        props.onSubmit();
      }}
    >
      {!props.mobile && (
        <button
          type="button"
          className="back"
          aria-label="뒤로"
          onClick={() => history.back()}
        />
      )}
      {!props.mobile && (
        <button
          type="button"
          className="forward"
          aria-label="앞으로"
          onClick={() => history.forward()}
        />
      )}
      <button
        type="button"
        className="home"
        aria-label="홈페이지"
        onClick={props.onHome}
      />
      <input
        ref={input}
        type="text"
        inputMode="url"
        enterKeyHint="go"
        value={props.value}
        onChange={(event) => props.onChange(event.target.value)}
        onFocus={(event) => event.target.select()}
        onMouseUp={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            props.onChange(props.current);
            event.currentTarget.blur();
          }
        }}
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
  home: boolean;
  splash: boolean;
  overlay: boolean;
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

  const fit = Math.max(
    props.fit + FIT_MARGIN + (props.overlay ? BUBBLE_COLUMN : 0),
    width,
  );
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
  if (props.splash && !entered) classes.push('splash');
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
          setEntered(
            !props.home && isFrameset(event.currentTarget.contentWindow),
          );
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

function EpisodePicker(props: {
  episodes: Episodes;
  page: string | null;
  onChange: (page: string) => void;
}) {
  const series: Series = props.page ? seriesOf(props.page) : 'horimiya';
  const lastOf = (target: Series) =>
    Math.max(0, ...Object.keys(props.episodes[target]).map(Number));
  const last = lastOf(series);
  const current = props.page ? episodeOf(props.page, props.episodes) : null;

  function choose(target: Series, episode: number) {
    const info = props.episodes[target][episode];
    if (info === undefined) return;
    props.onChange(info.page);
  }

  return (
    <div className="episode-picker">
      <select
        aria-label="작품"
        value={series}
        onChange={(event) => choose(event.target.value as Series, 1)}
      >
        <option value="horimiya">호리씨와 미야무라군</option>
        <option value="aco">아코와 밤비</option>
      </select>
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
            {last}화까지만 사이트에서 볼 수 있습니다.
          </span>
        )}
      </div>
    </div>
  );
}

function FitPicker(props: { value: number; onChange: (fit: number) => void }) {
  return (
    <div className="fit-picker" role="group" aria-label="폭">
      <span className="label">폭</span>
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
  const [input, setInput] = useState(HOME_URL.href);
  const [url, setUrl] = useState<URL>(HOME_URL);
  const [visit, setVisit] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [episodes, setEpisodes] = useState<Episodes>(NO_EPISODES);
  const [page, setPage] = useState<string | null>(() => loadStored(PAGE_KEY));
  const [fit, setFit] = useState<number>(loadFit);
  const [translation, setTranslation] = useState<Translation>({
    status: 'idle',
  });
  const [panelOpen, setPanelOpen] = useState(true);
  const [scale, setScale] = useState(1);
  const [overlay, setOverlay] = useState(false);
  const [edit, setEdit] = useState(false);
  const [, setVersion] = useState(0);
  const [drag, setDrag] = useState<{
    startX: number;
    startY: number;
    dx: number;
    dy: number;
  } | null>(null);
  const [offset, setOffset] = useState<Offset>(loadOffset);
  const browserHeader = useRef<HTMLDivElement>(null);
  const panelHeader = useRef<HTMLDivElement>(null);
  const [browserHeaderHeight, setBrowserHeaderHeight] = useState(0);
  const [panelHeaderHeight, setPanelHeaderHeight] = useState(0);

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      setBrowserHeaderHeight(browserHeader.current?.offsetHeight ?? 0);
      setPanelHeaderHeight(panelHeader.current?.offsetHeight ?? 0);
    });
    observer.observe(browserHeader.current!);
    if (panelHeader.current) observer.observe(panelHeader.current);
    return () => observer.disconnect();
  }, [panelOpen, overlay]);

  function onTitlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ startX: event.clientX, startY: event.clientY, dx: 0, dy: 0 });
  }

  function onTitlePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (drag === null) return;
    setDrag({
      ...drag,
      dx: event.clientX - drag.startX,
      dy: event.clientY - drag.startY,
    });
  }

  function onTitlePointerUp() {
    if (drag === null) return;
    if (overlay) {
      moveTo({ x: offset.x + drag.dx, y: offset.y + drag.dy });
    } else if (drag.dx < -DRAG_THRESHOLD) {
      setOverlay(true);
    }
    setDrag(null);
  }

  function applyEdit(address: Address, patch: Patch) {
    if (translation.status !== 'loaded' || page === null) return;
    const data = translation.data;
    const current = data.getTranslation(address.key, address.cut, address.line);
    const datum =
      typeof current === 'string' ? { text: current } : { ...current };
    if (patch.reset) {
      delete datum.x;
      delete datum.y;
      delete datum.w;
      delete datum.background;
    } else {
      Object.assign(datum, patch);
    }
    const keys = Object.keys(datum).filter((key) => key !== 'text');
    data.setTranslation(
      address.key,
      address.cut,
      address.line,
      keys.length === 0 ? datum.text : datum,
    );
    store(draftKey(page), JSON.stringify(data.getData()));
    setVersion((version) => version + 1);
  }

  function copyYaml() {
    if (translation.status !== 'loaded') return;
    navigator.clipboard.writeText(toYaml(translation.data));
  }

  function discardDraft() {
    if (page === null) return;
    try {
      localStorage.removeItem(draftKey(page));
    } catch {}
    setTranslation({ status: 'loading' });
    fetchTranslation(page).then(setTranslation);
  }

  function moveTo(next: Offset) {
    setOffset(next);
    store(OFFSET_KEY, JSON.stringify(next));
  }

  const panelTransform = overlay
    ? `translate(${offset.x + (drag?.dx ?? 0)}px, ${offset.y + (drag?.dy ?? 0)}px)`
    : drag && drag.dx !== 0
      ? `translateX(${drag.dx}px)`
      : undefined;

  useEffect(() => {
    fetchJson<Episodes>('episodes.json', NO_EPISODES).then((loaded) => {
      setEpisodes(loaded);
      if (page === null && loaded.horimiya[1])
        choosePage(loaded.horimiya[1].page);
    });
  }, []);

  useEffect(() => {
    if (page === null) return;
    setTranslation({ status: 'loading' });
    fetchTranslation(page).then(setTranslation);
  }, [page]);

  function enter(text: string) {
    setVisit(visit + 1);
    if (text.trim() === HOME_URL.href) {
      setMessage(null);
      setInput(HOME_URL.href);
      setUrl(new URL(HOME_URL.href));
      return;
    }
    const target = parseUrl(text);
    if (target === null) return;
    if (target.hostname === SITE_HOST) {
      setMessage(
        isEntrance(target)
          ? null
          : '사이트는 첫 화면부터 들어갑니다. 보고 싶은 화는 사이트 안에서 골라 주세요.',
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

  const onSite = true;
  const layout = page ? layoutFor(page) : null;
  const info = page ? infoOf(page, episodes) : null;
  const images =
    info?.images ??
    (translation.status === 'loaded'
      ? Object.keys(translation.data.getData()).filter((key) => key !== '//')
          .length
      : 0);
  const docHeight = layout && images ? documentHeight(layout, images) : null;
  const height = docHeight === null ? null : docHeight * scale;

  return (
    <div
      className={`app${onSite && panelOpen ? ' with-panel' : ''}${overlay ? ' overlay' : ''}`}
    >
      <nav>
        {onSite && !panelOpen && (
          <button
            type="button"
            className="taskbar-item"
            onClick={() => setPanelOpen(true)}
          >
            번역 창
          </button>
        )}
      </nav>
      <div className="workspace">
        <div
          className="browser"
          style={{
            marginTop: overlay
              ? panelHeaderHeight + OVERLAY_INSET
              : Math.max(0, panelHeaderHeight - browserHeaderHeight),
            marginLeft: overlay ? OVERLAY_INSET : undefined,
            marginRight: overlay ? OVERLAY_INSET : undefined,
            marginBottom: overlay ? OVERLAY_INSET : undefined,
          }}
        >
          <div className="header" ref={browserHeader}>
            <div className="title-bar">가상 브라우저</div>
            <div className="chrome">
              <AddressBar
                value={input}
                current={url.href}
                mobile={mobile}
                onChange={setInput}
                onSubmit={() => enter(input)}
                onHome={() => enter(HOME_URL.href)}
              />
              {message && <p className="message">{message}</p>}
            </div>
          </div>
          <Viewer
            key={visit}
            src={url.href}
            overlay={overlay}
            home={url.href === HOME_URL.href}
            splash={url.hostname === SITE_HOST}
            fit={fit}
            mobile={mobile}
            docHeight={docHeight}
            onScale={setScale}
          />
        </div>
        {onSite && panelOpen && (
          <aside
            className="panel"
            style={
              {
                '--scale': String(scale),
                transform: panelTransform,
              } as React.CSSProperties
            }
          >
            <div className="header" ref={panelHeader}>
              <div
                className="title-bar"
                onPointerDown={onTitlePointerDown}
                onPointerMove={onTitlePointerMove}
                onPointerUp={onTitlePointerUp}
                onPointerCancel={onTitlePointerUp}
              >
                번역 창
                <div
                  className="window-buttons"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    className="minimize"
                    aria-label="최소화"
                    onClick={() => setPanelOpen(false)}
                  />
                  <button
                    type="button"
                    className={overlay ? 'restore' : 'maximize'}
                    aria-label={overlay ? '이전 크기로' : '최대화'}
                    onClick={() => setOverlay(!overlay)}
                  />
                </div>
              </div>
              <div className="controls">
                <p className="note">
                  사이트에서 화를 고른 다음, 여기서도 같은 화를 골라 주세요.
                  그러면 번역이 나옵니다.
                </p>
                <EpisodePicker
                  episodes={episodes}
                  page={page}
                  onChange={choosePage}
                />
                {mobile && <FitPicker value={fit} onChange={chooseFit} />}
                {edit && (
                  <div className="edit-tools">
                    <button type="button" onClick={copyYaml}>
                      YAML 복사
                    </button>
                    <button type="button" onClick={discardDraft}>
                      초안 지우기
                    </button>
                  </div>
                )}
              </div>
            </div>
            {overlay && translation.status === 'loaded' && (
              <div
                className={`bubbles${edit ? ' editing' : ''}`}
                style={{
                  top: panelHeaderHeight + OVERLAY_INSET + browserHeaderHeight,
                  left: OVERLAY_INSET,
                  right: OVERLAY_INSET,
                }}
              >
                <TranslationView
                  data={translation.data}
                  layout={layout}
                  scale={scale}
                  overlay={overlay}
                  edit={edit}
                  contentLeft={mobile ? 0 : MENU_WIDTH}
                  firstImage={info?.first ?? null}
                  onEdit={applyEdit}
                />
              </div>
            )}
            {!overlay && (
              <div
                className="translations"
                style={{
                  minHeight: height ?? undefined,
                  marginTop: Math.max(
                    0,
                    browserHeaderHeight - panelHeaderHeight,
                  ),
                }}
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
                    overlay={false}
                    edit={false}
                    contentLeft={mobile ? 0 : MENU_WIDTH}
                    firstImage={info?.first ?? null}
                  />
                )}
              </div>
            )}
            {!overlay && (
              <section className="license">
                <h3>번역본 이용 조건</h3>
                <pre>{LICENSE}</pre>
              </section>
            )}
          </aside>
        )}
      </div>
      {onSite && (
        <footer className="desk">
          <button
            type="button"
            className="edit-toggle"
            aria-pressed={edit}
            onClick={() => {
              const next = !edit;
              setEdit(next);
              if (next) setOverlay(true);
            }}
          >
            {edit ? '수정 모드 끝' : '수정 모드'}
          </button>
        </footer>
      )}
    </div>
  );
}

createRoot(document.getElementById('app')!).render(<App />);
