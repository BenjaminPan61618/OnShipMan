const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const Store = require('./store');

let store = null;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Referer": "https://live.bilibili.com/",
  "Origin": "https://live.bilibili.com",
};

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  store = new Store();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('get-captains', async () => {
  return store.getCaptains();
});

ipcMain.handle('save-captain', async (_, captain) => {
  return store.saveCaptain(captain);
});

ipcMain.handle('delete-captain', async (_, index) => {
  return store.deleteCaptain(index);
});

ipcMain.handle('import-txt', async () => {
  const { filePaths } = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [{ name: '文本文件', extensions: ['txt'] }, { name: '所有文件', extensions: ['*'] }]
  });
  
  if (filePaths && filePaths.length > 0) {
    return store.importFromTxt(filePaths[0]);
  }
  return null;
});

ipcMain.handle('export-txt', async (_, filledOnly = false) => {
  const { filePath } = await dialog.showSaveDialog({
    defaultPath: filledOnly ? '已填写地址导出.txt' : '舰长信息导出.txt',
    filters: [{ name: '文本文件', extensions: ['txt'] }]
  });
  
  if (filePath) {
    return store.exportToTxt(filePath, filledOnly);
  }
  return null;
});

ipcMain.handle('fetch-guards', async (_, uid) => {
  const https = require('https');

  const uidToRoomId = (uid) => {
    return new Promise((resolve) => {
      const api = `https://api.live.bilibili.com/live_user/v1/Master/info?uid=${uid}`;
      https.get(api, { headers: HEADERS }, (res) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const j = JSON.parse(data);
            if (j.code === 0 && j.data && j.data.room_id) {
              resolve(j.data.room_id);
            } else {
              resolve(null);
            }
          } catch {
            resolve(null);
          }
        });
      }).on('error', () => resolve(null));
    });
  };

  const fetchGuardNames = async (uid, roomid) => {
    const names = [];
    const seen = new Set();
    let page = 1;

    const fetchPage = (pageNum) => {
      return new Promise((resolve) => {
        const api = `https://api.live.bilibili.com/xlive/app-room/v2/guardTab/topListNew?roomid=${roomid}&ruid=${uid}&page=${pageNum}&page_size=29&typ=5`;
        https.get(api, { headers: HEADERS }, (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const j = JSON.parse(data);
              if (j.code === 0 && j.data) {
                const top3 = j.data.top3 || [];
                const list = j.data.list || [];
                
                top3.forEach(item => {
                  const name = item?.uinfo?.base?.name;
                  if (name && !seen.has(name)) {
                    seen.add(name);
                    names.push(name);
                  }
                });
                
                list.forEach(item => {
                  const name = item?.uinfo?.base?.name;
                  if (name && !seen.has(name)) {
                    seen.add(name);
                    names.push(name);
                  }
                });
                
                resolve(list.length > 0);
              } else {
                resolve(false);
              }
            } catch {
              resolve(false);
            }
          });
        }).on('error', () => resolve(false));
      });
    };

    while (true) {
      const hasMore = await fetchPage(page);
      if (!hasMore) break;
      page++;
      await new Promise(r => setTimeout(r, 1000));
    }

    return names;
  };

  try {
    const roomid = await uidToRoomId(uid);
    if (!roomid) {
      return { success: false, message: '未获取到房间号，该账号可能没有直播间' };
    }
    
    const names = await fetchGuardNames(uid, roomid);
    if (names.length === 0) {
      return { success: false, message: '未拉取到舰长信息' };
    }
    
    return { success: true, names };
  } catch (e) {
    return { success: false, message: e.message };
  }
});

ipcMain.handle('mark-all-pending', async () => {
  return store.markAllPending();
});

ipcMain.handle('mark-all-asked', async () => {
  return store.markAllAsked();
});

ipcMain.handle('copy-filled-addresses', async () => {
  return store.copyFilledAddresses();
});

ipcMain.handle('get-current-period', async () => {
  return {
    year: store.getCurrentYear(),
    month: store.getCurrentMonth()
  };
});

ipcMain.handle('set-current-period', async (_, { year, month }) => {
  const captains = store.setCurrentPeriod(year, month);
  return { success: true, captains };
});

ipcMain.handle('get-remembered-addresses', async () => {
  return store.getRememberedAddresses();
});

ipcMain.handle('add-remembered-address', async (_, address) => {
  return store.addRememberedAddress(address);
});

ipcMain.handle('remove-remembered-address', async (_, nickname) => {
  return store.removeRememberedAddress(nickname);
});

ipcMain.handle('get-remembered-address-by-nickname', async (_, nickname) => {
  return store.getRememberedAddressByNickname(nickname);
});

ipcMain.handle('clear-filled-captains', async () => {
  return store.clearFilledCaptains();
});

ipcMain.handle('clear-unfilled-captains', async () => {
  return store.clearUnfilledCaptains();
});

ipcMain.handle('clear-all-captains', async () => {
  return store.clearAllCaptains();
});

ipcMain.handle('add-saved-address', async (_, { captainIndex, address }) => {
  return store.addSavedAddress(captainIndex, address);
});

ipcMain.handle('delete-saved-address', async (_, { captainIndex, addrId }) => {
  return store.deleteSavedAddress(captainIndex, addrId);
});

ipcMain.handle('switch-to-saved-address', async (_, { captainIndex, addrId }) => {
  return store.switchToSavedAddress(captainIndex, addrId);
});
