import { remote } from 'electron';
import { EventEmitter } from 'events';
import { Tail } from 'tail';

export default class LogReader extends EventEmitter {
  constructor(logPath) {
    super();
    this._logPath = logPath;
  }
}
