import uuid from 'uuid/v4';

let _ids = {};

export const makeId = () => {
  const nextId = uuid();
  _ids[nextId] = { isLocal: true };
  return nextId;
};

export const isLocalId = (id) => {
  if (_ids[id]) {
    return _ids[id].isLocal;
  }
  return false;
};

export const setIdIsSaved = (id) => {
  if (_ids[id]) {
    _ids[id].isLocal = false;
  }
};