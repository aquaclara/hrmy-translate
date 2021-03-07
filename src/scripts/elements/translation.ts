import { captionOption, Caption } from './caption';
import * as DataModel from '../data-models/translation';
import { isComment } from '../data-models/comment';
import { log, init as loggerInit } from '../logger';

export type address = [string, number, number];

export interface translationOption extends captionOption {
  datum: DataModel.DataModel;
  address: address;
  type: DataModel.Type;
  overwriteMode?: boolean;
  focus?: boolean;
  x?: number;
  y?: number;
  width?: number;
  onInput?: (ev: Event) => any;
  onShortcut?: (
    ctrl: boolean,
    alt: boolean,
    shift: boolean,
    key: string,
    text: string
  ) => boolean;
  changeDatum?: (datum: DataModel.DataModel) => any;
}

export class Translation extends Caption {
  static types: DataModel.Type[] = [
    'speech',
    'thought',
    'scream',
    'plain',
    'stroke',
    'square',
    'shock'
  ];
  static DEFAULT_FONT_SIZE_FOR_OVERWRITING = 22;

  datum: DataModel.DataModel;
  address: address;
  overwriteMode?: boolean;
  focus?: boolean;
  x?: number;
  y?: number;
  width?: number;
  onInput?: (ev: Event) => any;
  onShortcut?: (
    ctrl: boolean,
    alt: boolean,
    shift: boolean,
    key: string,
    text: string
  ) => boolean;
  changeDatum?: (datum: DataModel.DataModel) => any;

  constructor(opt: translationOption) {
    super(opt);
    this.tag = this.editableMode && !opt.overwriteMode ? 'input' : 'p';
    this.class.push('translation', opt.type);
    if (opt.overwriteMode) {
      this.class.push('overwrite');
      this.fontSize =
        opt.fontSize || Translation.DEFAULT_FONT_SIZE_FOR_OVERWRITING;
    }
    this.datum = opt.datum;
    this.address = opt.address;
    this.overwriteMode = opt.overwriteMode || false;
    this.focus = opt.focus || false;
    this.x = opt.x;
    this.y = opt.y;
    this.width = opt.width;
    this.onInput = opt.onInput;
    this.onShortcut = opt.onShortcut;
    this.changeDatum = opt.changeDatum;
    loggerInit();
  }

  createElement(): HTMLElement {
    if (this.overwriteMode) {
      const $element: HTMLInputElement = super.createElement() as HTMLInputElement;
      $element.style.left = this.x + 'px';
      $element.style.top = this.y + 'px';
      $element.style.width = this.width + 'px';
      if (this.fontSize) {
        $element.style.fontSize = this.fontSize + 'px';
      }
      return $element;
    } else if (this.editableMode) {
      const $element: HTMLInputElement = super.createElement() as HTMLInputElement;
      $element.type = 'text';
      $element.defaultValue = String(this.message);
      $element.size = Translation.getPreferSize(String(this.message).length);
      if (this.onInput) {
        $element.oninput = this.onInput;
      }
      if (this._onShortcut) {
        $element.onkeydown = this._onShortcut.bind(this);
      }
      return $element;
    } else {
      return super.createElement();
    }
  }

  render(): void {
    if (this.overwriteMode && isComment(String(this.message))) {
      return;
    }
    super.render();

    if (this.editableMode && this.focus) {
      if (!this.$element) {
        this.$element = this.createElement();
      }
      const $element = this.$element as HTMLInputElement;
      const focus = () => {
        $element.focus();
        const length = $element && $element.value ? $element.value.length : 0;
        $element.selectionStart = $element.selectionEnd = length;
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
    if (
      this.onShortcut &&
      this.onShortcut(ev.ctrlKey, ev.altKey, ev.shiftKey, ev.key, target.value)
    ) {
      ev.preventDefault();
      return;
    }

    let datum = this._toPropertiedDatum(this.datum);
    let logMsg =
      (ev.ctrlKey ? 'Ctrl+' : '') +
      (ev.shiftKey ? 'Shift+' : '') +
      `${ev.key} at ${this.address}.`;

    // Type
    if (ev.ctrlKey && '1234567'.indexOf(ev.key) > -1) {
      // Suppress select tab
      ev.preventDefault();
      const newType = Translation.types[parseInt(ev.key) - 1];
      this.changeType(newType);
      datum.type = newType;
    }
    // Stylizing
    else if (ev.ctrlKey && ev.key == ',') {
      this._stylize(target, '<sub>', '</sub>');
    } else if (ev.ctrlKey && ev.key == '.') {
      this._stylize(target, '<sup>', '</sup>');
    } else if (ev.ctrlKey && ev.key == '[') {
      this._stylize(target, '<small>', '</small>');
    } else if (ev.ctrlKey && ev.key == ']') {
      this._stylize(target, '<big>', '</big>');
    } else if (ev.ctrlKey && ev.key == 'b') {
      this._stylize(target, '<b>', '</b>');
    } else if (ev.ctrlKey && ev.key == 'i' && location.href.includes('/aco/')) {
      this._stylize(target, '<span class="blue">', '</span>');
    } else if (ev.ctrlKey && ev.key == 'u') {
      // Suppress view source shortcut
      ev.preventDefault();
      this._stylize(target, '<strong class="stroke">', '</strong>');
    } else if (ev.ctrlKey && ev.key == '"') {
      // Suppress view source shortcut
      ev.preventDefault();
      this._stylize(target, '「', '」');
    } else if (ev.altKey && ev.key == 'Enter') {
      this._stylize(target, '<br>', '');
    } else {
      // log(logMsg + ' But ignored.');
      return;
    }
    log(logMsg);
    target.size = Translation.getPreferSize(target.value.length);

    datum.text = target.value;
    if (this.changeDatum) {
      this.changeDatum(datum);
    }
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
    log(oldStart + opening.length, ' ', oldStart + (opening + selected).length);
    target.setSelectionRange(
      oldStart + opening.length,
      oldStart + (opening + selected).length
    );
  }

  _toPropertiedDatum(
    original: DataModel.DataModel
  ): DataModel.PropertiedDataModel {
    if (typeof original === 'string') {
      return {
        text: original,
        type: 'speech'
      };
    }
    return original;
  }

  _minifyDatum(original: DataModel.DataModel): DataModel.DataModel {
    if (typeof original === 'string') {
      return original;
    }
    if (Object.keys(original).length == 2 && original.type == 'speech') {
      return original.text;
    }
    return original;
  }

  changeType(newClass: string) {
    if (!this.$element) {
      return;
    }
    this.$element.classList.remove(...Translation.types);
    this.$element.classList.add(newClass);
  }

  static getPreferSize(length: number): number {
    return Math.max(length * 1.5, 1);
  }
}
