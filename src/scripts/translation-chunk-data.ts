import Mask from './data-models/mask';
import * as Image from './data-models/translation-chucks/image';
import Cut from './data-models/translation-chucks/cut';
import * as Translation from './data-models/translation';
import FileDataModel from './data-models/translation-chucks/file';

export default class TranslationChuckData {
  data: FileDataModel;

  constructor(yaml?: FileDataModel) {
    if (!yaml) {
      this.data = {};
    } else {
      this.data = yaml;
    }
  }

  // FileData functions
  getData(): FileDataModel {
    return this.data;
  }

  // ImageData functions
  getImageTranslation(key: string): Image.DataModel | undefined | null {
    return this.data[key];
  }

  existImageTranslation(key: string): boolean {
    const images = this.getImageTranslation(key);
    if (images === undefined || images === null) {
      return false;
    }
    if (Array.isArray(images)) {
      return images.length !== 0;
    } else {
      return Array.isArray(images.text) && images.text.length !== 0;
    }
  }

  createEmptyImageForKey(key: string) {
    this.data[key] = [['']];
  }

  // Mask functions

  getMaskDataForKey(key: string): Mask[] {
    if (Array.isArray(this.data[key])) {
      return [];
    }
    return (this.data[key] as Image.PropertiedDataModel).masks;
  }

  setMaskDataForKey(key: string, value: Mask[]): void {
    if (Array.isArray(this.data[key])) {
      (this.data[key] as Image.PropertiedDataModel) = {
        masks: value,
        text: this.data[key] as Cut[]
      };
    } else {
      (this.data[key] as Image.PropertiedDataModel).masks = value;
    }
  }

  // CutData functions
  getCutTranslations(key: string): Cut[] {
    const data = this.getImageTranslation(key);

    if (Array.isArray(data)) {
      return data;
    } else if (data) {
      return data.text;
    } else {
      return [];
    }
  }

  // TranslationData functions
  getTranslation(
    imageId: string,
    cutIndex: number,
    tlsIndex: number
  ): Translation.DataModel {
    return this.getCutTranslations(imageId)[cutIndex][tlsIndex];
  }
  getTranslationString(
    imageId: string,
    cutIndex: number,
    tlsIndex: number
  ): Translation.DataModel {
    const tr = this.getCutTranslations(imageId)[cutIndex][tlsIndex];
    if (typeof tr == 'string') {
      return tr;
    }
    return tr.text;
  }

  setTranslation(
    imageId: string,
    cutIndex: number,
    tlsIndex: number,
    datum: Translation.DataModel
  ): void {
    const image = this.data[imageId];
    if (Array.isArray(image)) {
      (this.data[imageId] as Cut[])[cutIndex][tlsIndex] = datum;
    } else {
      (this.data[imageId] as Image.PropertiedDataModel).text[cutIndex][
        tlsIndex
      ] = datum;
    }
  }

  moveTranslation(
    imageId: string,
    cutIndex: number,
    tlsIndex: number,
    x: number,
    y: number
  ) {
    let translation = this.getTranslation(imageId, cutIndex, tlsIndex);
    if (typeof translation === 'string') {
      translation = {
        text: translation,
        x: x,
        y: y
      };
    } else {
      translation.text;
      translation.x = translation.x ? translation.x + x : x;
      translation.y = translation.y ? translation.y + y : y;
    }
    this.setTranslation(imageId, cutIndex, tlsIndex, translation);
  }

  scaleTranslation(
    imageId: string,
    cutIndex: number,
    tlsIndex: number,
    x: number
  ) {
    let translation = this.getTranslation(imageId, cutIndex, tlsIndex);
    if (typeof translation === 'string') {
      translation = {
        text: translation,
        w: 50
      };
    } else {
      translation.text;
      translation.w = translation.w ? translation.w + x : x;
    }
    this.setTranslation(imageId, cutIndex, tlsIndex, translation);
  }
}
