import util from '../dom-util';
import { captionOption, Caption } from './caption';
import {
  translation as datum,
  propertiedTranslation as propertiedDatum,
  translationType,
  Translation as TranslationUtil
} from '../translation-data-model';

export type address = [string, number, number];

export interface translationOption extends captionOption {
  datum: datum;
  address: address;
  type: translationType;
  focus: boolean;
  overwriteMode: boolean;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  editableMode?: boolean;
  oninput: (ev: Event) => any;
  onShortcut: (
    ctrl: boolean,
    shift: boolean,
    key: string,
    text: string
  ) => boolean;
  changeDatum: (datum: datum) => any;
}

export class Translation extends Caption {
  opt: translationOption;
  types: translationType[];
  static defaultFontSize = 24;

  constructor(opt: translationOption) {
    opt.tag = opt.editableMode && !opt.overwriteMode ? 'input' : 'p';
    opt.class = opt.class || [];
    opt.class.push('translation', opt.type);
    if (opt.overwriteMode) {
      opt.class.push('overwrite', opt.type);
    }
    super(opt);
    this.opt = opt;
    this.types = [
      'speech',
      'thought',
      'scream',
      'plain',
      'stroke',
      'square',
      'shock'
    ];
  }

  createElement(): HTMLElement {
    const opt: translationOption = this.opt;

    if (opt.overwriteMode) {
      const $element: HTMLInputElement = super.createElement() as HTMLInputElement;
      $element.style.left = opt.x + 'px';
      $element.style.top = opt.y + 'px';
      $element.style.width = opt.width + 'px';
      $element.style.height = opt.height + 'px';
      $element.style.fontSize =
        (opt.fontSize ? opt.fontSize : Translation.defaultFontSize) + 'px';
      return $element;
    } else if (opt.editableMode) {
      const $element: HTMLInputElement = super.createElement() as HTMLInputElement;
      $element.type = 'text';
      $element.defaultValue = opt.message;
      $element.size = Translation.getPreferSize(opt.message.length);
      $element.oninput = opt.oninput;
      $element.onkeydown = this._onShortcut.bind(this);
      return $element;
    }
    return super.createElement();
  }

  render(): void {
    const opt: translationOption = this.opt;
    if (opt.overwriteMode && TranslationUtil.isComment(opt.message)) {
      return;
    }
    if (opt.overwriteMode && (!opt.x || !opt.y)) {
      return;
    }
    super.render();

    if (this.opt.editableMode && this.opt.focus) {
      console.log('focus');
      const $element = this.$element as HTMLInputElement;
      const focus = () => {
        $element.focus();
        $element.selectionStart = $element.selectionEnd = $element.value.length;
      };
      focus();
      setTimeout(focus, 100);
    }
  }

  _onShortcut(ev: KeyboardEvent) {
    if (!(ev.target instanceof HTMLInputElement)) {
      return;
    }

    const target = ev.target as HTMLInputElement;
    if (this.opt.onShortcut(ev.ctrlKey, ev.shiftKey, ev.key, target.value)) {
      return;
    }

    let datum = this._toPropertiedDatum(this.opt.datum);
    let logMsg =
      (ev.ctrlKey ? 'Ctrl+' : '') +
      (ev.shiftKey ? 'Shift+' : '') +
      `${ev.key} at ${this.opt.address}.`;

    // Type
    if (ev.ctrlKey && '1234567'.indexOf(ev.key) > -1) {
      // Suppress select tab
      ev.preventDefault();
      const newType = this.types[parseInt(ev.key) - 1];
      this.changeType(datum.type, newType);
      datum.type = newType;
    }
    // Stylizing
    else if (ev.ctrlKey && ev.key == '.') {
      this._stylize(target, '<big>', '</big>');
    } else if (ev.ctrlKey && ev.key == ',') {
      this._stylize(target, '<small>', '</small>');
    } else if (ev.ctrlKey && ev.key == 'b') {
      this._stylize(target, '<b>', '</b>');
    } else if (ev.ctrlKey && ev.key == 'u') {
      // Suppress view source shortcut
      ev.preventDefault();
      this._stylize(target, '<strong class="stroke">', '</strong>');
    } else {
      // console.log(logMsg + ' But ignored.');
      return;
    }
    console.log(logMsg);
    target.size = Translation.getPreferSize(target.value.length);

    datum.text = target.value;
    this.opt.changeDatum(datum);
  }

  _stylize(target: HTMLInputElement, opening: string, ending: string): void {
    if (target.selectionStart === null || target.selectionEnd === null) {
      return;
    }
    const oldStart: number = target.selectionStart;
    const oldEnd: number = target.selectionEnd;
    const selected = target.value.substring(oldStart, oldEnd);
    target.value =
      target.value.slice(0, oldStart) +
      opening +
      selected +
      ending +
      target.value.slice(oldEnd);
    console.log(
      oldStart + opening.length,
      ' ',
      oldStart + (opening + selected).length
    );
    target.setSelectionRange(
      oldStart + opening.length,
      oldStart + (opening + selected).length
    );
  }

  _toPropertiedDatum(original: datum): propertiedDatum {
    if (typeof original === 'string') {
      return {
        text: original,
        type: 'speech'
      };
    }
    return original;
  }

  _minifyDatum(original: datum): datum {
    if (typeof original === 'string') {
      return original;
    }
    if (Object.keys(original).length == 2 && original.type == 'speech') {
      return original.text;
    }
    return original;
  }

  changeType(old: string, newClass: string) {
    this.$element.classList.remove(...this.types);
    this.$element.classList.add(newClass);
  }

  static getPreferSize(length: number): number {
    return Math.max(length * 1.5, 1);
  }
}
