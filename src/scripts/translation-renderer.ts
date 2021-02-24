// Libraries
const yaml = require('js-yaml');
// Data models
import * as TranslationDataModel from './data-models/translation';
import FileTranslationChuckDataModel from './data-models/translation-chucks/file';
import * as imageTranslationChuckDataModel from './data-models/translation-chucks/image';
import CutTranslationChuckDataModel from './data-models/translation-chucks/cut';
// Html elements
import * as NoticeElement from './elements/notice';
import * as TranslationElement from './elements/translation';
import { isComment } from './data-models/comment';
// Etc
import TranslationDataContainer from './interfaces/translation-data-container';
import Util from './dom-util';
import * as Constant from './constants';
import { log, init as loggerInit } from './logger';

export interface TranslationRendererOption {
  data: FileTranslationChuckDataModel;
  extensionOption: Constant.ExtensionOptions;
}

export default class TranslationRenderer implements TranslationDataContainer {
  private _data: FileTranslationChuckDataModel;
  private _extensionOption: Constant.ExtensionOptions;

  constructor(opt: TranslationRendererOption) {
    this._data = opt.data;
    this._extensionOption = opt.extensionOption;
    loggerInit();
  }

  redrawTranslations() {
    this.removeTranslates();
    this.renderTranslations();
  }

  renderTranslations(focus?: TranslationElement.address) {
    // Handle negative index
    if (focus) {
      const image = this._data[focus[0]];
      const cuts: CutTranslationChuckDataModel[] = Array.isArray(image)
        ? image
        : image.text;
      log(focus);
      if (focus[1] < 0) {
        focus[1] = cuts.length + focus[1];
      }
      if (focus[2] < 0) {
        focus[2] = cuts[focus[1]].length + focus[2];
      }
    }

    for (const img of document.querySelectorAll(
      Constant.QUERY_SELECTOR_IMAGES
    ) as NodeListOf<HTMLImageElement | HTMLTableCellElement>) {
      const imageId = Util.getImageId(img);

      if (Constant.IMAGE_DENY_LIST.indexOf(imageId) >= 0) {
        continue;
      }
      if (
        !this._data ||
        this._data[imageId] === null ||
        this._data[imageId] === undefined ||
        (Array.isArray(this._data[imageId]) &&
          (this._data[imageId] as CutTranslationChuckDataModel[]).length === 0)
      ) {
        const opt: NoticeElement.noticeOption = {
          extensionOption: this._extensionOption,
          top: Util.getProperty(img, 'offsetTop') + 'px',
          left:
            Util.getProperty(img, 'offsetLeft') +
            Util.getProperty(img, 'width') +
            'px',
          onclick:
            this._extensionOption.developmentMode &&
            this._extensionOption.editableMode
              ? (): any => {
                  log(`clicked ${imageId}`);
                  if (!this._data) {
                    this._data = {};
                  }
                  this._data[imageId] = [['']];
                  this.removeTranslates();
                  this.renderTranslations([imageId, 0, 0]);
                }
              : undefined
        };
        new NoticeElement.Notice(opt).render();
      } else {
        const $frame = document.createElement('div');
        $frame.classList.add('frame');
        $frame.style.top = Util.getProperty(img, 'offsetTop') + 'px';
        $frame.style.left = Util.getProperty(img, 'offsetLeft') + 'px';
        $frame.style.width = Util.getProperty(img, 'width') + 'px';
        $frame.style.height = Util.getProperty(img, 'height') + 'px';
        Util.getBodyElement().appendChild($frame);
        if (
          this._extensionOption.overwriteMode &&
          !Array.isArray(this._data[imageId])
        ) {
          const canvasData = (this._data[
            imageId
          ] as imageTranslationChuckDataModel.PropertiedDataModel).masks;
          const $canvas: HTMLCanvasElement = document.createElement('canvas');
          $canvas.width = Util.getProperty(img, 'width');
          $canvas.height = Util.getProperty(img, 'height');
          $canvas.classList.add('overwrite');

          if (this._extensionOption.editableMode) {
            let $textarea: HTMLTextAreaElement | null = null;
            $canvas.addEventListener('click', e => {
              if ($textarea !== null) {
                return;
              }
              e.preventDefault();
              e.stopPropagation();
              $textarea = document.createElement('textarea');
              $textarea.classList.add('canvas-data');
              $textarea.defaultValue = yaml.dump(
                canvasData,
                Constant.YAML_OPTION
              );
              $textarea.oninput = () => {
                if ($textarea === null) {
                  return;
                }
                try {
                  const load = yaml.load($textarea.value);
                  (this._data[
                    imageId
                  ] as imageTranslationChuckDataModel.PropertiedDataModel).masks = load;

                  this.redrawTranslations();
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
              Util.getBodyElement().appendChild($textarea);
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
              if (this._extensionOption.editableMode) {
                ctx.strokeStyle = 'red';
                ctx.stroke();
              } else {
                ctx.fill();
              }
            }
          }
          $frame.appendChild($canvas);
        }
        const image: CutTranslationChuckDataModel[] = Array.isArray(
          this._data[imageId]
        )
          ? (this._data[imageId] as CutTranslationChuckDataModel[])
          : (this._data[
              imageId
            ] as imageTranslationChuckDataModel.PropertiedDataModel).text;
        for (let cutIndex: number = 0; cutIndex < image.length; cutIndex++) {
          const cut: CutTranslationChuckDataModel = image[cutIndex];
          const $tlsGroup: HTMLDivElement = this.newTranslationGroup();
          for (let tlsIndex: number = 0; tlsIndex < cut.length; tlsIndex++) {
            {
              const datum = this._getDatum(imageId, cutIndex, tlsIndex);
              const text = typeof datum === 'string' ? datum : datum.text;
              if (
                (!this._extensionOption.developmentMode ||
                  !this._extensionOption.editableMode) &&
                (!text || isComment(text))
              ) {
                continue;
              }
            }
            const opt: TranslationElement.translationOption = {
              extensionOption: this._extensionOption,
              datum: this._getDatum(imageId, cutIndex, tlsIndex),
              address: [imageId, cutIndex, tlsIndex],
              tag: 'p',
              parent: $tlsGroup,
              type: 'speech',
              focus:
                focus !== undefined &&
                imageId === focus[0] &&
                cutIndex === focus[1] &&
                tlsIndex === focus[2]
            };
            if (
              this._extensionOption.developmentMode &&
              this._extensionOption.editableMode
            ) {
              opt.onInput = (ev: Event): any => {
                if (ev.target instanceof HTMLInputElement) {
                  const target = ev.target as HTMLInputElement;
                  const changed = target.value;
                  const datum = this._getDatum(imageId, cutIndex, tlsIndex);

                  target.size = TranslationElement.Translation.getPreferSize(
                    changed.length
                  );
                  if (typeof datum === 'string') {
                    this._setDatum(changed, imageId, cutIndex, tlsIndex);
                  } else {
                    datum.text = changed;
                    this._setDatum(datum, imageId, cutIndex, tlsIndex);
                  }
                  chrome.storage.local.set(
                    { [location.pathname]: this._data },
                    () => {
                      log(`${location.pathname} is set`);
                      log(
                        `${imageId}-${cutIndex}-${tlsIndex} is ` +
                          this._getDatum(imageId, cutIndex, tlsIndex)
                      );
                    }
                  );
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
                const image: CutTranslationChuckDataModel[] = Array.isArray(
                  this._data[imageId]
                )
                  ? (this._data[imageId] as CutTranslationChuckDataModel[])
                  : (this._data[
                      imageId
                    ] as imageTranslationChuckDataModel.PropertiedDataModel)
                      .text;
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
                this.removeTranslates();
                this.renderTranslations(focus);

                // Store data
                chrome.storage.local.set(
                  { [location.pathname]: this._data },
                  () => {
                    console.log(`${location.pathname} is set`);
                  }
                );
                return true;
              };
              opt.changeDatum = (
                datum: TranslationDataModel.DataModel
              ): any => {
                this._setDatum(datum, imageId, cutIndex, tlsIndex);

                // Store data
                chrome.storage.local.set(
                  { [location.pathname]: this._data },
                  () => {
                    console.log(`${location.pathname} is set`);
                  }
                );
              };
            }

            const datum = this._getDatum(imageId, cutIndex, tlsIndex);
            const text = typeof datum === 'string' ? datum : datum.text;
            if (typeof cut[tlsIndex] === 'string') {
              if (
                (!this._extensionOption.developmentMode ||
                  !this._extensionOption.editableMode) &&
                isComment(text)
              ) {
                continue;
              }
              opt.message = text as string;
            } else {
              const translate = cut[
                tlsIndex
              ] as TranslationDataModel.PropertiedDataModel;
              opt.message = text;
              opt.marginLeft = translate['margin-left'];
              opt.x = translate.x;
              opt.y = translate.y;
              opt.width = translate.w;
              opt.height = translate.h;
              if (!this._extensionOption.overwriteMode && translate['type']) {
                opt.type = translate['type'];
              }
            }
            opt.overwriteMode = false;
            if (this._extensionOption.overwriteMode) {
              if (
                this._extensionOption.developmentMode &&
                this._extensionOption.editableMode
              ) {
                new TranslationElement.Translation(
                  opt as TranslationElement.translationOption
                ).render();
              }
              opt.overwriteMode = true;
              opt.parent = $frame;
              new TranslationElement.Translation(
                opt as TranslationElement.translationOption
              ).render();
            } else {
              new TranslationElement.Translation(opt).render();
            }
          }
          $tlsGroup.style.top =
            Util.getProperty(img, 'offsetTop') +
            (Util.getProperty(img, 'height') / image.length) * cutIndex +
            'px';
          $tlsGroup.style.left =
            Util.getProperty(img, 'offsetLeft') +
            Util.getProperty(img, 'width') +
            'px';
          Util.getBodyElement().appendChild($tlsGroup);
        }
      }
    }
  }

  newTranslationGroup(): HTMLDivElement {
    const $div = document.createElement('div');
    $div.classList.add('translation-group', 'float');
    $div.style.fontSize = `${this._extensionOption.fontSize}mm`;
    return $div;
  }

  removeTranslates() {
    document
      .querySelectorAll(
        '.caption, .translation-group, canvas.overwrite, .frame'
      )
      .forEach((e: Element) => {
        e.remove();
      });
  }

  getData(): FileTranslationChuckDataModel {
    return this._data;
  }

  setData(value: FileTranslationChuckDataModel): void {
    this._data = value;
  }

  getDataInYaml(): string {
    const dataToParse: any = this._data;
    dataToParse['//'] = Constant.LICENSE;
    const yamlText = yaml.dump(dataToParse, Constant.YAML_OPTION);
    return yamlText + '\n';
  }

  _getDatum(
    imageId: string,
    cutIndex: number,
    tlsIndex: number
  ): TranslationDataModel.DataModel {
    const image = this._data[imageId];
    if (Array.isArray(image)) {
      return image[cutIndex][tlsIndex];
    }
    return image.text[cutIndex][tlsIndex];
  }

  _setDatum(
    datum: TranslationDataModel.DataModel,
    imageId: string,
    cutIndex: number,
    tlsIndex: number
  ): void {
    const image = this._data[imageId];
    if (Array.isArray(image)) {
      (this._data[imageId] as CutTranslationChuckDataModel[])[cutIndex][
        tlsIndex
      ] = datum;
    } else {
      (this._data[
        imageId
      ] as imageTranslationChuckDataModel.PropertiedDataModel).text[cutIndex][
        tlsIndex
      ] = datum;
    }
  }
}
