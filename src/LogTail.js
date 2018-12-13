import { remote } from 'electron';
import { Tail } from 'tail';
import touch from 'touch';
import Config, { CONFIG_POLLING, CONFIG_SORTMODE } from './Config';
import LogReader, { EVENT_LINE } from './LogReader';
import LogRenderer, { SORTING } from './LogRenderer';

const RE_DEFAULT_OPTS = 'g';
const RE_REGEX_MATCHER = /\/(.+)\/([gmiy]*)/;
// Check at half second intervals
const TIMER = 500;
const log = [];
const logContainer = document.getElementById('log-container');
// const filterLine = document.getElementById('txt-input-filter');
const selectedFileInput = document.getElementById('txt-selected-file');
const customLogFilterInput = document.getElementById('txt-custom-log-filter');
const DOM_INPUT_FILTER = document.getElementById('txt-input-filter');
const DOM_BUTTON_LOADFILE = document.getElementById('btn-load-selected-file');
const DOM_CHECKBOX_SORTING = document.getElementById('chk-reverse');
const DOM_CHECKBOX_POLLING = document.getElementById('chk-polling');
const DOM_BUTTON_CLEARLOG = document.getElementById('btn-clear-log');

const SETTING_LOGPREFIX = 'logprefix';
const SETTING_LOGFILE = 'logfile';
const SETTING_THEME = 'theme';
const SETTING_ISREVERSE = 'isreverse';

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
let tailTouchInterval = NaN;

// Set up a default path
selectedFileInput.value = Config.get(SETTING_LOGFILE, remote.app.getPath('userData'));

let lastAppend = Number.NEGATIVE_INFINITY;
let currNode;

let reverse = true;
let isAtBottom = false;
let isAdvancedHidden = true;

let reader;
let renderer;

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
          if (reverse) {
            logLines.prepend(newData);
          } else {
            logLines.append(newData);
          }
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
    clearInterval(tailTouchInterval);
  }
  if (path.length) {
    tail = new Tail(path);
    tailTouchInterval = setInterval(() => {
      touch(path);
    }, 1000);
  }
  tail.on('line', (data) => {
    dirty = true;
    addDataToCurrNode(data);
    lastAppend = Date.now();
  });
  tail.watch();
  Config.set(SETTING_LOGFILE, path);
}

function setUpTail2(filePath) {
  // TODO: Make these singletons 
  reader = new LogReader(filePath);
  renderer = new LogRenderer(logContainer);
  reader.on(EVENT_LINE, line => renderer.onLine(line));
}

DOM_BUTTON_LOADFILE.onclick = () => {
  pathToFile = selectedFileInput.value.trim();
  setUpTail2(pathToFile);
  Config.set(SETTING_LOGFILE, pathToFile);
  DOM_BUTTON_LOADFILE.disabled = true;
};

document.getElementById('txt-input-filter').onkeyup = () => {
  dirty = true;
};

DOM_BUTTON_CLEARLOG.onclick = () => {
  if (renderer) {
    renderer.clear();
  }
};

DOM_CHECKBOX_POLLING.onclick = () => {
  const shouldPoll = DOM_CHECKBOX_POLLING.checked;
  Config.set(CONFIG_POLLING, shouldPoll);
  if (reader) {
    reader.polling = shouldPoll;
  }
};

DOM_CHECKBOX_SORTING.onclick = () => {
  const setReverse = document.getElementById('chk-reverse').checked;
  const sortMode = (setReverse) ? SORTING.REVERSE : SORTING.CHRONO;
  Config.set(CONFIG_SORTMODE, sortMode);
  if (renderer) {
    renderer.sortMode = sortMode;
  }
};

let _applyFilterDelayId;
DOM_INPUT_FILTER.onkeyup = () => {
  if (_applyFilterDelayId) {
    clearTimeout(_applyFilterDelayId);
  }
  _applyFilterDelayId = setTimeout(() => {
    renderer.filter = DOM_INPUT_FILTER.value;
  }, 250);
};

// document.getElementById('chk-reverse').onclick = () => {
//   reverse = document.getElementById('chk-reverse').checked;
//   Config.set(SETTING_ISREVERSE, reverse);
//   if (!reverse) {
//     // if toggled to not reverse, then set isAtBottom to true for scrolling
//     isAtBottom = true;
//   }
// };

function applyOrderByConfig() {
  reverse = Config.get(SETTING_ISREVERSE);
  document.getElementById('chk-reverse').checked = reverse;
  if (!reverse) {
    isAtBottom = true;
  }
}

function applyThemeByConfig() {
  const isDark = Config.get(SETTING_THEME) === 'dark';
  document.getElementById('chk-dark').checked = isDark;
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

document.getElementById('chk-dark').onclick = () => {
  const isDark = document.getElementById('chk-dark').checked;
  Config.set(SETTING_THEME, (isDark) ? 'dark' : 'light');
  applyThemeByConfig();
};

document.getElementById('btn-set-custom-filter').onclick = () => {
  const customFilter = customLogFilterInput.value.trim();
  setPrefix(customFilter);
};

document.getElementById('show-advanced').onclick = () => {
  if (isAdvancedHidden) {
    document.getElementById('advanced-opts').classList.remove('hidden');
    document.getElementById('show-advanced').innerHTML = 'Hide Advanced';
    isAdvancedHidden = false;
  } else {
    document.getElementById('advanced-opts').classList.add('hidden');
    document.getElementById('show-advanced').innerHTML = 'Show Advanced';
    isAdvancedHidden = true;
  }
};

window.onscroll = () => {
  isAtBottom = ((window.innerHeight + window.scrollY) >= document.body.offsetHeight);
};

// setInterval(() => {
//   checkCurrNodeFinish();
//   setFilters(log);
//   if (!reverse && isAtBottom) {
//     document.getElementById('bottom').scrollIntoView();
//   }
// }, 250);

window.onload = () => {
  applyThemeByConfig();
  applyOrderByConfig();
  DOM_CHECKBOX_SORTING.checked = Config.get(CONFIG_SORTMODE) === SORTING.REVERSE;
};
