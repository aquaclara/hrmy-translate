import util from '../dom-util';

export interface captionOption {
  tag?: 'div' | 'p' | 'input' | 'a';
  class?: Array<string>;
  message?: string;
  parent?: HTMLElement;
  href?: string;

  fontSize?: number;
  top?: string;
  left?: string;
  marginTop?: string;
  marginLeft?: string;
}

export class Caption {
  opt: captionOption;
  $element: HTMLElement;

  constructor(opt: captionOption) {
    opt = opt || {};
    opt.tag = opt.tag || 'div';
    opt.class = opt.class || [];
    opt.class.push('caption');
    opt.parent = opt.parent || util.getBodyElement();
    this.opt = opt;
  }

  createElement(): HTMLElement {
    const opt = this.opt;

    const $element = document.createElement(opt.tag);
    $element.classList.add(...opt.class);

    $element.innerHTML = opt.message;
    $element.style.fontSize = `${opt.fontSize}mm`;
    if ($element instanceof HTMLAnchorElement && opt.href) {
      $element.href = opt.href;
    }
    if (opt.marginTop) {
      $element.style.marginTop = opt.marginTop;
    }
    if (opt.marginLeft) {
      $element.style.marginLeft = opt.marginLeft;
    }

    if (opt.top) {
      $element.style.top = opt.top;
    }
    if (opt.left) {
      $element.style.left = opt.left;
    }

    return $element;
  }

  render() {
    this.$element = this.createElement();
    this.opt.parent.appendChild(this.$element);
  }
}
