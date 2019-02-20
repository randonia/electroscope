import EscapeHTML from 'escape-html';
import Config, { CONFIG_SORTMODE } from './Config';

class NodeHandler {
  get element() {
    return this._element;
  }
  get line() {
    return this._line;
  }
  set isAlt(value) {
    this._alt = value;
    this._updateTheme();
  }
  constructor(line) {
    this._line = line;
    const domElement = document.createElement('div');
    domElement.classList.add('log-line');
    this._element = domElement;
    this._processContents();
  }
  hide() {
    this._element.classList.add('hidden');
  }
  show() {
    this._element.classList.remove('hidden');
  }
  highlight(matcher) {
    const cleanLine = EscapeHTML(this._line);
    if (!matcher) {
      // return to non-styled view
      this._element.innerHTML = cleanLine;
      return;
    }
    this._element.innerHTML = cleanLine.replace(matcher, '<span class="log-highlight">$&</span>');
  }
  _processContents() {
    if (/- debug:/.test(this.line)) {
      this._element.classList.add('level-debug');
    }
    if (/- info:/.test(this.line)) {
      this._element.classList.add('level-info');
    }
    if (/- warn:/.test(this.line)) {
      this._element.classList.add('level-warn');
    }
    if (/- error:/.test(this.line)) {
      this._element.classList.add('level-error');
    }
    this._element.innerHTML = this._line.replace(/\n/g, '<br>\n');
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

const RE_REGEX_TEST_IS_REGEX = /\/(.+)\/([gmiy]*)/;
const RE_DEFAULT_OPTS = 'ig';

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
  set filter(value) {
    this._filter = value;
    this._refreshDOM();
  }
  set highlight(value) {
    this._highlight = value;
    this._refreshDOM();
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
    if (!line.trim().length) {
      return;
    }
    const nh = new NodeHandler(line);
    this._container.appendChild(nh.element);
    this._lines.push(nh);
    nh.isAlt = this._lines.length % 2 === 0;
    this._refreshDOM();
  }
  _refreshDOM() {
    let matcherRegex;
    let highlightRegEx;

    if (!this._filter || !this._filter.length) {
      // show all
      matcherRegex = /.+/;
    } else {
      const filter = this._filter;
      // _filter is a matcherRegex string
      if (filter.startsWith('/')) {
        // Handle safely parsing incomplete matcherRegex
        if (filter.match(RE_REGEX_TEST_IS_REGEX)) {
          const [, matchedRegex, matchedOpts] = filter.match(RE_REGEX_TEST_IS_REGEX);
          matcherRegex = new RegExp(matchedRegex, matchedOpts);
        } else {
          // HANDLE INCOMPLETE OR STARTS_WITH /
        }
      } else {
        matcherRegex = new RegExp(filter, RE_DEFAULT_OPTS);
      }
    }

    // Apply a highlight if it exists
    if (this._highlight && this._highlight.length) {
      const highlighter = this._highlight;
      if (highlighter.startsWith('/')) {
        // Make sure it's valid regex
        if (highlighter.match(RE_REGEX_TEST_IS_REGEX)) {
          const [, matchedRegex, matchedOpts] = highlighter.match(RE_REGEX_TEST_IS_REGEX);
          highlightRegEx = new RegExp(matchedRegex, matchedOpts);
        } else {
          // Incomplete RegEx is ignored
        }
      } else {
        highlightRegEx = new RegExp(highlighter, RE_DEFAULT_OPTS);
      }
    }
    this._lines.forEach((nh) => {
      // Test the filter
      if (matcherRegex.test(nh.line)) {
        nh.show();
      } else {
        nh.hide();
      }
      nh.highlight(highlightRegEx);
    });
  }
  clear() {
    this._container.innerHTML = '';
    while (this._lines.length) {
      this._lines.pop();
    }
  }
}
