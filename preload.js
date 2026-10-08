const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getCaptains: () => ipcRenderer.invoke('get-captains'),
  saveCaptain: (captain) => ipcRenderer.invoke('save-captain', captain),
  deleteCaptain: (index) => ipcRenderer.invoke('delete-captain', index),
  importTxt: () => ipcRenderer.invoke('import-txt'),
  exportTxt: (filledOnly) => ipcRenderer.invoke('export-txt', filledOnly),
  fetchGuards: (uid) => ipcRenderer.invoke('fetch-guards', uid),
  markAllPending: () => ipcRenderer.invoke('mark-all-pending'),
  markAllAsked: () => ipcRenderer.invoke('mark-all-asked'),
  copyFilledAddresses: () => ipcRenderer.invoke('copy-filled-addresses'),
  getCurrentPeriod: () => ipcRenderer.invoke('get-current-period'),
  setCurrentPeriod: ({ year, month }) => ipcRenderer.invoke('set-current-period', { year, month }),
  getRememberedAddresses: () => ipcRenderer.invoke('get-remembered-addresses'),
  addRememberedAddress: (address) => ipcRenderer.invoke('add-remembered-address', address),
  removeRememberedAddress: (nickname) => ipcRenderer.invoke('remove-remembered-address', nickname),
  getRememberedAddressByNickname: (nickname) => ipcRenderer.invoke('get-remembered-address-by-nickname', nickname),
  clearFilledCaptains: () => ipcRenderer.invoke('clear-filled-captains'),
  clearUnfilledCaptains: () => ipcRenderer.invoke('clear-unfilled-captains'),
  clearAllCaptains: () => ipcRenderer.invoke('clear-all-captains'),
  addSavedAddress: ({ captainIndex, address }) => ipcRenderer.invoke('add-saved-address', { captainIndex, address }),
  deleteSavedAddress: ({ captainIndex, addrId }) => ipcRenderer.invoke('delete-saved-address', { captainIndex, addrId }),
  switchToSavedAddress: ({ captainIndex, addrId }) => ipcRenderer.invoke('switch-to-saved-address', { captainIndex, addrId })
});
