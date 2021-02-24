// Libraries
import React from 'react';
import ReactDOM from 'react-dom';
const yaml = require('js-yaml');
// Html elements
import { Configuration } from './widgets/configuration';
import { HotLinks } from './widgets/hot-links';
// Etc
import '../scss/styles.scss';
import Util from './dom-util';
import * as Constant from './constants';
import { log, init as loggerInit } from './logger';
import TranslationRenderer from './translation-renderer';
// Globals
// @todo not use globals
let options: Constant.ExtensionOptions;
let translationRenderer: TranslationRenderer;

function main() {
  const TLS_PATH =
    '/translations' + location.pathname.replace('.html', '.yaml');
  const GITHUB_URL = Constant.GITHUB_RAW_URL_BASE + TLS_PATH;
  const LOCAL_URL = chrome.runtime.getURL(TLS_PATH);

  loggerInit();
  chrome.storage.sync.get(Constant.DEFAULT_EXTENSION_OPTIONS, items => {
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
          : 'Development Mode is on,') + ' Try reading translations from local'
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

function pushClassesToBodyBaseOnOptions(
  options: Constant.ExtensionOptions
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
  const data = yaml.load(response);
  translationRenderer = new TranslationRenderer({
    data: data,
    extensionOption: options
  });
  appendHotLinks(translationRenderer);
  translationRenderer.renderTranslations();

  if (options.developmentMode && options.editableMode) {
    chrome.storage.local.get(
      [location.pathname],
      (items: { [key: string]: any }) => {
        const storedData = items[location.pathname];
        if (storedData) {
          translationRenderer.setData(storedData);
          translationRenderer.redrawTranslations();
          log('The last draft is loaded');
        }
      }
    );
  }
}

function appendHotLinks(translationRenderer: TranslationRenderer): void {
  ReactDOM.render(
    <HotLinks
      translationDataContainer={translationRenderer}
      defaultEditableMode={options.developmentMode && options.editableMode}
      onClickConfigure={onClickConfigure}
      onChangeEditableMode={(event: React.ChangeEvent<HTMLInputElement>) => {
        options.editableMode = event.target.checked;
        Util.getBodyElement().classList.toggle(
          'editable-mode',
          options.editableMode
        );
        onChangeSettings(translationRenderer);
      }}
    />,
    Util.newChildOfBody()
  );
}

function onClickConfigure(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const mBrowser = typeof browser === 'undefined' ? chrome : browser;
  const version = mBrowser.runtime.getManifest().version;
  const $body = Util.getBodyElement();
  const $overlay: HTMLDivElement = document.createElement('div');
  $body.appendChild($overlay);
  ReactDOM.render(
    <Configuration
      version={version}
      onClickOverlay={(event: React.MouseEvent<HTMLDivElement>) => {
        if (
          event.target instanceof Element &&
          event.target.classList.contains('overlay')
        ) {
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
          event.target.checked
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
          event.target.checked
        );
        onChangeSettings(translationRenderer);
      }}
    />,
    $overlay
  );
}

function onChangeSettings(translationRenderer: TranslationRenderer) {
  chrome.storage.sync.set(options, function() {
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
