import { remote } from 'electron';
import { EventEmitter } from 'events';
import { Tail } from 'tail';
import touch from 'touch';

import Config, { CONFIG_POLLING } from './Config';

export const EVENT_LINE = 'logreader:line';

export default class LogReader extends EventEmitter {
  set polling(value) {
    if (value) {
      this._startPolling();
    } else {
      this._stopPolling();
    }
    this._polling = value;
  }
  constructor(logPath) {
    super();
    this._logPath = logPath;
    if (!logPath.length) {
      throw new Error('Invalid logpath provided');
    }
    this._makeTailObj();
    this.polling = Config.get(CONFIG_POLLING) || false;

    // DEBUG
    for (let count = 0; count < 15; count++) {
      setTimeout(() => {
        console.info('FIRING OFF DEBUG LOG EVENT');
        this.emit(EVENT_LINE, { line: `TEST LOG ${count}` });
      }, 100 + (25 * count))
    }

  }
  _makeTailObj() {
    if (!this._logPath) {
      throw new Error('Missing logPath!');
    }
    const tailReader = new Tail(this._logPath);
    tailReader.on('line', (data) => {
      this.emit(EVENT_LINE, { line: data });
    });
    tailReader.watch();

    // TODO: do the interval for touching 
    this._tail = tailReader;
  }
  _startPolling() {
    if (this._touchInterval) {
      console.warn('Attempted to start polling while already polling');
      return;
    }
    this._touchInterval = setInterval(() => {
      touch(this._logPath);
    }, 500);
    console.info('Started polling with intervalId=%s', this._touchInterval);
  }
  _stopPolling() {
    if (!this._touchInterval) {
      console.warn('Attempted to stop polling while not polling');
      return;
    }
    console.info('Ending polling with intervalId=%s', this._touchInterval);
    clearInterval(this._touchInterval);
    this._touchInterval = undefined;
  }
}
