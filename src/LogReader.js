import { remote } from 'electron';
import { Tail } from 'tail';

const RE_MATCHER = /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}\.\d{2} <(error|info|debug)> \[/gm;
// Check at half second intervals
const TIMER = 500;
const log = [];
const logLines = document.getElementById('div-log-lines');
const filterLine = document.getElementById('txt-input-filter');
const selectedFileInput = document.getElementById('txt-selected-file');

let dirty = true;
let tail;
let pathToFile;

// Set up a default path
selectedFileInput.value = remote.app.getPath('userData');

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
    if (data.match(RE_MATCHER)) {
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
    const filteredLogs = log.filter((item) => {
      if (item.trim().length) {
        return item.indexOf(filterText) !== -1;
      }
      return true;
    });

    logLines.innerHTML = '';
    filteredLogs.forEach(
      (item) => {
        const newData = document.createElement('p');
        newData.setAttribute('class', 'log-line');
        newData.innerText = item;
        logLines.prepend(newData);
      });
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
}

document.getElementById('btn-load-selected-file').onclick = () => {
  pathToFile = selectedFileInput.value.trim();
  setUpTail(pathToFile);
};

setInterval(() => {
  checkCurrNodeFinish();
  setFilters(log);
}, 250);
