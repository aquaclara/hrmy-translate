import { dkaHeroUrl } from './constants';
const mBrowser = typeof browser === 'undefined' ? chrome : browser;

mBrowser.browserAction.onClicked.addListener(() => {
  mBrowser.tabs.create({ url: dkaHeroUrl, active: true });
});

mBrowser.runtime.onMessage.addListener((message: any) => {
  try {
    chrome.downloads.download({
      url: message.url,
      filename: message.filename,
      saveAs: true
    });
  } catch (error) {}
});
