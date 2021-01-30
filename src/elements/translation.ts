import React from 'react';
import { captionOption, Caption } from './caption';

export interface translationOption extends captionOption {
  writeMode?: boolean;
  oninput?: (ev: Event) => any;
}

export class Translation extends Caption {
  constructor(opt: translationOption) {
    opt.class = ['translation'];
    opt.tag = 'p';
    if (opt.writeMode) {
      opt.tag = 'input';
    }
    super(opt);
  }
  beforeAppendHook($notice: HTMLInputElement, opt: translationOption) {
    if (opt.writeMode) {
      $notice.type = 'text';
      $notice.defaultValue = opt.message;
      $notice.size = opt.message.length * 1.5;
      $notice.oninput = opt.oninput;
    }
  }
}
