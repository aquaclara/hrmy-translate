import * as Translation from './translation';

export type DataModel = string;
export function isComment(target: Translation.DataModel): boolean {
  return typeof target === 'string' && target.startsWith('//');
}
