const mBrowser = typeof browser === 'undefined' ? chrome : browser;

mBrowser.browserAction.onClicked.addListener(tab => {
  mBrowser.tabs.create({ url: 'http://dka-hero.me/', active: true });
});
