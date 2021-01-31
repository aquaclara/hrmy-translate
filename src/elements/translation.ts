import { captionOption, Caption } from './caption';

export interface translationOption extends captionOption {
  editableMode?: boolean;
  oninput?: (ev: Event) => any;
  onkeydown?: (ev: Event) => any;
  focus?: boolean;
}

export class Translation extends Caption {
  constructor(opt: translationOption) {
    opt.class = ['translation'];
    opt.tag = 'p';
    if (opt.editableMode) {
      opt.tag = 'input';
    }
    super(opt);
  }

  beforeAppendHook($translate: HTMLInputElement, opt: translationOption) {
    if (opt.editableMode) {
      $translate.type = 'text';
      $translate.defaultValue = opt.message;
      $translate.size = Translation.getPreferSize(opt.message.length);
      $translate.oninput = opt.oninput;
      $translate.onkeydown = opt.onkeydown;
    }
  }

  afterAppendHook($translate: HTMLInputElement, opt: translationOption) {
    if (opt.focus) {
      $translate.focus();
      $translate.select();
    }
  }

  static getPreferSize(length: number): number {
    return Math.max(length * 1.5, 5);
  }
}
