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
  getProperty: (element, prop) => {
    switch (element.tagName) {
      case 'TD':
        if (prop == 'width') return element.offsetWidth;
        else if (prop == 'height') return element.offsetHeight;
        else return element.closest('table')[prop];
      case 'IMG':
        return element[prop];
      default:
        console.warn(`${element.tagName} is unexpected`);
        return null;
    }
  },

  /**
   * @param {HTMLElement} element
   * @return {number} the height of the given element
   */
  getHeight: element => {
    if (element.tagName == 'TD') {
      return element.offsetHeight;
    }
    return element.height;
  }
};
