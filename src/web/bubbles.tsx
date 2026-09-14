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

type Drag = {
  address: Address;
  mode: 'move' | 'resize' | 'rotate';
  startX: number;
  startY: number;
  x: number;
  y: number;
  w: number;
  h: number;
  centerX: number;
  centerY: number;
  moved: boolean;
};

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

  function toContent(clientX: number, clientY: number, imageTop: number) {
    const box = root.current!.getBoundingClientRect();
    return {
      x: (clientX - box.left) / props.scale - imageLeft,
      y: (clientY - box.top) / props.scale - imageTop,
    };
  }

  function startDrag(
    event: React.PointerEvent<HTMLElement>,
    address: Address,
    mode: Drag['mode'],
    imageTop: number,
  ) {
    if (!props.edit) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const bubble = (
      mode === 'move' ? event.currentTarget : event.currentTarget.parentElement!
    ).getBoundingClientRect();
    const box =
      mode === 'move'
        ? bubble
        : event.currentTarget.parentElement!.getBoundingClientRect();
    const origin = toContent(bubble.left, bubble.top, imageTop);
    setDrag({
      address,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      x: origin.x,
      y: origin.y,
      w: bubble.width / props.scale,
      h: bubble.height / props.scale,
      centerX: box.left + box.width / 2,
      centerY: box.top + box.height / 2,
      moved: false,
    });
  }

  function moveDrag(event: React.PointerEvent<HTMLElement>) {
    if (drag === null) return;
    const dx = (event.clientX - drag.startX) / props.scale;
    const dy = (event.clientY - drag.startY) / props.scale;
    if (Math.abs(dx) + Math.abs(dy) < 2 && !drag.moved) return;
    drag.moved = true;
    if (drag.mode === 'rotate') {
      const angle =
        (Math.atan2(
          event.clientY - drag.centerY,
          event.clientX - drag.centerX,
        ) *
          180) /
          Math.PI +
        90;
      props.onEdit?.(drag.address, {
        rotate: Math.round(((angle + 180) % 360) - 180),
      });
      return;
    }
    if (drag.mode === 'move') {
      props.onEdit?.(drag.address, {
        x: Math.round(drag.x + dx),
        y: Math.round(drag.y + dy),
        w: Math.round(drag.w),
      });
    } else {
      props.onEdit?.(drag.address, {
        x: Math.round(drag.x),
        y: Math.round(drag.y),
        w: Math.max(1, Math.round(drag.w + dx)),
        h: Math.max(1, Math.round(drag.h + dy)),
      });
    }
  }

  function endDrag() {
    if (drag === null) return;
    if (!drag.moved && drag.mode === 'move') {
      setSelected(sameAddress(selected, drag.address) ? null : drag.address);
    }
    setDrag(null);
  }

  return (
    <div
      ref={root}
      className={`translation-view ${props.series}${positioned ? ' positioned' : ''}${props.edit ? ' editing' : ''}`}
    >
      {keys.map((key, order) => {
        const cuts = props.data.getCutTranslations(key);
        const index = imageIndex(key, order, props.firstImage);
        const imageTop = layout ? layout.top + index * layout.pitch : 0;
        return (
          <section key={key} className="image">
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
                        className={`bubble${placed ? ' placed' : ''}${isSelected ? ' selected' : ''}${drag !== null && sameAddress(drag.address, address) ? ' dragging' : ''}`}
                        style={
                          placed
                            ? { ...lineStyle, backgroundColor: undefined }
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
                                    transform: rotation,
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
                              startDrag(event, address, 'move', imageTop)
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
                              startDrag(event, address, 'rotate', imageTop)
                            }
                            onPointerMove={moveDrag}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                          />
                        )}
                        {props.edit && (
                          <span
                            className="grip"
                            onPointerDown={(event) =>
                              startDrag(event, address, 'resize', imageTop)
                            }
                            onPointerMove={moveDrag}
                            onPointerUp={endDrag}
                            onPointerCancel={endDrag}
                          />
                        )}
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
