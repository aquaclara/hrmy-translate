export type Layout = {
  top: number;
  left: number;
  width: number;
  pitch: number;
  height: number;
};

const LAYOUTS: { pattern: RegExp; layout: Layout }[] = [
  {
    pattern: /^hm\d+_\d+\/pict_com_\d+\.html$/,
    layout: { top: 71, left: 4, width: 350, pitch: 1021, height: 1009 },
  },
  {
    pattern: /^aco\/\d+\/c\.html$/,
    layout: { top: 34, left: 8, width: 420, pitch: 1173, height: 1173 },
  },
];

const TAIL = 500;

export function layoutFor(page: string): Layout | null {
  return LAYOUTS.find((entry) => entry.pattern.test(page))?.layout ?? null;
}

export function documentHeight(layout: Layout, images: number): number {
  return layout.top + images * layout.pitch + TAIL;
}
