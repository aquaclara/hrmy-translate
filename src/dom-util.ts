const util = {
  /**
   * @return {HTMLBodyElement}
   */
  getBodyElement: () => {
    let documentBody;
    if (document.querySelector('frameset')) {
      documentBody = document.querySelectorAll('frame')[1].contentWindow
        .document.body;
    } else {
      documentBody = document.body;
    }
    return documentBody;
  },

  /**
   * @param {HTMLElement} element
   * @param {string} property
   * @return {number} the offset top of the given element
   */
  getProperty: (
    element: HTMLElement,
    prop: 'width' | 'height' | 'offsetTop' | 'offsetLeft'
  ): number => {
    switch (element.tagName) {
      case 'IMG':
        const wrapperTableCell = element.closest('td');
        if (wrapperTableCell) {
          return util.getProperty(wrapperTableCell, prop);
        }
        if (prop == 'width') return element.offsetWidth;
        else if (prop == 'height') return element.offsetHeight;
        else {
          return element[prop];
        }
      case 'TD':
      case 'TR':
        const table = element.closest('table');
        if (prop == 'width') return element.offsetWidth;
        else if (prop == 'height') return element.offsetHeight;
        else if (prop == 'offsetTop')
          return element.offsetTop + table.offsetTop;
        else if (prop == 'offsetLeft')
          return element.offsetLeft + table.offsetLeft;
      default:
        console.warn(`${element.tagName} is unexpected`);
        return null;
    }
  },

  /**
   * @param {HTMLElement} element
   * @return {number} the height of the given element
   */
  getHeight: (element: HTMLElement) => {
    if (element.tagName == 'TD') {
      return element.offsetHeight;
    }
    if (element instanceof HTMLImageElement) {
      return element.height;
    } else {
      console.debug(`Unknown element: ${element}`);
      return 0;
    }
  },

  getImageId: (img: HTMLImageElement | HTMLTableCellElement): string => {
    let url;

    if (img.tagName == 'IMG') {
      url = new URL((img as HTMLImageElement).src);
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
};
export default util;
