const tlsPath = '/translations' + location.pathname.replace('.html', '.json');
const githubUrl = `https://raw.githubusercontent.com/aquaclara/hrmy-translate/main/${tlsPath}`;
const localUrl = chrome.runtime.getURL(tlsPath);

function main() {
  // Try fetching translations from Github
  const xhr = new XMLHttpRequest();
  xhr.open('GET', githubUrl, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState != 4) return;
    const res = xhr.responseText;
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

function handleResponse(response) {
  renderTranslations(JSON.parse(response));
  appendHotLinks(tlsPath.replace('.json', '.yaml'));
}

function printNotice(opt) {
  opt.class = ['notice', 'float'];

  printCaption(opt);
}

function printTranslation(opt) {
  opt.class = ['translation'];
  opt.tag = 'p';

  printCaption(opt);
}

/**
 *
 * @param {object} opt
 */
function printCaption(opt) {
  opt = opt || {};
  opt.tag = opt.tag || 'div';
  opt.parent = opt.parent || getBodyElement();

  const $caption = document.createElement(opt.tag);
  $caption.classList.add('caption');
  $caption.classList.add(...opt.class);

  $caption.innerHTML = opt.message;
  if (opt.color) {
    $caption.style.color = opt.color;
  }

  if (opt.top) {
    $caption.style.top = opt.top;
  }
  if (opt.left) {
    $caption.style.left = opt.left;
  }

  opt.parent.appendChild($caption);
}

function getImageId(img) {
  let url;

  if (img.tagName == 'IMG') {
    url = new URL(img.src);
  } else if (img.tagName == 'TD') {
    url = new URL(
      img.attributes.background.value,
      img.attributes.background.baseURI
    );
  } else {
    console.warn(`${img.tagName} is unexpected`);
    return null;
  }

  return url.pathname.replace(/^\//, '');
}

function renderTranslations(data) {
  for (const img of document.querySelectorAll('img, td[background]')) {
    const imageId = getImageId(img);
    if (!data || !(imageId in data)) {
      continue;
    }

    if (data[imageId] == null || data[imageId].length == 0) {
      printNotice({
        message: '(제공된 번역이 아직 없습니다)' + `<!--${imageId}-->`,
        top: getProperty(img, 'offsetTop') + 'px',
        left: getProperty(img, 'offsetLeft') + getProperty(img, 'width') + 'px'
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
          const opt = {
            tag: 'p',
            parent: $tlsGroup
          };
          if (typeof data[imageId][cutIndex][tlsIndex] == 'string') {
            opt.message = data[imageId][cutIndex][tlsIndex];
          } else {
            opt.message = data[imageId][cutIndex][tlsIndex]['text'];
            opt.color = data[imageId][cutIndex][tlsIndex]['color'];
          }
          printTranslation(opt);
        }
        $tlsGroup.style.top =
          getProperty(img, 'offsetTop') +
          (getProperty(img, 'height') / data[imageId].length) * cutIndex +
          'px';
        $tlsGroup.style.left =
          getProperty(img, 'offsetLeft') + getProperty(img, 'width') + 'px';
        getBodyElement().appendChild($tlsGroup);
      }
    }
  }
}

function appendHotLinks(tlsPath) {
  const $links = document.createElement('div');
  $links.classList.add('hot-links');
  appendConfigureLink($links);
  appendTranslateLink($links, tlsPath);
  getBodyElement().appendChild($links);
}

function appendConfigureLink($parent) {
  const $link = document.createElement('a');
  $link.classList.add('configure');
  $link.innerHTML = '&nbsp;';
  $link.onclick = e => {
    e.preventDefault();
    const massage =
      '설정은 준비중입니다.\n' +
      `버전: v${chrome.runtime.getManifest().version}\n` +
      '이 프로그램은 비공식입니다.\nThis program is unofficial.';

    alert(massage);
  };
  $parent.appendChild($link);
}

function appendTranslateLink($parent, tlsPath) {
  const $link = document.createElement('a');
  $link.classList.add('translate');
  $link.href = `https://github.com/aquaclara/hrmy-translate/blob/main/${tlsPath}`;
  $link.setAttribute('target', '_blank');
  $link.innerHTML = '번역 수정하기';
  $parent.appendChild($link);
}

main();
