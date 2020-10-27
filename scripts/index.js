function main() {
  const tlsPath =
    '/translations/' + location.pathname.replace('.html', '.json');
  const githubUrl = `https://raw.githubusercontent.com/aquaclara/hrmy-translate/main/${tlsPath}`;
  const localUrl = chrome.runtime.getURL(tlsPath);

  const xhr = new XMLHttpRequest();
  xhr.open('GET', githubUrl, true);
  xhr.onreadystatechange = () => {
    if (xhr.readyState == 4 && xhr.responseText) {
      const res = JSON.parse(xhr.responseText);
      renderTranslations(res);
      appendHotLinks(tlsPath.replace('.json', '.yaml'));
    } else {
      console.log('File does not exist on Github');
      const xhr = new XMLHttpRequest();
      xhr.open('GET', localUrl, true);
      xhr.onreadystatechange = () => {
        if (xhr.readyState == 4 && xhr.responseText) {
          const res = JSON.parse(xhr.responseText);
          renderTranslations(res);
          appendHotLinks(tlsPath.replace('.json', '.yaml'));
        } else {
          console.log(`File does not exist for '${tlsPath}'`);
        }
      };
      xhr.send();
    }
  };
  xhr.send();
}

function getBodyElement() {
  if (!this.documentBody) {
    if (document.querySelector('frameset')) {
      this.documentBody = document.querySelectorAll(
        'frame'
      )[1].contentWindow.document.body;
    } else {
      this.documentBody = document.body;
    }
  }
  return this.documentBody;
}

function renderTranslations(data) {
  [...document.querySelectorAll('img')].forEach(img => {
    const imageId = img.src.replace(new RegExp('https?://dka-hero.me/'), '');
    if (imageId in data && data[imageId]) {
      const tls = data[imageId];

      for (let cutIndex = 0; cutIndex < tls.length; cutIndex++) {
        const $tlsGroup = document.createElement('div');
        $tlsGroup.classList.add('translation-group', 'float');
        for (let tlsIndex = 0; tlsIndex < tls[cutIndex].length; tlsIndex++) {
          const $tls = document.createElement('p');
          $tls.classList.add('translation');
          $tls.innerHTML = tls[cutIndex][tlsIndex];
          $tlsGroup.appendChild($tls);
        }
        $tlsGroup.style.top =
          img.offsetTop + (img.height / tls.length) * cutIndex + 'px';
        $tlsGroup.style.left = img.offsetLeft + img.width + 'px';
        getBodyElement().appendChild($tlsGroup);
      }
    } else {
      const $caption = document.createElement('div');
      $caption.classList.add('caption', 'float');
      $caption.innerHTML = '(제공된 번역이 아직 없습니다)';
      $caption.style.top = img.offsetTop + 'px';
      $caption.style.left = img.offsetLeft + img.width + 'px';
      getBodyElement().appendChild($caption);
    }
  });
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
    alert('설정은 준비중입니다.');
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
