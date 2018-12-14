import { remote } from 'electron';
import Config, { CONFIG_POLLING, CONFIG_SORTMODE } from './Config';
import LogReader, { EVENT_LINE } from './LogReader';
import LogRenderer, { SORTING } from './LogRenderer';

const logContainer = document.getElementById('log-container');
const selectedFileInput = document.getElementById('txt-selected-file');
const customLogFilterInput = document.getElementById('txt-custom-log-filter');

const DOM_BUTTON_CLEARLOG = document.getElementById('btn-clear-log');
const DOM_BUTTON_LOADFILE = document.getElementById('btn-load-selected-file');
const DOM_BUTTON_SHOW_ADVANCED = document.getElementById('show-advanced');
const DOM_CHECKBOX_POLLING = document.getElementById('chk-polling');
const DOM_CHECKBOX_SORTING = document.getElementById('chk-reverse');
const DOM_CHECKBOX_THEME = document.getElementById('chk-dark');
const DOM_INPUT_FILTER = document.getElementById('txt-input-filter');
const DOM_INPUT_HIGHLIGHT = document.getElementById('txt-input-highlight');
const DOM_INPUT_PARSE_FILTER = document.getElementById('btn-set-custom-filter');

const SETTING_LOGPREFIX = 'logprefix';
const SETTING_LOGFILE = 'logfile';
const SETTING_THEME = 'theme';
const SETTING_ISREVERSE = 'isreverse';

let _applyFilterDelayId;
let _applyHighlightTimeoutId;

function setPrefix(customFilter) {
  Config.set(SETTING_LOGPREFIX, customFilter);
}

const storedFilterValue = Config.get(SETTING_LOGPREFIX, '/^\\d{4}\\/\\d{2}\\/\\d{2} \\d{2}:\\d{2}:\\d{2}\\.\\d{3} - (error|info|debug|warn): \\[/m');
customLogFilterInput.value = storedFilterValue;
setPrefix(storedFilterValue);

let pathToFile;

// Set up a default path
selectedFileInput.value = Config.get(SETTING_LOGFILE, remote.app.getPath('userData'));

let reverse = true;
let isAdvancedHidden = true;

let reader;
let renderer;

function addLogTailer(filePath) {
  reader = new LogReader(filePath);
  renderer = new LogRenderer(logContainer);
  reader.on(EVENT_LINE, line => renderer.onLine(line));
}

function initializeLogTail() {
  pathToFile = selectedFileInput.value.trim();
  addLogTailer(pathToFile);
  Config.set(SETTING_LOGFILE, pathToFile);
  DOM_BUTTON_LOADFILE.disabled = true;
}

DOM_BUTTON_LOADFILE.onclick = initializeLogTail;

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

DOM_CHECKBOX_SORTING.onchange = () => {
  const setReverse = document.getElementById('chk-reverse').checked;
  const sortMode = (setReverse) ? SORTING.REVERSE : SORTING.CHRONO;
  Config.set(CONFIG_SORTMODE, sortMode);
  if (renderer) {
    renderer.sortMode = sortMode;
  }
};

DOM_INPUT_FILTER.onkeyup = () => {
  if (_applyFilterDelayId) {
    clearTimeout(_applyFilterDelayId);
  }
  _applyFilterDelayId = setTimeout(() => {
    renderer.filter = DOM_INPUT_FILTER.value;
  }, 250);
};

DOM_INPUT_HIGHLIGHT.onkeyup = () => {
  if (_applyHighlightTimeoutId) {
    clearTimeout(_applyHighlightTimeoutId);
  }
  _applyHighlightTimeoutId = setTimeout(() => {
    renderer.highlight = DOM_INPUT_HIGHLIGHT.value;
  }, 250);
};

function applyOrderByConfig() {
  reverse = Config.get(SETTING_ISREVERSE);
  document.getElementById('chk-reverse').checked = reverse;
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

DOM_CHECKBOX_THEME.onchange = () => {
  const isDark = document.getElementById('chk-dark').checked;
  Config.set(SETTING_THEME, (isDark) ? 'dark' : 'light');
  applyThemeByConfig();
};

DOM_INPUT_PARSE_FILTER.onchange = () => {
  const customFilter = customLogFilterInput.value.trim();
  setPrefix(customFilter);
};

DOM_BUTTON_SHOW_ADVANCED.onclick = () => {
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

window.onload = () => {
  applyThemeByConfig();
  applyOrderByConfig();
  DOM_CHECKBOX_SORTING.checked = Config.get(CONFIG_SORTMODE) === SORTING.REVERSE;
};
