import React, { useRef, useState } from 'react';
import FileData from '../shared/translation-chunk-data';
import * as TranslationModel from '../shared/data-models/translation';
import { isComment } from '../shared/data-models/comment';
import { Layout } from './layout';

export const BUBBLE_GAP = 8;
export const BUBBLE_COLUMN = 220;

export type Address = { key: string; cut: number; line: number };
export type Patch = Partial<TranslationModel.PropertiedDataModel> & {
  reset?: boolean;
};

type Props = {
  data: FileData;
  layout: Layout | null;
  scale: number;
  overlay: boolean;
  edit: boolean;
  contentLeft: number;
  onEdit?: (address: Address, patch: Patch) => void;
};

type Drag = {
  address: Address;
  mode: 'move' | 'resize';
  startX: number;
  startY: number;
  x: number;
  y: number;
  w: number;
  moved: boolean;
};

function sameAddress(a: Address | null, b: Address): boolean {
  return a !== null && a.key === b.key && a.cut === b.cut && a.line === b.line;
}

export function TranslationView(props: Props) {
  const root = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [selected, setSelected] = useState<Address | null>(null);
  const keys = Object.keys(props.data.getData()).filter((key) => key !== '//');
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
    const origin = toContent(bubble.left, bubble.top, imageTop);
    setDrag({
      address,
      mode,
      startX: event.clientX,
      startY: event.clientY,
      x: origin.x,
      y: origin.y,
      w: bubble.width / props.scale,
      moved: false,
    });
  }

  function moveDrag(event: React.PointerEvent<HTMLElement>) {
    if (drag === null) return;
    const dx = (event.clientX - drag.startX) / props.scale;
    const dy = (event.clientY - drag.startY) / props.scale;
    if (Math.abs(dx) + Math.abs(dy) < 2 && !drag.moved) return;
    drag.moved = true;
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
        w: Math.max(40, Math.round(drag.w + dx)),
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
      className={`translation-view${positioned ? ' positioned' : ''}${props.edit ? ' editing' : ''}`}
    >
      {keys.map((key, imageIndex) => {
        const cuts = props.data.getCutTranslations(key);
        const imageTop = layout ? layout.top + imageIndex * layout.pitch : 0;
        return (
          <section key={key} className="image">
            {cuts.map((cut, cutIndex) => {
              const cutTop = layout
                ? imageTop + (layout.height / cuts.length) * cutIndex
                : 0;
              const cutLeft = props.overlay
                ? (imageLeft + layout!.width + BUBBLE_GAP) * props.scale
                : 0;
              const style: React.CSSProperties = {};
              if (layout) {
                style.top = cutTop * props.scale;
                if (props.overlay) {
                  style.left = cutLeft;
                  style.width = (BUBBLE_COLUMN - BUBBLE_GAP * 2) * props.scale;
                }
              }
              return (
                <div key={cutIndex} className="cut" style={style}>
                  {cut.map((line, lineIndex) => {
                    const text = typeof line === 'string' ? line : line.text;
                    if (!text || isComment(text)) return null;
                    const address = { key, cut: cutIndex, line: lineIndex };
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
                        }
                      : {};
                    if (props_.background !== undefined) {
                      lineStyle.backgroundColor = props_.background;
                    }
                    const isSelected = sameAddress(selected, address);
                    return (
                      <div
                        key={lineIndex}
                        className={`bubble${placed ? ' placed' : ''}${isSelected ? ' selected' : ''}`}
                        style={placed ? lineStyle : undefined}
                      >
                        <p
                          className={`line ${type}`}
                          style={
                            placed
                              ? { backgroundColor: lineStyle.backgroundColor }
                              : lineStyle
                          }
                          onPointerDown={(event) =>
                            startDrag(event, address, 'move', imageTop)
                          }
                          onPointerMove={moveDrag}
                          onPointerUp={endDrag}
                          onPointerCancel={endDrag}
                          dangerouslySetInnerHTML={{ __html: text }}
                        />
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
    </div>
  );
}
