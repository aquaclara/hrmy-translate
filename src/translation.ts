export type propertiedTranslation = {
  text: string;
  color: string;
  'margin-left': string;
};
export type translation = string | propertiedTranslation;
export type comment = string;
export type cutTranslation = Array<translation | comment>;
export type imageTranslation = cutTranslation[];
export type translationFile = {
  [key: string]: imageTranslation;
};


export class Translation {
  static isComment(target: translation): boolean {
    return typeof target === 'string' && target.startsWith('//');
  }
}
