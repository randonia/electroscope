import { remote } from 'electron';
import { Tail } from 'tail';
import Config from './Config.js';

const RE_DEFAULT_OPTS = 'g';
const RE_REGEX_MATCHER = /\/(.+)\/([gmiy]*)/;
// Check at half second intervals
const TIMER = 500;
const log = [];
const logLines = document.getElementById('div-log-lines');
const filterLine = document.getElementById('txt-input-filter');
const selectedFileInput = document.getElementById('txt-selected-file');
const customLogFilterInput = document.getElementById('txt-custom-log-filter');

const SETTING_LOGPREFIX = 'logprefix';
const SETTING_LOGFILE = 'logfile';

let regexLogPrefix;

function setPrefix(customFilter) {
  let matcher;
  if (customFilter.startsWith('/') && customFilter.match(RE_REGEX_MATCHER)) {
    const [, matchedRegex, matchedOpts] = customFilter.match(RE_REGEX_MATCHER);
    matcher = new RegExp(matchedRegex, matchedOpts);
  } else {
    matcher = new RegExp(customFilter, RE_DEFAULT_OPTS);
  }
  regexLogPrefix = matcher;
  Config.set(SETTING_LOGPREFIX, customFilter);
}

const storedFilterValue = Config.get(SETTING_LOGPREFIX, '/^\\d{4}\\/\\d{2}\\/\\d{2} \\d{2}:\\d{2}:\\d{2}\\.\\d{3} - (error|info|debug|warn): \\[/m');
customLogFilterInput.value = storedFilterValue;
setPrefix(storedFilterValue);

let dirty = true;
let tail;
let pathToFile;

// Set up a default path
selectedFileInput.value = Config.get(SETTING_LOGFILE, remote.app.getPath('userData'));

let lastAppend = Number.NEGATIVE_INFINITY;
let currNode;

class Node {
  constructor(text) {
    this.data = [text];
  }
  addText(text) {
    this.data.push(text.trim());
  }
  finish() {
    return this.data.join('\n').trim();
  }
}

function finishCurrNode() {
  if (!currNode) {
    return;
  }
  log.push(currNode.finish());
}

function addDataToCurrNode(data) {
  if (!currNode) {
    currNode = new Node(data);
  } else {
    if (data.match(regexLogPrefix)) {
      finishCurrNode();
      currNode = new Node();
    }
    currNode.addText(data);
  }
}

function checkCurrNodeFinish() {
  if (currNode && lastAppend <= (Date.now() - TIMER)) {
    log.push(currNode.finish());
    lastAppend = Date.now();
    currNode = undefined;
    dirty = true;
  }
}

function setFilters() {
  if (dirty) {
    const filterText = filterLine.value;
    let matcher;
    try {
      if (filterText.startsWith('/') && filterText.match(RE_REGEX_MATCHER)) {
        const [, matchedRegex, matchedOpts] = filterText.match(RE_REGEX_MATCHER);
        matcher = new RegExp(matchedRegex, matchedOpts);
      } else {
        matcher = new RegExp(filterText, RE_DEFAULT_OPTS);
      }
      const filteredLogs = log.filter((item) => {
        if (item.trim().length) {
          return item.match(matcher);
        }
        return true;
      });
      logLines.innerHTML = '';
      filteredLogs.forEach(
        (item) => {
          const newData = document.createElement('p');
          const [, logStyle] = item.match(regexLogPrefix);
          newData.setAttribute('class', `log-line ${logStyle}`);
          newData.innerText = item;
          logLines.prepend(newData);
        });
    } catch (exception) {
      // A poor handling of the bad regex
      dirty = false;
      return;
    }

    dirty = false;
  }
}

function setUpTail(path) {
  if (tail) {
    tail.unwatch();
    while (log.length) {
      log.pop();
    }
  }
  if (path.length) {
    tail = new Tail(path);
  }
  tail.on('line', (data) => {
    dirty = true;
    addDataToCurrNode(data);
    lastAppend = Date.now();
  });
  Config.set(SETTING_LOGFILE, path);
}

document.getElementById('btn-load-selected-file').onclick = () => {
  pathToFile = selectedFileInput.value.trim();
  setUpTail(pathToFile);
};

document.getElementById('txt-input-filter').onkeyup = () => {
  dirty = true;
};

document.getElementById('btn-clear-log').onclick = () => {
  while (log.length) {
    log.pop();
  }
  dirty = true;
};

document.getElementById('btn-set-custom-filter').onclick = () => {
  const customFilter = customLogFilterInput.value.trim();
  setPrefix(customFilter);
};

setInterval(() => {
  checkCurrNodeFinish();
  setFilters(log);
}, 250);
