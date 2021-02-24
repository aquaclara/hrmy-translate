export type Type =
  | 'speech'
  | 'thought'
  | 'scream'
  | 'plain'
  | 'stroke'
  | 'square'
  | 'shock';
export type PropertiedDataModel = {
  text: string;
  type?: Type;
  x?: number;
  y?: number;
  w?: number;
  color?: string;
  'margin-left'?: string;
};
export type DataModel = string | PropertiedDataModel;
