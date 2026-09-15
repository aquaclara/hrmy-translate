import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import FileData from '../shared/translation-chunk-data';
import * as TranslationModel from '../shared/data-models/translation';
import { isComment } from '../shared/data-models/comment';
import { Layout } from './layout';

export const BUBBLE_GAP = 8;
export const DEFAULT_BUBBLE_WIDTH = 150;

export type Address = { key: string; cut: number; line: number };
export type Patch = Partial<TranslationModel.PropertiedDataModel> & {
  reset?: boolean;
};
export type Structure =
  | { op: 'insertLine'; address: Address; before: boolean }
  | { op: 'insertCut'; address: Address; before: boolean }
  | { op: 'removeLine'; address: Address }
  | { op: 'addImage'; key: string };

const TYPES: TranslationModel.Type[] = [
  'speech',
  'thought',
  'scream',
  'plain',
  'stroke',
  'square',
  'shock',
];

const WRAPS: { [key: string]: [string, string] } = {
  u: ['<strong class="stroke">', '</strong>'],
  b: ['<b>', '</b>'],
  '[': ['<small>', '</small>'],
  ']': ['<big>', '</big>'],
  ',': ['<sub>', '</sub>'],
  '.': ['<sup>', '</sup>'],
  i: ['<span class="blue">', '</span>'],
  '"': ['「', '」'],
};

function wrapSelection(
  input: HTMLTextAreaElement,
  open: string,
  close: string,
): string {
  const { value, selectionStart, selectionEnd } = input;
  return (
    value.slice(0, selectionStart) +
    open +
    value.slice(selectionStart, selectionEnd) +
    close +
    value.slice(selectionEnd)
  );
}

function insertAt(input: HTMLTextAreaElement, text: string): string {
  const { value, selectionStart, selectionEnd } = input;
  return value.slice(0, selectionStart) + text + value.slice(selectionEnd);
}

type Props = {
  data: FileData;
  layout: Layout | null;
  scale: number;
  overlay: boolean;
  edit: boolean;
  contentLeft: number;
  firstImage: number | null;
  imageCount: number;
  series: 'horimiya' | 'aco';
  onEdit?: (address: Address, patch: Patch) => void;
  onStructure?: (change: Structure) => Address | null;
  onImageTop?: (
    key: string,
    top: number,
    from: number,
    together: boolean,
  ) => void;
};

type KeyDrag = {
  kind: 'pick' | 'box' | 'resize' | 'corner' | 'rotate';
  address: Address;
  startX: number;
  startY: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotate: number;
  corner: Corner;
  centerX: number;
  centerY: number;
};

type BaselineDrag = {
  key: string;
  together: boolean;
  startY: number;
  top: number;
  current: number;
};

function keyForIndex(keys: string[], first: number | null, index: number) {
  if (first === null || keys.length === 0) return null;
  const sample = keys[0].match(/^(.*?)(\d+)(\.(?:gif|jpg|png))$/);
  if (!sample) return null;
  return (
    sample[1] +
    String(first + index).padStart(sample[2].length, '0') +
    sample[3]
  );
}

function Editor(props: {
  address: Address;
  value: string;
  style: React.CSSProperties;
  onChange: (text: string) => void;
  onKey: (
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    input: HTMLTextAreaElement,
  ) => boolean;
  onDone: () => void;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const element = input.current;
    if (element === null) return;
    element.focus();
    element.setSelectionRange(element.value.length, element.value.length);
  }, []);
  return (
    <textarea
      ref={input}
      className="line-editor"
      style={props.style}
      value={props.value}
      rows={2}
      onChange={(event) => props.onChange(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          props.onDone();
          return;
        }
        if (props.onKey(event, event.currentTarget)) event.preventDefault();
      }}
      onBlur={props.onDone}
      onPointerDown={(event) => event.stopPropagation()}
    />
  );
}

function layoutOf(layout: Layout | null): Layout | null {
  return layout;
}

function imageIndex(key: string, order: number, first: number | null): number {
  if (first === null) return order;
  const number = key.match(/(\d+)\.(?:gif|jpg|png)$/);
  if (!number) return order;
  const index = Number(number[1]) - first;
  return index >= 0 ? index : order;
}

type Corner = 'nw' | 'ne' | 'sw' | 'se';
const CORNERS: Corner[] = ['nw', 'ne', 'sw', 'se'];

type Drag = {
  address: Address;
  startX: number;
  startY: number;
  x: number;
  y: number;
  w: number;
  moved: boolean;
};

function rotateVector(x: number, y: number, degrees: number) {
  const radians = (degrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

const MIN_FONT = 0.4;

function Line(props: {
  className: string;
  style: React.CSSProperties;
  html: string;
  fixed: boolean;
  size: number;
  scale: number;
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void;
  onPointerUp: () => void;
  onDoubleClick: () => void;
}) {
  const element = useRef<HTMLParagraphElement>(null);

  useLayoutEffect(() => {
    const line = element.current;
    if (line === null) return;
    let size = props.size;
    line.style.fontSize = `${size}em`;
    if (!props.fixed) return;
    const overflows = () =>
      line.scrollHeight > line.clientHeight + 1 ||
      line.scrollWidth > line.clientWidth + 1;
    while (overflows() && size > MIN_FONT) {
      size -= 0.05;
      line.style.fontSize = `${size}em`;
    }
  }, [
    props.html,
    props.style.width,
    props.style.height,
    props.scale,
    props.fixed,
    props.size,
  ]);

  return (
    <p
      ref={element}
      className={props.className}
      style={props.style}
      onPointerDown={props.onPointerDown}
      onPointerMove={props.onPointerMove}
      onPointerUp={props.onPointerUp}
      onPointerCancel={props.onPointerUp}
      onDoubleClick={props.onDoubleClick}
      dangerouslySetInnerHTML={{ __html: props.html }}
    />
  );
}

function sameAddress(a: Address | null, b: Address): boolean {
  return a !== null && a.key === b.key && a.cut === b.cut && a.line === b.line;
}

export function TranslationView(props: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [baselineDrag, setBaselineDrag] = useState<BaselineDrag | null>(null);
  const [selected, setSelected] = useState<Address | null>(null);
  const [editing, setEditing] = useState<Address | null>(null);
  const keys = Object.keys(props.data.getData()).filter((key) => key !== '//');
  const indexOf = (key: string) =>
    imageIndex(key, keys.indexOf(key), props.firstImage);
  const missing: number[] = [];
  if (props.edit && props.overlay && layoutOf(props.layout)) {
    const used = new Set(keys.map(indexOf));
    for (let i = 0; i < props.imageCount; i++)
      if (!used.has(i)) missing.push(i);
  }

  function textOf(address: Address): string {
    const datum = props.data.getTranslation(
      address.key,
      address.cut,
      address.line,
    );
    return typeof datum === 'string' ? datum : datum.text;
  }

  function handleKey(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    input: HTMLTextAreaElement,
    address: Address,
  ): boolean {
    const mod = event.ctrlKey || event.metaKey;
    if (event.key === 'Enter' && event.altKey) {
      props.onEdit?.(address, { text: insertAt(input, '<br>') });
      return true;
    }
    if (event.key === 'Enter') {
      const next = props.onStructure?.(
        mod
          ? { op: 'insertCut', address, before: event.shiftKey }
          : { op: 'insertLine', address, before: event.shiftKey },
      );
      if (next) setEditing(next);
      return true;
    }
    if (event.key === 'Backspace' && input.value === '') {
      const next = props.onStructure?.({ op: 'removeLine', address });
      setEditing(next ?? null);
      return true;
    }
    if (mod && /^[1-7]$/.test(event.key)) {
      props.onEdit?.(address, { type: TYPES[Number(event.key) - 1] });
      return true;
    }
    if (event.altKey && event.key === '.') {
      props.onEdit?.(address, { text: insertAt(input, '...') });
      return true;
    }
    if (mod && WRAPS[event.key]) {
      const [open, close] = WRAPS[event.key];
      props.onEdit?.(address, { text: wrapSelection(input, open, close) });
      return true;
    }
    return false;
  }
  const layout = props.layout;
  const positioned = layout !== null;
  const imageLeft = layout ? props.contentLeft + layout.left : 0;

  function startDrag(
    event: React.PointerEvent<HTMLElement>,
    address: Address,
    line: Partial<TranslationModel.PropertiedDataModel>,
    imageTop: number,
  ) {
    if (!props.edit) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const wrapper = event.currentTarget.parentElement!;
    const bubble = wrapper.getBoundingClientRect();
    const box = root.current!.getBoundingClientRect();
    setDrag({
      address,
      startX: event.clientX,
      startY: event.clientY,
      x: line.x ?? (bubble.left - box.left) / props.scale - imageLeft,
      y: line.y ?? (bubble.top - box.top) / props.scale - imageTop,
      w: wrapper.offsetWidth / props.scale,
      moved: false,
    });
  }

  function moveDrag(event: React.PointerEvent<HTMLElement>) {
    if (drag === null) return;
    const dx = (event.clientX - drag.startX) / props.scale;
    const dy = (event.clientY - drag.startY) / props.scale;
    if (Math.abs(dx) + Math.abs(dy) < 2 && !drag.moved) return;
    drag.moved = true;
    props.onEdit?.(drag.address, {
      x: Math.round(drag.x + dx),
      y: Math.round(drag.y + dy),
      w: Math.round(drag.w),
    });
  }

  function startBaselineDrag(
    event: React.PointerEvent<HTMLElement>,
    key: string,
    top: number,
    together: boolean,
  ) {
    if (!props.edit) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setBaselineDrag({
      key,
      together,
      startY: event.clientY,
      top,
      current: top,
    });
  }

  function moveBaselineDrag(event: React.PointerEvent<HTMLElement>) {
    if (baselineDrag === null) return;
    const top = Math.round(
      baselineDrag.top + (event.clientY - baselineDrag.startY) / props.scale,
    );
    if (top === baselineDrag.current) return;
    props.onImageTop?.(
      baselineDrag.key,
      top,
      baselineDrag.current,
      baselineDrag.together,
    );
    baselineDrag.current = top;
  }

  function endBaselineDrag() {
    setBaselineDrag(null);
  }

  function endDrag() {
    if (drag === null) return;
    if (!drag.moved) {
      setSelected(sameAddress(selected, drag.address) ? null : drag.address);
    }
    setDrag(null);
  }

  function imageTopOf(key: string): number {
    if (!layout) return 0;
    return (
      props.data.getImageTop(key) ?? layout.top + indexOf(key) * layout.pitch
    );
  }

  function boxOf(address: Address, wrapper?: HTMLElement) {
    const datum = props.data.getTranslation(
      address.key,
      address.cut,
      address.line,
    );
    const line: Partial<TranslationModel.PropertiedDataModel> =
      typeof datum === 'string' ? {} : datum;
    const element =
      wrapper ?? root.current?.querySelector<HTMLElement>('.bubble.selected');
    const bubble = element?.getBoundingClientRect();
    const box = root.current?.getBoundingClientRect();
    return {
      x:
        line.x ??
        (bubble && box
          ? (bubble.left - box.left) / props.scale - imageLeft
          : 0),
      y:
        line.y ??
        (bubble && box
          ? (bubble.top - box.top) / props.scale - imageTopOf(address.key)
          : 0),
      w: line.w ?? (element ? element.offsetWidth / props.scale : 0),
      h: line.h ?? (element ? element.offsetHeight / props.scale : 0),
      rotate: line.rotate ?? 0,
    };
  }

  function toContent(clientX: number, clientY: number, key: string) {
    const box = root.current!.getBoundingClientRect();
    return {
      x: (clientX - box.left) / props.scale - imageLeft,
      y: (clientY - box.top) / props.scale - imageTopOf(key),
    };
  }

  const addresses: Address[] = [];
  for (const key of keys) {
    props.data.getCutTranslations(key).forEach((cut, cutIndex) => {
      cut.forEach((line, lineIndex) => {
        const text = typeof line === 'string' ? line : line.text;
        if (!isComment(text) && text) {
          addresses.push({ key, cut: cutIndex, line: lineIndex });
        }
      });
    });
  }

  const pointer = useRef({ x: 0, y: 0 });
  const keyDrag = useRef<KeyDrag | null>(null);
  const [keyDragging, setKeyDragging] = useState(false);
  const latest = useRef({ selected, editing, addresses, boxOf, toContent });
  latest.current = { selected, editing, addresses, boxOf, toContent };

  function startKeyDrag(
    kind: KeyDrag['kind'],
    address: Address,
    wrapper?: HTMLElement,
    corner: Corner = 'se',
  ) {
    const box = latest.current.boxOf(address, wrapper);
    const start = pointer.current;
    const bubble = wrapper?.getBoundingClientRect();
    if (kind === 'box') {
      const origin = latest.current.toContent(start.x, start.y, address.key);
      box.x = Math.round(origin.x);
      box.y = Math.round(origin.y);
      box.w = 1;
      box.h = 1;
      props.onEdit?.(address, { x: box.x, y: box.y, w: 1, h: 1 });
    }
    keyDrag.current = {
      kind,
      address,
      startX: start.x,
      startY: start.y,
      ...box,
      corner,
      centerX: bubble ? bubble.left + bubble.width / 2 : 0,
      centerY: bubble ? bubble.top + bubble.height / 2 : 0,
    };
    setKeyDragging(true);
  }

  function endKeyDrag() {
    keyDrag.current = null;
    setKeyDragging(false);
  }

  function cancelKeyDrag() {
    const current = keyDrag.current;
    if (current === null) return;
    props.onEdit?.(current.address, {
      x: current.x,
      y: current.y,
      w: current.w,
      h: current.h,
      rotate: current.rotate,
    });
    endKeyDrag();
  }

  function grabHandle(
    event: React.PointerEvent<HTMLElement>,
    address: Address,
    kind: 'corner' | 'rotate',
    corner: Corner = 'se',
  ) {
    if (!props.edit) return;
    event.preventDefault();
    event.stopPropagation();
    if (keyDrag.current !== null) return;
    pointer.current = { x: event.clientX, y: event.clientY };
    setSelected(address);
    startKeyDrag(kind, address, event.currentTarget.parentElement!, corner);
  }

  useEffect(() => {
    if (!props.edit) return;
    const isTyping = () => {
      const tag = document.activeElement?.tagName;
      return (
        latest.current.editing !== null ||
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT'
      );
    };
    const onPointerMove = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
      const current = keyDrag.current;
      if (current === null) return;
      const dx = (event.clientX - current.startX) / props.scale;
      const dy = (event.clientY - current.startY) / props.scale;
      if (current.kind === 'pick') {
        props.onEdit?.(current.address, {
          x: Math.round(current.x + dx),
          y: Math.round(current.y + dy),
          w: Math.round(current.w),
        });
      } else if (current.kind === 'resize') {
        props.onEdit?.(current.address, {
          w: Math.max(1, Math.round(current.w + dx)),
          h: Math.max(1, Math.round(current.h + dy)),
        });
      } else if (current.kind === 'rotate') {
        const angle =
          (Math.atan2(
            event.clientY - current.centerY,
            event.clientX - current.centerX,
          ) *
            180) /
            Math.PI +
          90;
        props.onEdit?.(current.address, {
          rotate: Math.round(((angle + 180) % 360) - 180),
        });
      } else if (current.kind === 'corner') {
        const west = current.corner === 'nw' || current.corner === 'sw';
        const north = current.corner === 'nw' || current.corner === 'ne';
        const local = rotateVector(dx, dy, -current.rotate);
        const w = Math.max(
          1,
          Math.round(west ? current.w - local.x : current.w + local.x),
        );
        const h = Math.max(
          1,
          Math.round(north ? current.h - local.y : current.h + local.y),
        );
        const shift = rotateVector(
          ((west ? -1 : 1) * (w - current.w)) / 2,
          ((north ? -1 : 1) * (h - current.h)) / 2,
          current.rotate,
        );
        props.onEdit?.(current.address, {
          x: Math.round(current.x + current.w / 2 + shift.x - w / 2),
          y: Math.round(current.y + current.h / 2 + shift.y - h / 2),
          w,
          h,
        });
      } else {
        const point = latest.current.toContent(
          event.clientX,
          event.clientY,
          current.address.key,
        );
        props.onEdit?.(current.address, {
          x: Math.round(Math.min(current.x, point.x)),
          y: Math.round(Math.min(current.y, point.y)),
          w: Math.max(1, Math.round(Math.abs(point.x - current.x))),
          h: Math.max(1, Math.round(Math.abs(point.y - current.y))),
        });
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      const kind = keyDrag.current?.kind;
      if (kind !== 'corner' && kind !== 'rotate') return;
      event.preventDefault();
      event.stopPropagation();
      endKeyDrag();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTyping() || event.ctrlKey || event.metaKey) return;
      const { selected, addresses } = latest.current;
      if (event.key === 'Tab') {
        if (addresses.length === 0) return;
        event.preventDefault();
        const at = selected
          ? addresses.findIndex((address) => sameAddress(selected, address))
          : -1;
        const step = event.shiftKey ? -1 : 1;
        setSelected(
          addresses[(at + step + addresses.length) % addresses.length],
        );
        return;
      }
      if (event.key === 'Escape' && keyDrag.current !== null) {
        event.preventDefault();
        cancelKeyDrag();
        return;
      }
      if (selected === null) return;
      const kinds: { [key: string]: KeyDrag['kind'] } = {
        '1': 'pick',
        '2': 'box',
        '3': 'resize',
      };
      if (kinds[event.key]) {
        event.preventDefault();
        if (event.repeat || keyDrag.current !== null) return;
        startKeyDrag(kinds[event.key], selected);
        return;
      }
      if (event.key === '[' || event.key === ']') {
        event.preventDefault();
        const box = latest.current.boxOf(selected);
        const turn = (event.key === ']' ? 5 : -5) * (event.shiftKey ? 3 : 1);
        props.onEdit?.(selected, {
          rotate: Math.round(
            ((((box.rotate + turn + 180) % 360) + 360) % 360) - 180,
          ),
        });
        return;
      }
      const arrows: { [key: string]: [number, number] } = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const arrow = arrows[event.key];
      if (!arrow) return;
      event.preventDefault();
      const amount = event.shiftKey ? 10 : 1;
      const box = latest.current.boxOf(selected);
      if (event.altKey) {
        props.onEdit?.(selected, {
          w: Math.max(1, Math.round(box.w + arrow[0] * amount)),
          h: Math.max(1, Math.round(box.h + arrow[1] * amount)),
        });
      } else {
        props.onEdit?.(selected, {
          x: Math.round(box.x + arrow[0] * amount),
          y: Math.round(box.y + arrow[1] * amount),
          w: Math.round(box.w),
        });
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const current = keyDrag.current;
      if (current === null) return;
      if (
        (event.key === '1' && current.kind === 'pick') ||
        (event.key === '2' && current.kind === 'box') ||
        (event.key === '3' && current.kind === 'resize')
      ) {
        endKeyDrag();
      }
    };
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerdown', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
    return () => {
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerdown', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    };
  }, [props.edit, props.scale]);

  useEffect(() => {
    if (!props.edit) endKeyDrag();
  }, [props.edit]);

  return (
    <div
      ref={root}
      className={`translation-view ${props.series}${positioned ? ' positioned' : ''}${props.edit ? ' editing' : ''}`}
    >
      {keys.map((key, order) => {
        const cuts = props.data.getCutTranslations(key);
        const index = imageIndex(key, order, props.firstImage);
        const imageTop = layout
          ? (props.data.getImageTop(key) ?? layout.top + index * layout.pitch)
          : 0;
        return (
          <section key={key} className="image">
            {props.edit && positioned && props.overlay && (
              <div
                className="baseline"
                style={{
                  left: imageLeft * props.scale,
                  top: imageTop * props.scale,
                  width: layout.width * props.scale,
                }}
                onPointerDown={(event) =>
                  startBaselineDrag(event, key, imageTop, false)
                }
                onPointerMove={moveBaselineDrag}
                onPointerUp={endBaselineDrag}
                onPointerCancel={endBaselineDrag}
              >
                <span
                  className="tab"
                  title="대사와 함께 옮기기"
                  onPointerDown={(event) =>
                    startBaselineDrag(event, key, imageTop, true)
                  }
                  onPointerMove={moveBaselineDrag}
                  onPointerUp={endBaselineDrag}
                  onPointerCancel={endBaselineDrag}
                >
                  {key.replace(/^.*\//, '')} {imageTop}
                </span>
              </div>
            )}
            {cuts.map((cut, cutIndex) => {
              const cutTop = layout
                ? imageTop + (layout.height / cuts.length) * cutIndex
                : 0;
              const cutLeft = props.overlay
                ? (imageLeft +
                    layout!.width -
                    DEFAULT_BUBBLE_WIDTH -
                    BUBBLE_GAP) *
                  props.scale
                : 0;
              const style: React.CSSProperties = {};
              if (layout) {
                style.top = cutTop * props.scale;
                if (props.overlay) {
                  style.left = cutLeft;
                  style.width = DEFAULT_BUBBLE_WIDTH * props.scale;
                }
              }
              return (
                <div key={cutIndex} className="cut" style={style}>
                  {cut.map((line, lineIndex) => {
                    const text = typeof line === 'string' ? line : line.text;
                    const address = { key, cut: cutIndex, line: lineIndex };
                    if (isComment(text)) return null;
                    if (!text && !sameAddress(editing, address)) return null;
                    const props_: Partial<TranslationModel.PropertiedDataModel> =
                      typeof line === 'string' ? {} : line;
                    const type = props_.type || 'speech';
                    const placed =
                      props.overlay &&
                      layout !== null &&
                      props_.x !== undefined &&
                      props_.y !== undefined;
                    const lineStyle: React.CSSProperties = placed
                      ? {
                          position: 'absolute',
                          left: (imageLeft + props_.x!) * props.scale - cutLeft,
                          top:
                            (imageTop + props_.y!) * props.scale -
                            cutTop * props.scale,
                          width:
                            props_.w !== undefined
                              ? props_.w * props.scale
                              : undefined,
                          height:
                            props_.h !== undefined
                              ? props_.h * props.scale
                              : undefined,
                        }
                      : {};
                    if (props_.background !== undefined) {
                      lineStyle.backgroundColor = props_.background;
                    }
                    const radius =
                      props_.radius !== undefined
                        ? props_.radius * props.scale
                        : undefined;
                    const rotation =
                      props_.rotate !== undefined
                        ? `rotate(${props_.rotate}deg)`
                        : undefined;
                    const isSelected = sameAddress(selected, address);
                    const isEditing = sameAddress(editing, address);
                    return (
                      <div
                        key={lineIndex}
                        className={`bubble${placed ? ' placed' : ''}${isSelected ? ' selected' : ''}${(drag !== null && sameAddress(drag.address, address)) || (keyDragging && keyDrag.current !== null && sameAddress(keyDrag.current.address, address)) ? ' dragging' : ''}`}
                        style={
                          placed
                            ? {
                                ...lineStyle,
                                backgroundColor: undefined,
                                transform: rotation,
                              }
                            : undefined
                        }
                      >
                        {isEditing ? (
                          <Editor
                            address={address}
                            value={text}
                            style={{
                              width: lineStyle.width,
                              height: lineStyle.height,
                            }}
                            onChange={(value) =>
                              props.onEdit?.(address, { text: value })
                            }
                            onKey={(event, input) =>
                              handleKey(event, input, address)
                            }
                            onDone={() => setEditing(null)}
                          />
                        ) : (
                          <Line
                            className={`line ${type}${placed && props_.h !== undefined ? ' fixed' : ''}${props_.vertical ? ' vertical' : ''}`}
                            style={
                              placed
                                ? {
                                    backgroundColor: lineStyle.backgroundColor,
                                    height: lineStyle.height,
                                    borderRadius: radius,
                                  }
                                : {
                                    ...lineStyle,
                                    transform: rotation,
                                    borderRadius: radius,
                                  }
                            }
                            html={text}
                            fixed={placed && props_.h !== undefined}
                            size={props_.size ?? 1}
                            scale={props.scale}
                            onPointerDown={(event) =>
                              startDrag(event, address, props_, imageTop)
                            }
                            onPointerMove={moveDrag}
                            onPointerUp={endDrag}
                            onDoubleClick={() =>
                              props.edit && setEditing(address)
                            }
                          />
                        )}
                        {props.edit && (
                          <span
                            className="rotor"
                            onPointerDown={(event) =>
                              grabHandle(event, address, 'rotate')
                            }
                          />
                        )}
                        {props.edit &&
                          CORNERS.map((corner) => (
                            <span
                              key={corner}
                              className={`grip ${corner}`}
                              onPointerDown={(event) =>
                                grabHandle(event, address, 'corner', corner)
                              }
                            />
                          ))}
                        {props.edit && isSelected && (
                          <span
                            className="bubble-tools"
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <input
                              type="color"
                              aria-label="배경색"
                              value={props_.background ?? '#ffffff'}
                              onChange={(event) =>
                                props.onEdit?.(address, {
                                  background: event.target.value,
                                })
                              }
                            />
                            <button
                              type="button"
                              onClick={() =>
                                props.onEdit?.(address, {
                                  background: 'transparent',
                                })
                              }
                            >
                              배경 없음
                            </button>
                            <button
                              type="button"
                              aria-pressed={props_.vertical === true}
                              onClick={() =>
                                props.onEdit?.(address, {
                                  vertical: !props_.vertical,
                                })
                              }
                            >
                              세로
                            </button>
                            <span className="size">{props_.rotate ?? 0}°</span>
                            <label className="radius">
                              모서리
                              <input
                                type="range"
                                min={0}
                                max={80}
                                value={props_.radius ?? 80}
                                onChange={(event) =>
                                  props.onEdit?.(address, {
                                    radius: Number(event.target.value),
                                  })
                                }
                              />
                            </label>
                            <button
                              type="button"
                              aria-label="글자 작게"
                              onClick={() =>
                                props.onEdit?.(address, {
                                  size:
                                    Math.round(
                                      ((props_.size ?? 1) - 0.1) * 10,
                                    ) / 10,
                                })
                              }
                            >
                              A−
                            </button>
                            <span className="size">
                              {Math.round((props_.size ?? 1) * 100)}%
                            </span>
                            <button
                              type="button"
                              aria-label="글자 크게"
                              onClick={() =>
                                props.onEdit?.(address, {
                                  size:
                                    Math.round(
                                      ((props_.size ?? 1) + 0.1) * 10,
                                    ) / 10,
                                })
                              }
                            >
                              A+
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                props.onEdit?.(address, { reset: true });
                                setSelected(null);
                              }}
                            >
                              초기화
                            </button>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </section>
        );
      })}
      {missing.map((index) => {
        const key = keyForIndex(keys, props.firstImage, index);
        if (key === null || props.layout === null) return null;
        const layout = props.layout;
        return (
          <button
            key={index}
            type="button"
            className="add-image"
            style={{
              left: (imageLeft + layout.width - BUBBLE_GAP) * props.scale,
              top:
                (layout.top + index * layout.pitch + BUBBLE_GAP) * props.scale,
            }}
            onClick={() => {
              const next = props.onStructure?.({ op: 'addImage', key });
              if (next) setEditing(next);
            }}
          >
            +
          </button>
        );
      })}
    </div>
  );
}
