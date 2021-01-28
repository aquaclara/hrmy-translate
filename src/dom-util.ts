export default {
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
  getProperty: (element: HTMLElement, prop: string) => {
    switch (element.tagName) {
      case 'IMG':
        if (prop == 'width') return element.offsetWidth;
        else if (prop == 'height') return element.offsetHeight;
        else if (prop == 'offsetTop') return element.offsetTop;
        else if (prop == 'offsetLeft') return element.offsetLeft;
      case 'TD':
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
  }
};
