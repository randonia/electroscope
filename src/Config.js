import ElectronConfig from 'electron-config';

const storage = new ElectronConfig();

export default class Config {
  static get(key, defaultVal = undefined) {
    return storage.get(key, defaultVal);
  }

  static set(key, value) {
    storage.set(key, value);
  }
}
