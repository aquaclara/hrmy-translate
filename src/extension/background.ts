import { DKA_HERO_URL } from '../shared/constants';

chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: DKA_HERO_URL, active: true });
});
