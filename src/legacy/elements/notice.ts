import { captionOption, Caption } from './caption';

export interface noticeOption extends captionOption {
  onclick?: (ev: Event) => boolean;
}
export class Notice extends Caption {
  onclick?: (ev: Event) => boolean;

  constructor(opt: noticeOption) {
    super(opt);
    if (this.editableMode) {
      this.tag = 'a';
      this.href = '#';
      this.message = '(클릭하여 새 번역 추가)';
    } else {
      this.message = '(제공된 번역이 아직 없습니다)';
    }
    this.class.push('notice', 'float');
    this.onclick = opt.onclick;
  }

  createElement(): HTMLElement {
    const $element = super.createElement();
    if (this.onclick) {
      $element.onclick = this.onclick;
    }
    return $element;
  }
}
