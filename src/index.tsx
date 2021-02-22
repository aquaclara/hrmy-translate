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
  propertiedImageTranslation,
  translationFile,
  Translation
} from './translation-data-model';
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

type Options = {
  fontSize: number;
  applyFont: boolean;
  developmentMode: boolean;
  editableMode: boolean;
  overwriteMode: boolean;
};
const defaultOptions: Options = {
  fontSize: 5,
  applyFont: true,
  developmentMode: false,
  editableMode: false,
  overwriteMode: false
};
let options: Options;
let data: translationFile;
const yamlOption = {
  noArrayIndent: true,
  sortKeys: true,
  noCompatMode: true
};

function log(message: any, ...optionalParams: any[]) {
  if (options.developmentMode) {
    console.log(message, ...optionalParams);
  }
}

function main() {
  chrome.storage.sync.get(defaultOptions, items => {
    options = items as Options;
    log('Options loaded');
    log(items);

    if (options.applyFont) {
      util.getBodyElement().classList.add('apply-font');
    }
    if (options.developmentMode) {
      util.getBodyElement().classList.add('development-mode');
      if (options.editableMode) {
        util.getBodyElement().classList.add('editable-mode');
      }
    }
  });

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
  const yamlText = yaml.dump(data, yamlOption);
  return yamlText + '\n';
}

function appendHotLinks(): void {
  ReactDOM.render(
    <HotLinks
      tlsPath={tlsPath}
      onClickConfigure={onClickConfigure}
      onClickCopy={(event: React.MouseEvent<HTMLAnchorElement>) => {
        copy(getYaml());
      }}
      defaultEditableMode={options.developmentMode && options.editableMode}
      onChangeEditableMode={(event: React.ChangeEvent<HTMLInputElement>) => {
        options.editableMode = event.target.checked;
        util
          .getBodyElement()
          .classList.toggle('editable-mode', options.editableMode);
        onChangeSettings();
      }}
      fileName={location.href.substring(location.href.lastIndexOf('/') + 1)}
      fullFilePath={location.href}
    />,
    util.getBodyElement().appendChild(document.createElement('div'))
  );
}

function renderTranslations(focus?: translationAddress) {
  // Handle negative index
  if (focus) {
    const image = data[focus[0]];
    const cuts: cutTranslation[] = Array.isArray(image) ? image : image.text;
    log(focus);
    if (focus[1] < 0) {
      focus[1] = cuts.length + focus[1];
    }
    if (focus[2] < 0) {
      focus[2] = cuts[focus[1]].length + focus[2];
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
      (Array.isArray(data[imageId]) &&
        (data[imageId] as cutTranslation[]).length === 0)
    ) {
      const opt: any = {
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
        opt.onclick = (): any => {
          log(`clicked ${imageId}`);
          if (!data) {
            data = {};
          }
          data[imageId] = [['']];
          removeTranslates();
          renderTranslations([imageId, 0, 0]);
        };
      }
      new Notice(opt as noticeOption).render();
    } else {
      const $frame = document.createElement('div');
      $frame.classList.add('frame');
      $frame.style.top = util.getProperty(img, 'offsetTop') + 'px';
      $frame.style.left = util.getProperty(img, 'offsetLeft') + 'px';
      $frame.style.width = util.getProperty(img, 'width') + 'px';
      $frame.style.height = util.getProperty(img, 'height') + 'px';
      util.getBodyElement().appendChild($frame);
      if (options.overwriteMode && !Array.isArray(data[imageId])) {
        const canvasData = (data[imageId] as propertiedImageTranslation).canvas;
        const $canvas: HTMLCanvasElement = document.createElement('canvas');
        $canvas.width = util.getProperty(img, 'width');
        $canvas.height = util.getProperty(img, 'height');
        $canvas.classList.add('overwrite');

        if (options.editableMode) {
          let $textarea: HTMLTextAreaElement | null = null;
          $canvas.addEventListener('click', e => {
            if ($textarea !== null) {
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            $textarea = document.createElement('textarea');
            $textarea.classList.add('canvas-data');
            $textarea.defaultValue = yaml.dump(canvasData, yamlOption);
            $textarea.oninput = () => {
              if ($textarea === null) {
                return;
              }
              try {
                const load = yaml.load($textarea.value);
                (data[imageId] as propertiedImageTranslation).canvas = load;

                removeTranslates();
                renderTranslations();
              } catch (e) {
                return;
              }
            };
            $textarea.onkeydown = (ev: KeyboardEvent) => {
              if ($textarea === null) {
                return;
              }
              if ((ev.ctrlKey && ev.key == 'Enter') || ev.key == 'Escape') {
                $textarea.remove();
                $textarea = null;
              }
            };
            util.getBodyElement().appendChild($textarea);
          });
        }

        const ctx = $canvas.getContext('2d');
        if (ctx) {
          for (const shape of canvasData) {
            ctx.beginPath();
            ctx.fillStyle = shape.color || 'white';
            const t = shape.func;
            if (t == 'ellipse') {
              const [x, y, rx, ry] = shape.param;
              ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI);
            } else if (t == 'rect') {
              let [x, y, w, h] = shape.param;
              ctx.rect(x, y, w, h);
            }
            if (options.editableMode) {
              ctx.strokeStyle = 'red';
              ctx.stroke();
            } else {
              ctx.fill();
            }
          }
        }
        $frame.appendChild($canvas);
      }
      const image: cutTranslation[] = Array.isArray(data[imageId])
        ? (data[imageId] as cutTranslation[])
        : (data[imageId] as propertiedImageTranslation).text;
      for (let cutIndex: number = 0; cutIndex < image.length; cutIndex++) {
        const cut: cutTranslation = image[cutIndex];
        const $tlsGroup: HTMLDivElement = newTranslationGroup();
        for (let tlsIndex: number = 0; tlsIndex < cut.length; tlsIndex++) {
          {
            const datum = getDatum(imageId, cutIndex, tlsIndex);
            const text = typeof datum === 'string' ? datum : datum.text;
            if (
              (!options.developmentMode || !options.editableMode) &&
              (!text || Translation.isComment(text))
            ) {
              continue;
            }
          }
          const opt: any = {
            datum: getDatum(imageId, cutIndex, tlsIndex),
            address: [imageId, cutIndex, tlsIndex],
            tag: 'p',
            parent: $tlsGroup,
            type: 'speech',
            editableMode: options.developmentMode && options.editableMode,
            focus:
              focus !== undefined &&
              imageId === focus[0] &&
              cutIndex === focus[1] &&
              tlsIndex === focus[2]
          };
          if (options.developmentMode && options.editableMode) {
            opt.oninput = (ev: Event): any => {
              if (ev.target instanceof HTMLInputElement) {
                const target = ev.target as HTMLInputElement;
                const changed = target.value;
                const datum = getDatum(imageId, cutIndex, tlsIndex);

                target.size = TranslationElement.getPreferSize(changed.length);
                if (typeof datum === 'string') {
                  setDatum(changed, imageId, cutIndex, tlsIndex);
                } else {
                  datum.text = changed;
                  setDatum(datum, imageId, cutIndex, tlsIndex);
                }
                chrome.storage.local.set({ [location.pathname]: data }, () => {
                  log(`${location.pathname} is set`);
                  log(
                    `${imageId}-${cutIndex}-${tlsIndex} is ` +
                      getDatum(imageId, cutIndex, tlsIndex)
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
              const image: cutTranslation[] = Array.isArray(data[imageId])
                ? (data[imageId] as cutTranslation[])
                : (data[imageId] as propertiedImageTranslation).text;
              // Enter
              if (!ctrl && !shift && key === 'Enter') {
                image[cutIndex].splice(tlsIndex + 1, 0, '');
                focus = [imageId, cutIndex, tlsIndex + 1];
              } else if (!ctrl && shift && key === 'Enter') {
                image[cutIndex].splice(tlsIndex, 0, '');
                focus = [imageId, cutIndex, tlsIndex];
              } else if (ctrl && shift && key === 'Enter') {
                image.splice(cutIndex, 0, ['']);
                focus = [imageId, cutIndex, 0];
              } else if (ctrl && key === 'Enter') {
                image.splice(cutIndex + 1, 0, ['']);
                focus = [imageId, cutIndex + 1, 0];
              }
              // Backspace
              else if (key == 'Backspace' && text.length === 0) {
                const onlyTranslate =
                  image[cutIndex].length == 1 && tlsIndex === 0;
                const onlyCut = image.length == 1 && cutIndex === 0;
                if (!onlyTranslate) {
                  console.log('Delete a translate');
                  image[cutIndex].splice(tlsIndex, 1);
                  focus = [
                    imageId,
                    cutIndex,
                    tlsIndex - 1 >= 0 ? tlsIndex - 1 : -1
                  ];
                } else if (!onlyCut) {
                  console.log('Delete a cut');
                  image.splice(cutIndex, 1);
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
              setDatum(datum, imageId, cutIndex, tlsIndex);

              // Store data
              chrome.storage.local.set({ [location.pathname]: data }, () => {
                console.log(`${location.pathname} is set`);
              });
            };
          }

          const datum = getDatum(imageId, cutIndex, tlsIndex);
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
            opt.x = translate.x;
            opt.y = translate.y;
            opt.width = translate.w;
            opt.height = translate.h;
            if (!options.overwriteMode && translate['type']) {
              opt.type = translate['type'];
            }
          }
          opt.overwriteMode = false;
          if (options.overwriteMode) {
            if (options.developmentMode && options.editableMode) {
              new TranslationElement(opt as translationOption).render();
            }
            opt.overwriteMode = true;
            opt.parent = $frame;
            new TranslationElement(opt as translationOption).render();
          } else {
            new TranslationElement(opt as translationOption).render();
          }
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

function getDatum(
  imageId: string,
  cutIndex: number,
  tlsIndex: number
): translation {
  const image = data[imageId];
  if (Array.isArray(image)) {
    return image[cutIndex][tlsIndex];
  }
  return image.text[cutIndex][tlsIndex];
}

function setDatum(
  datum: translation,
  imageId: string,
  cutIndex: number,
  tlsIndex: number
): void {
  const image = data[imageId];
  if (Array.isArray(image)) {
    (data[imageId] as cutTranslation[])[cutIndex][tlsIndex] = datum;
  } else {
    (data[imageId] as propertiedImageTranslation).text[cutIndex][
      tlsIndex
    ] = datum;
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
    .querySelectorAll('.caption, .translation-group, canvas.overwrite, .frame')
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
      defaultOverwriteMode={options.overwriteMode}
      onChangeOverwriteMode={(event: React.ChangeEvent<HTMLInputElement>) => {
        removeTranslates();
        renderTranslations();
        options.overwriteMode = event.target.checked;
        onChangeSettings();
      }}
      defaultDevelopmentMode={options.developmentMode}
      onChangeDevelopmentMode={(event: React.ChangeEvent<HTMLInputElement>) => {
        options.developmentMode = event.target.checked;
        util
          .getBodyElement()
          .classList.toggle('development-mode', event.target.checked);
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
