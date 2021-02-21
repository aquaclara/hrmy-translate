export type translationType =
  | 'speech'
  | 'thought'
  | 'scream'
  | 'plain'
  | 'stroke'
  | 'square'
  | 'shock';
export type propertiedTranslation = {
  type: translationType;
  text: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  color?: string;
  'margin-left'?: string;
};
export type translation = string | propertiedTranslation;
export type comment = string;
export type cutTranslation = Array<translation | comment>;
export type shape = {
  func: 'ellipse' | 'circle' | 'rect';
  param: number[];
  color?: string;
};
export type canvas = shape[];
export type propertiedImageTranslation = {
  canvas: canvas;
  text: cutTranslation[];
};
export type imageTranslation = cutTranslation[] | propertiedImageTranslation;
export type translationFile = {
  [key: string]: imageTranslation;
};

export class Translation {
  static isComment(target: translation): boolean {
    return typeof target === 'string' && target.startsWith('//');
  }
}
