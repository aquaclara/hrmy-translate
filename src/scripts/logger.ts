let developmentMode: boolean | null = null;

export function init(): void {
  if (developmentMode === null) {
    chrome.storage.sync.get({ developmentMode: false }, (items) => {
      developmentMode = items.developmentMode;
    });
  }
}

export function log(message: any, ...optionalParams: any[]): void {
  init();

  if (developmentMode) {
    console.log(message, ...optionalParams);
  }
}
