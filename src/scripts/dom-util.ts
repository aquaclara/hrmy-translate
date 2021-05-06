const util = {
  /**
   * @return {HTMLBodyElement}
   */
  getBodyElement: (): HTMLBodyElement => {
    let documentBody: HTMLBodyElement;
    const frames = document.querySelectorAll('frame');
    if (
      document.querySelector('frameset') &&
      frames[1].contentWindow !== null
    ) {
      documentBody = frames[1].contentWindow.document.body as HTMLBodyElement;
    } else {
      documentBody = document.body as HTMLBodyElement;
    }
    return documentBody;
  },

  newChildOfBody: (): HTMLElement => {
    return util.getBodyElement().appendChild(document.createElement('div'));
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
        if (table === null) {
          throw new Error('table is not found');
        }
        if (prop == 'width') return element.offsetWidth;
        else if (prop == 'height') return element.offsetHeight;
        else if (prop == 'offsetTop')
          return element.offsetTop + table.offsetTop;
        else if (prop == 'offsetLeft')
          return element.offsetLeft + table.offsetLeft;
      default:
        throw new Error(`${element.tagName} is unexpected`);
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
      throw new Error(`${img.tagName} is unexpected`);
    }

    return url.pathname.replace(/^\//, '');
  },
};
export default util;
