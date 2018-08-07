import Config, { CONFIG_SORTMODE } from './Config';

class NodeHandler {
  get element() {
    return this._element;
  }
  set isAlt(value) {
    this._alt = value;
    this._updateTheme();
  }
  constructor(line) {
    this._line = line;
    const domElement = document.createElement('div');
    domElement.classList.add('log-line');
    domElement.innerText = line;
    this._element = domElement;
  }
  hide() {
    this._element.classList.add('hidden');
  }
  show() {
    this._element.classList.remove('hidden');
  }
  _updateTheme() {
    if (this._alt) {
      this._element.classList.add('log-alt');
    } else {
      this._element.classList.remove('log-alt');
    }
  }
}

export const SORTING = {
  CHRONO: 'chronological',
  REVERSE: 'reverse-chronological',
};

export default class LogRenderer {
  set sortMode(value) {
    switch (value) {
      case SORTING.CHRONO:
        this._container.classList.remove('reverse');
        break;
      case SORTING.REVERSE:
        this._container.classList.add('reverse');
        break;
      default:
        console.error('Invalid sorting mode passed, mode=%s', value);
    }
  }
  constructor(dom) {
    if (!dom || !(dom instanceof HTMLElement)) {
      throw new Error('Invalid DOM element provided');
    }
    this._root = dom;
    const linesContainer = document.createElement('div');
    linesContainer.id = 'div-log-lines';
    linesContainer.classList.add('logs-list');
    this._root.appendChild(linesContainer);
    this._container = linesContainer;
    this._lines = [];
    this.sortMode = Config.get(CONFIG_SORTMODE) || SORTING.CHRONO;
  }
  onLine(payload) {
    const { line } = payload;
    const nh = new NodeHandler(line);
    this._container.appendChild(nh.element);
    this._lines.push(nh);
    nh.isAlt = this._lines.length % 2 === 0;
    this._refreshDOM();
  }
  _refreshDOM() {
    this._lines.forEach((nh) => {
      // Test the filter
      nh.show();
    });
  }
  clear() {
    this._container.innerHTML = '';
    while (this._lines.length) {
      this._lines.pop();
    }
  }
}
