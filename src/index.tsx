import React from 'react';
import ReactDOM from 'react-dom';
const copy = require('copy-to-clipboard');
const yaml = require('js-yaml');

import './scss/styles.scss';
import util from './dom-util';
import {
  translation,
  propertiedTranslation,
  cutTranslation,
  imageTranslation,
  translationFile,
  Translation
} from './translation';
import { noticeOption, Notice } from './elements/notice';
import {
  translationOption,
  address as translationAddress,
  Translation as TranslationElement
} from './elements/translation';
import { Configuration } from './widgets/configuration';
import { HotLinks } from './widgets/hot-links';

import {
  license,
  githubRawUrlBase as githubUrlBase,
  imageDenyList
} from './constants';
const tlsPath = '/translations' + location.pathname.replace('.html', '.yaml');
const githubUrl = githubUrlBase + tlsPath;
const localUrl = chrome.runtime.getURL(tlsPath);

type Option = {
  fontSize: number;
  applyFont: boolean;
  developmentMode: boolean;
  editableMode: boolean;
};
let options: Option;
let data: translationFile;

function log(message: any, ...optionalParams: any[]) {
  if (options.developmentMode) {
    console.log(message, ...optionalParams);
  }
}

function main() {
  chrome.storage.sync.get(
    {
      fontSize: 5,
      applyFont: false,
      developmentMode: false,
      editableMode: false
    },
    items => {
      options = items as Option;
      log('Options loaded');
      log(items);

      if (options.applyFont) {
        util.getBodyElement().classList.add('apply-font');
      }
    }
  );

  // Try fetching translations from Github
  const xhr = new XMLHttpRequest();
  xhr.open('GET', githubUrl, true);
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
      xhr.open('GET', localUrl, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState != 4) return;
        const res = xhr.responseText;
        if (res != '404: Not Found') {
          handleResponse(res);
        } else {
          log(`File does not exist for '${tlsPath}'`);
        }
      };
      xhr.send();
    }
  };
  xhr.send();

  if (/hm\d+_\d+\/pict_com_\d+.html$/.test(location.href)) {
    util.getBodyElement().classList.add('horimiya');
  }
}

function handleResponse(response: string) {
  data = yaml.load(response);
  renderTranslations();
  appendHotLinks();
  if (options.developmentMode && options.editableMode) {
    chrome.storage.local.get(
      [location.pathname],
      (items: { [key: string]: any }) => {
        const storedData = items[location.pathname];
        if (storedData) {
          data = storedData;
          removeTranslates();
          renderTranslations();
          log('The last draft is loaded');
        }
      }
    );
  }
}

function getYaml(): string {
  const dataToParse: any = data;
  dataToParse['//'] = license;
  const yamlText = yaml.dump(data, {
    noArrayIndent: true,
    sortKeys: true,
    noCompatMode: true
  });
  return yamlText + '\n';
}

function appendHotLinks() {
  ReactDOM.render(
    <HotLinks
      tlsPath={tlsPath}
      editableMode={options.developmentMode && options.editableMode}
      onClickConfigure={onClickConfigure}
      onClickCopy={(event: React.MouseEvent<HTMLAnchorElement>) => {
        copy(getYaml());
      }}
    />,
    util.getBodyElement().appendChild(document.createElement('div'))
  );
}

function renderTranslations(focus?: translationAddress) {
  // Handle negative index
  if (focus) {
    log(focus);
    if (focus[1] < 0) {
      focus[1] = data[focus[0]].length + focus[1];
    }
    if (focus[2] < 0) {
      focus[2] = data[focus[0]][focus[1]].length + focus[2];
    }
  }

  for (const img of document.querySelectorAll(
    'img, td[background]'
  ) as NodeListOf<HTMLImageElement | HTMLTableCellElement>) {
    const imageId = util.getImageId(img);

    if (imageDenyList.indexOf(imageId) >= 0) {
      continue;
    }
    if (
      !data ||
      data[imageId] === null ||
      data[imageId] === undefined ||
      data[imageId].length === 0
    ) {
      const opt: noticeOption = {
        message:
          options.developmentMode && options.editableMode
            ? '(클릭하여 새 번역 추가)'
            : '(제공된 번역이 아직 없습니다)',
        fontSize: options.fontSize,
        top: util.getProperty(img, 'offsetTop') + 'px',
        left:
          util.getProperty(img, 'offsetLeft') +
          util.getProperty(img, 'width') +
          'px',
        editableMode: options.developmentMode && options.editableMode
      };
      if (options.developmentMode && options.editableMode) {
        opt.onclick = (ev: Event): any => {
          log(`clicked ${imageId}`);
          if (!data) {
            data = {};
          }
          data[imageId] = [['']];
          removeTranslates();
          renderTranslations([imageId, 0, 0]);
        };
      }
      new Notice(opt).render();
    } else {
      const image: imageTranslation = data[imageId];
      for (let cutIndex: number = 0; cutIndex < image.length; cutIndex++) {
        const cut: cutTranslation = image[cutIndex];
        const $tlsGroup: HTMLDivElement = newTranslationGroup();
        for (let tlsIndex: number = 0; tlsIndex < cut.length; tlsIndex++) {
          {
            const datum = data[imageId][cutIndex][tlsIndex];
            const text = typeof datum === 'string' ? datum : datum.text;
            if (
              (!options.developmentMode || !options.editableMode) &&
              (!text || Translation.isComment(text))
            ) {
              continue;
            }
          }
          const opt: translationOption = {
            datum: data[imageId][cutIndex][tlsIndex],
            address: [imageId, cutIndex, tlsIndex],
            tag: 'p',
            parent: $tlsGroup,
            type: 'speech',
            editableMode: options.developmentMode && options.editableMode,
            focus:
              focus &&
              imageId === focus[0] &&
              cutIndex === focus[1] &&
              tlsIndex === focus[2]
          };
          if (options.developmentMode && options.editableMode) {
            opt.oninput = (ev: Event): any => {
              if (ev.target instanceof HTMLInputElement) {
                const target = ev.target as HTMLInputElement;
                const changed = target.value;
                const datum = data[imageId][cutIndex][tlsIndex];

                target.size = TranslationElement.getPreferSize(changed.length);
                if (typeof datum === 'string') {
                  data[imageId][cutIndex][tlsIndex] = changed;
                } else {
                  datum.text = changed;
                  data[imageId][cutIndex][tlsIndex] = datum;
                }
                chrome.storage.local.set({ [location.pathname]: data }, () => {
                  log(`${location.pathname} is set`);
                  log(
                    `${imageId}-${cutIndex}-${tlsIndex} is ${data[imageId][cutIndex][tlsIndex]}`
                  );
                });
              }
            };
            opt.onShortcut = (
              ctrl: boolean,
              shift: boolean,
              key: string,
              text: string
            ): boolean => {
              let logMsg: string =
                (ctrl ? 'Ctrl+' : '') +
                (shift ? 'Shift+' : '') +
                `${key} at ${[imageId, cutIndex, tlsIndex]}.`;
              // Enter
              if (!ctrl && !shift && key === 'Enter') {
                data[imageId][cutIndex].splice(tlsIndex + 1, 0, '');
                focus = [imageId, cutIndex, tlsIndex + 1];
              } else if (!ctrl && shift && key === 'Enter') {
                data[imageId][cutIndex].splice(tlsIndex, 0, '');
                focus = [imageId, cutIndex, tlsIndex];
              } else if (ctrl && key === 'Enter') {
                data[imageId].splice(cutIndex + 1, 0, ['']);
                focus = [imageId, cutIndex + 1, 0];
              }
              // Backspace
              else if (key == 'Backspace' && text.length === 0) {
                const onlyTranslate =
                  data[imageId][cutIndex].length == 1 && tlsIndex === 0;
                const onlyCut = data[imageId].length == 1 && cutIndex === 0;
                if (!onlyTranslate) {
                  console.log('Delete a translate');
                  data[imageId][cutIndex].splice(tlsIndex, 1);
                  focus = [
                    imageId,
                    cutIndex,
                    tlsIndex - 1 >= 0 ? tlsIndex - 1 : -1
                  ];
                } else if (!onlyCut) {
                  console.log('Delete a cut');
                  data[imageId].splice(cutIndex, 1);
                  focus = [imageId, cutIndex - 1, -1];
                }
              } else {
                // log(logMsg + ' But ignored.');
                return false;
              }
              log(logMsg);
              removeTranslates();
              renderTranslations(focus);

              // Store data
              chrome.storage.local.set({ [location.pathname]: data }, () => {
                console.log(`${location.pathname} is set`);
              });
              return true;
            };
            opt.changeDatum = (datum: translation): any => {
              data[imageId][cutIndex][tlsIndex] = datum;

              // Store data
              chrome.storage.local.set({ [location.pathname]: data }, () => {
                console.log(`${location.pathname} is set`);
              });
            };
          }

          const datum = data[imageId][cutIndex][tlsIndex];
          const text = typeof datum === 'string' ? datum : datum.text;
          if (typeof cut[tlsIndex] === 'string') {
            if (
              (!options.developmentMode || !options.editableMode) &&
              Translation.isComment(text)
            ) {
              continue;
            }
            opt.message = text as string;
          } else {
            const translate = cut[tlsIndex] as propertiedTranslation;
            opt.message = text;
            opt.marginLeft = translate['margin-left'];
            if (translate['type']) opt.type = translate['type'];
          }
          new TranslationElement(opt).render();
        }
        $tlsGroup.style.top =
          util.getProperty(img, 'offsetTop') +
          (util.getProperty(img, 'height') / image.length) * cutIndex +
          'px';
        $tlsGroup.style.left =
          util.getProperty(img, 'offsetLeft') +
          util.getProperty(img, 'width') +
          'px';
        util.getBodyElement().appendChild($tlsGroup);
      }
    }
  }
}

function newTranslationGroup(): HTMLDivElement {
  const $div = document.createElement('div');
  $div.classList.add('translation-group', 'float');
  $div.style.fontSize = `${options.fontSize}mm`;
  return $div;
}

function removeTranslates() {
  document
    .querySelectorAll('.caption, .translation-group')
    .forEach((e: Element) => {
      e.remove();
    });
}

function onClickConfigure(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  const mBrowser = typeof browser === 'undefined' ? chrome : browser;
  const version = mBrowser.runtime.getManifest().version;
  const $body = util.getBodyElement();
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
        onChangeSettings();
      }}
      defaultApplyFont={options.applyFont}
      onChangeApplyFont={(event: React.ChangeEvent<HTMLInputElement>) => {
        util
          .getBodyElement()
          .classList.toggle('apply-font', event.target.checked);
        options.applyFont = event.target.checked;
        onChangeSettings();
      }}
      defaultDevelopmentMode={options.developmentMode}
      onChangeDevelopmentMode={(event: React.ChangeEvent<HTMLInputElement>) => {
        options.developmentMode = event.target.checked;
        onChangeSettings();
      }}
      defaultEditableMode={options.developmentMode && options.editableMode}
      onChangeEditableMode={(event: React.ChangeEvent<HTMLInputElement>) => {
        options.editableMode = event.target.checked;
        onChangeSettings();
      }}
    />,
    $overlay
  );
}

function onChangeSettings() {
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

  removeTranslates();
  renderTranslations();
}

main();
