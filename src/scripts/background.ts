import { DKA_HERO_URL } from './constants';

chrome.browserAction.onClicked.addListener(() => {
  chrome.tabs.create({ url: DKA_HERO_URL, active: true });
});
