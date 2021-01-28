import util from './dom-util';
import './scss/styles.scss';
import React from 'react';
import ReactDOM from 'react-dom';

const tlsPath = '/translations' + location.pathname.replace('.html', '.json');
const githubUrl = `https://raw.githubusercontent.com/aquaclara/hrmy-translate/main/${tlsPath}`;
const localUrl = chrome.runtime.getURL(tlsPath);

function main() {
  // Try fetching translations from Github
  const xhr = new XMLHttpRequest();
  xhr.open('GET', githubUrl, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState != 4) return;
    const res: string = xhr.responseText;
    if (res && res != 'null' && res != '404: Not Found') {
      handleResponse(res);
    } else {
      console.log(
        'File does not exist on Github. Try reading translations from local'
      );
      const xhr = new XMLHttpRequest();
      xhr.open('GET', localUrl, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState != 4) return;
        const res = xhr.responseText;
        if (res && res != 'null' && res != '404: Not Found') {
          handleResponse(res);
        } else {
          console.log(`File does not exist for '${tlsPath}'`);
        }
      };
      xhr.send();
    }
  };
  xhr.send();
}

function handleResponse(response: string) {
  renderTranslations(JSON.parse(response));
  appendHotLinks(tlsPath.replace('.json', '.yaml'));
}

type captionOption = {
  tag?: 'div' | 'p';
  class?: Array<string>;
  message?: string;
  parent?: Element;

  top?: string;
  left?: string;
  color?: string;
  marginTop?: string;
  marginLeft?: string;
};

function printNotice(opt: captionOption) {
  opt.class = ['notice', 'float'];

  printCaption(opt);
}

function printTranslation(opt: captionOption) {
  opt.class = ['translation'];
  opt.tag = 'p';

  printCaption(opt);
}

/**
 *
 * @param {object} opt
 */
function printCaption(opt: captionOption) {
  opt = opt || {};
  opt.tag = opt.tag || 'div';
  opt.parent = opt.parent || util.getBodyElement();

  const $caption = document.createElement(opt.tag);
  $caption.classList.add('caption');
  $caption.classList.add(...opt.class);

  $caption.innerHTML = opt.message;
  if (opt.color) {
    $caption.style.color = opt.color;
  }
  if (opt.marginTop) {
    $caption.style.marginTop = opt.marginTop;
  }
  if (opt.marginLeft) {
    $caption.style.marginLeft = opt.marginLeft;
  }

  if (opt.top) {
    $caption.style.top = opt.top;
  }
  if (opt.left) {
    $caption.style.left = opt.left;
  }

  opt.parent.appendChild($caption);
}

function getImageId(img: HTMLImageElement) {
  let url;

  if (img.tagName == 'IMG') {
    url = new URL(img.src);
  } else if (img.tagName == 'TD') {
    // HERO uses legacy background attribute
    const attr: any = img.attributes;
    url = new URL(attr.background.value, attr.background.baseURI);
  } else {
    console.warn(`${img.tagName} is unexpected`);
    return null;
  }

  return url.pathname.replace(/^\//, '');
}

function renderTranslations(data: any) {
  for (const img of document.querySelectorAll(
    'img, td[background]'
  ) as NodeListOf<HTMLImageElement>) {
    const imageId = getImageId(img);
    if (!data || !(imageId in data)) {
      continue;
    }

    if (data[imageId] == null || data[imageId].length == 0) {
      printNotice({
        message: '(제공된 번역이 아직 없습니다)' + `<!--${imageId}-->`,
        top: util.getProperty(img, 'offsetTop') + 'px',
        left:
          util.getProperty(img, 'offsetLeft') +
          util.getProperty(img, 'width') +
          'px'
      });
    } else {
      for (let cutIndex = 0; cutIndex < data[imageId].length; cutIndex++) {
        const $tlsGroup = document.createElement('div');
        $tlsGroup.classList.add('translation-group', 'float');
        for (
          let tlsIndex = 0;
          tlsIndex < data[imageId][cutIndex].length;
          tlsIndex++
        ) {
          const opt: captionOption = {
            tag: 'p',
            parent: $tlsGroup
          };
          if (typeof data[imageId][cutIndex][tlsIndex] == 'string') {
            opt.message = data[imageId][cutIndex][tlsIndex];
          } else {
            opt.message = data[imageId][cutIndex][tlsIndex]['text'];
            opt.color = data[imageId][cutIndex][tlsIndex]['color'];
            opt.marginLeft = data[imageId][cutIndex][tlsIndex]['margin-left'];
          }
          printTranslation(opt);
        }
        $tlsGroup.style.top =
          util.getProperty(img, 'offsetTop') +
          (util.getProperty(img, 'height') / data[imageId].length) * cutIndex +
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

function appendHotLinks(tlsPath: string) {
  const $links = document.createElement('div');
  $links.classList.add('hot-links');
  appendConfigureLink($links);
  appendTranslateLink($links, tlsPath);
  util.getBodyElement().appendChild($links);
}

function appendConfigureLink($parent: Element) {
  const $link = document.createElement('a');
  $link.classList.add('configure');
  $link.innerHTML = '&nbsp;';
  $link.onclick = e => {
    e.preventDefault();
    const mBrowser = typeof browser === 'undefined' ? chrome : browser;
    const version = mBrowser.runtime.getManifest().version;

    const massage = '';

    const $dialog = (
      <div className="dialog">
        <p>버전: v{version}</p>
        <p>
          이 프로그램은 비공식입니다.
          <br />
          This program is unofficial.
        </p>
        <label>글자 크기 (단위: mm)</label>
        <input
          type="range"
          id="font-size"
          min="1"
          max="11"
          defaultValue="5"
          onChange={event => changeFontSize(parseInt(event.target.value))}
        />
      </div>
    );
    let $overlay = document.querySelector('#overlay') as HTMLElement;
    if (!$overlay) {
      $overlay = document.createElement('div');
      $overlay.id = 'overlay';
      $overlay.classList.add('overlay');
      $overlay.onclick = e => {
        if ($overlay === e.target) {
          $overlay.style.visibility = 'hidden';
        }
      };
      ReactDOM.render($dialog, $overlay);
      util.getBodyElement().appendChild($overlay);
    } else {
      $overlay.style.visibility = 'visible';
    }
  };
  $parent.appendChild($link);
}

function changeFontSize(size: number) {
  for (const caption of document.querySelectorAll('.caption') as NodeListOf<
    HTMLElement
  >) {
    caption.style.fontSize = `${size}mm`;
  }
}

function appendTranslateLink($parent: Element, tlsPath: string) {
  const $link = document.createElement('a');
  $link.classList.add('translate');
  $link.href = `https://github.com/aquaclara/hrmy-translate/blob/main/${tlsPath}`;
  $link.setAttribute('target', '_blank');
  $link.innerHTML = '번역 수정하기';
  $parent.appendChild($link);
}

main();
