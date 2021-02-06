import { dkaHeroUrl } from './constants';
const mBrowser = typeof browser === 'undefined' ? chrome : browser;

mBrowser.browserAction.onClicked.addListener(() => {
  mBrowser.tabs.create({ url: dkaHeroUrl, active: true });
});
