import { captionOption, Caption } from './caption';

export interface noticeOption extends captionOption {
  editableMode?: boolean;
  onclick?: (ev: Event) => any;
}
export class Notice extends Caption {
  opt: noticeOption;

  constructor(opt: noticeOption) {
    opt.class = ['notice', 'float'];
    if (opt.editableMode) {
      opt.tag = 'a';
      opt.href = '#';
    }
    super(opt);
  }

  createElement(): HTMLElement {
    const $element = super.createElement();
    if (this.opt.editableMode) {
      $element.onclick = this.opt.onclick;
    }
    return $element;
  }
}
