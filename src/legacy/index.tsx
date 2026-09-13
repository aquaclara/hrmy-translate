// Libraries
import React from 'react';
import { createRoot } from 'react-dom/client';
import yaml from 'js-yaml';
// Html elements
import { Configuration } from './widgets/configuration';
import { HotLinks } from './widgets/hot-links';
// Etc
import Util from './dom-util';
import * as Constant from '../shared/constants';
import { translationPathFor } from '../shared/translation-path';
import { log, init as loggerInit } from './logger';
import TranslationRenderer from './translation-renderer';
import FileDataModel from '../shared/data-models/translation-chucks/file';
import FileData from '../shared/translation-chunk-data';
// Globals
// @todo not use globals
let options: Constant.ExtensionOptions;
let translationRenderer: TranslationRenderer;

function main() {
  const TLS_PATH = translationPathFor(location.pathname);
  const GITHUB_URL = Constant.GITHUB_RAW_URL_BASE + TLS_PATH;
  const LOCAL_URL = chrome.runtime.getURL(TLS_PATH);

  loggerInit();
  loadFonts();
  chrome.storage.sync.get(Constant.DEFAULT_EXTENSION_OPTIONS, (items) => {
    log('Options loaded');
    log(items);
    options = items as Constant.ExtensionOptions;
    pushClassesToBodyBaseOnOptions(options);
  });

  // Try fetching translations from Github
  const xhr = new XMLHttpRequest();
  xhr.open('GET', GITHUB_URL, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState != 4) return;
    const res: string = xhr.responseText;
    if (!options.developmentMode && res != '404: Not Found') {
      handleResponse(res);
    } else {
      log(
        (options.developmentMode
          ? 'File does not exist on Github.'
          : 'Development Mode is on,') + ' Try reading translations from local',
      );
      const xhr = new XMLHttpRequest();
      xhr.open('GET', LOCAL_URL, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState != 4) return;
        const res = xhr.responseText;
        if (res != '404: Not Found') {
          handleResponse(res);
        } else {
          log(`File does not exist for '${TLS_PATH}'`);
        }
      };
      xhr.send();
    }
  };
  xhr.send();
}

function loadFonts(): void {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = Constant.FONTS_URL;
  document.head.appendChild(link);
}

function pushClassesToBodyBaseOnOptions(
  options: Constant.ExtensionOptions,
): void {
  const bodyClasses = [];
  if (options.applyFont) {
    bodyClasses.push('apply-font');
  }
  if (options.developmentMode) {
    bodyClasses.push('development-mode');
    if (options.editableMode) {
      bodyClasses.push('editable-mode');
    }
  }
  Util.getBodyElement().classList.add(...bodyClasses);
}

function pushClassToBodyBaseOnContent(): void {
  const bodyClasses = [];
  if (/hm\d+_\d+\/pict_com_\d+.html$/.test(location.href)) {
    bodyClasses.push('horimiya');
  } else if (location.href.includes('/aco/')) {
    bodyClasses.push('aco');
  }
  Util.getBodyElement().classList.add(...bodyClasses);
}

function handleResponse(response: string) {
  pushClassToBodyBaseOnContent();
  const data = yaml.load(response) as FileDataModel;
  translationRenderer = new TranslationRenderer({
    data: new FileData(data),
    extensionOption: options,
  });
  appendHotLinks(translationRenderer);
  translationRenderer.renderTranslations();

  if (options.developmentMode && options.editableMode) {
    chrome.storage.local.get(
      [location.pathname],
      (items: { [key: string]: any }) => {
        const data = items[location.pathname];
        if (data) {
          translationRenderer.setData(new FileData(data));
          translationRenderer.redrawTranslations();
          log('The last draft is loaded');
        }
      },
    );
  }
}

function appendHotLinks(translationRenderer: TranslationRenderer): void {
  createRoot(Util.newChildOfBody()).render(
    <HotLinks
      translationDataContainer={translationRenderer}
      defaultEditableMode={options.developmentMode && options.editableMode}
      onClickConfigure={onClickConfigure}
      onChangeEditableMode={(event: React.ChangeEvent<HTMLInputElement>) => {
        options.editableMode = event.target.checked;
        Util.getBodyElement().classList.toggle(
          'editable-mode',
          options.editableMode,
        );
        onChangeSettings(translationRenderer);
      }}
    />,
  );
}

function onClickConfigure(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const version = chrome.runtime.getManifest().version;
  const $body = Util.getBodyElement();
  const $overlay: HTMLDivElement = document.createElement('div');
  $body.appendChild($overlay);
  const root = createRoot($overlay);
  root.render(
    <Configuration
      version={version}
      onClickOverlay={(event: React.MouseEvent<HTMLDivElement>) => {
        if (
          event.target instanceof Element &&
          event.target.classList.contains('overlay')
        ) {
          root.unmount();
          $body.removeChild($overlay);
        }
      }}
      defaultFontSize={options.fontSize}
      onChangeFontSize={(event: React.ChangeEvent<HTMLInputElement>) => {
        options.fontSize = parseInt(event.target.value);
        onChangeSettings(translationRenderer);
      }}
      defaultApplyFont={options.applyFont}
      onChangeApplyFont={(event: React.ChangeEvent<HTMLInputElement>) => {
        Util.getBodyElement().classList.toggle(
          'apply-font',
          event.target.checked,
        );
        options.applyFont = event.target.checked;
        onChangeSettings(translationRenderer);
      }}
      defaultOverwriteMode={options.overwriteMode}
      onChangeOverwriteMode={(event: React.ChangeEvent<HTMLInputElement>) => {
        translationRenderer.redrawTranslations();
        options.overwriteMode = event.target.checked;
        onChangeSettings(translationRenderer);
      }}
      defaultDevelopmentMode={options.developmentMode}
      onChangeDevelopmentMode={(event: React.ChangeEvent<HTMLInputElement>) => {
        options.developmentMode = event.target.checked;
        Util.getBodyElement().classList.toggle(
          'development-mode',
          event.target.checked,
        );
        onChangeSettings(translationRenderer);
      }}
    />,
  );
}

function onChangeSettings(translationRenderer: TranslationRenderer) {
  chrome.storage.sync.set(options, function () {
    log('Options saved');
    log(options);
    // @todo Update status to let user know options were saved.
    // var status = document.getElementById('status');
    // status.textContent = 'Options saved.';
    // setTimeout(function() {
    //   status.textContent = '';
    // }, 750);
  });
  translationRenderer.redrawTranslations();
}

main();
