export class Store {
  constructor() {
    this._store = {}
  }
  register(id, data) {
    this._store[id] = data;
  }
  unregister(id) {
    delete this._store[id];
  }
  get(id) {
    return this._store[id];
  }
  has(id) {
    return !!this.get(id);
  }
}
