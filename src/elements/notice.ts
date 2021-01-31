import { captionOption, Caption } from './caption';

export interface noticeOption extends captionOption {
  editableMode?: boolean;
  onclick?: (ev: Event) => any;
}
export class Notice extends Caption {
  constructor(opt: noticeOption) {
    opt.class = ['notice', 'float'];
    if (opt.editableMode) {
      opt.tag = 'a';
    }
    super(opt);
  }

  beforeAppendHook($notice: HTMLInputElement, opt: noticeOption) {
    if (opt.editableMode) {
      $notice.onclick = opt.onclick;
    }
  }
}
