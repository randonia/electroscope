import { remote } from 'electron';
import { Tail } from 'tail';

// Check at half second intervals
const TIMER = 500;
const log = [];
const logLines = document.getElementById('div-log-lines');
const filterLine = document.getElementById('txt-input-filter');
const selectedFileInput = document.getElementById('txt-selected-file');

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
    return this.data.join('\n');
  }
}

function populateCurrNode() {
  if (currNode && lastAppend <= (Date.now() - TIMER)) {
    log.push(currNode.finish());
    lastAppend = Date.now();
    currNode = undefined;
  }
}

function setFilters() {
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
      newData.innerText = item;
      logLines.prepend(newData);
    });
}

function setUpTail(path) {
  if (tail) {
    tail.unwatch();
  }
  if (path.length) {
    tail = new Tail(path);
  }
  tail.on('line', (data) => {
    if (!currNode) {
      currNode = new Node(data);
    } else {
      currNode.addText(data);
    }
    lastAppend = Date.now();
  });
}

document.getElementById('btn-load-selected-file').onclick = () => {
  pathToFile = selectedFileInput.value.trim();
  setUpTail(pathToFile);
};

setInterval(() => populateCurrNode(), 250);
setInterval(() => setFilters(log), 250);
