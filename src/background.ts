const mBrowser = typeof browser === 'undefined' ? chrome : browser;

mBrowser.browserAction.onClicked.addListener(() => {
  mBrowser.tabs.create({ url: 'http://dka-hero.me/', active: true });
});

chrome.runtime.onMessage.addListener(
  (message: any) => {
    try {
      chrome.downloads.download({
        url: message.url,
        filename: message.filename,
        saveAs: true
      });
    } catch (error) {}
  }
);
