import Util from '../dom-util';
import * as Constant from '../constants';

export interface captionOption {
  extensionOption: Constant.ExtensionOptions;
  message?: string;
  tag?: 'div' | 'p' | 'input' | 'a';
  class?: Array<string>;
  parent?: HTMLElement;
  fontSize?: number;
  href?: string;
  top?: string;
  left?: string;
  marginTop?: string;
  marginLeft?: string;
}

export class Caption {
  static defaultFontSize = 24;

  extensionOption: Constant.ExtensionOptions;
  message?: string;
  tag: 'div' | 'p' | 'input' | 'a';
  class: Array<string>;
  parent: HTMLElement;
  editableMode?: boolean;
  href?: string;
  fontSize: number;
  top?: string;
  left?: string;
  marginTop?: string;
  marginLeft?: string;
  $element?: HTMLElement;

  constructor(opt: captionOption) {
    this.extensionOption = opt.extensionOption;
    this.message = opt.message;
    this.tag = opt.tag || 'div';
    this.class = opt.class || [];
    this.class.push('caption');
    this.parent = opt.parent || Util.getBodyElement();
    this.href = opt.href;
    this.fontSize = opt.extensionOption.fontSize;
    this.top = opt.top;
    this.left = opt.left;
    this.marginTop = opt.marginTop;
    this.marginLeft = opt.marginLeft;
    this.editableMode =
      opt.extensionOption.developmentMode && opt.extensionOption.editableMode;
  }

  createElement(): HTMLElement {
    const $element = document.createElement(this.tag);
    if (this.class) {
      $element.classList.add(...this.class);
    }

    if (this.message) {
      $element.innerHTML = this.message;
    }
    $element.style.fontSize = `${this.fontSize}mm`;
    if ($element instanceof HTMLAnchorElement && this.href) {
      $element.href = this.href;
    }
    if (this.marginTop) {
      $element.style.marginTop = this.marginTop;
    }
    if (this.marginLeft) {
      $element.style.marginLeft = this.marginLeft;
    }
    if (this.top) {
      $element.style.top = this.top;
    }
    if (this.left) {
      $element.style.left = this.left;
    }

    return $element;
  }

  render() {
    this.$element = this.createElement();
    this.parent.appendChild(this.$element);
  }

  getElement() {
    if (!this.$element) {
      this.$element = this.createElement();
    }
    return this.$element;
  }
}
