import { captionOption, Caption } from './caption';

export class Notice extends Caption {
  constructor(opt: captionOption) {
    opt.class = ['notice', 'float'];
    super(opt);
  }
}
