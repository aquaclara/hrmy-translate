export type Type =
  | 'speech'
  | 'thought'
  | 'scream'
  | 'plain'
  | 'stroke'
  | 'square'
  | 'shock';
export type PropertiedDataModel = {
  type: Type;
  text: string;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  color?: string;
  'margin-left'?: string;
};
export type DataModel = string | PropertiedDataModel;
