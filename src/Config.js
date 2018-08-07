import ElectronConfig from 'electron-config';

const storage = new ElectronConfig();

export const CONFIG_SORTMODE = 'render.sortmode';
export const CONFIG_POLLING = 'reader.polling';

export default class Config {
  static get(key, defaultVal = undefined) {
    return storage.get(key, defaultVal);
  }

  static set(key, value) {
    storage.set(key, value);
  }
}
