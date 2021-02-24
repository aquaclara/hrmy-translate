import { DKA_HERO_URL } from './constants';
const mBrowser = typeof browser === 'undefined' ? chrome : browser;

mBrowser.browserAction.onClicked.addListener(() => {
  mBrowser.tabs.create({ url: DKA_HERO_URL, active: true });
});
