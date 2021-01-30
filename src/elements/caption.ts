import util from '../dom-util';

export interface captionOption {
  tag?: 'div' | 'p' | 'input';
  class?: Array<string>;
  message?: string;
  parent?: HTMLElement;

  fontSize?: number;
  top?: string;
  left?: string;
  color?: string;
  marginTop?: string;
  marginLeft?: string;
}

export class Caption {
  opt: captionOption;
  constructor(opt: captionOption) {
    this.opt = opt;
  }

  render() {
    const opt: captionOption = this.opt || {};
    opt.tag = opt.tag || 'div';
    opt.parent = opt.parent || util.getBodyElement();

    const $caption = document.createElement(opt.tag);
    $caption.classList.add('caption');
    $caption.classList.add(...opt.class);

    $caption.innerHTML = opt.message;
    $caption.style.fontSize = `${opt.fontSize}mm`;
    if (opt.color) {
      $caption.style.color = opt.color;
    }
    if (opt.marginTop) {
      $caption.style.marginTop = opt.marginTop;
    }
    if (opt.marginLeft) {
      $caption.style.marginLeft = opt.marginLeft;
    }

    if (opt.top) {
      $caption.style.top = opt.top;
    }
    if (opt.left) {
      $caption.style.left = opt.left;
    }

    this.beforeAppendHook($caption, opt);

    opt.parent.appendChild($caption);
  }
  beforeAppendHook($caption: HTMLElement, opt: captionOption) {}
}
