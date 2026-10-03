const ElectronStore = require('electron-store');
const fs = require('fs');
const path = require('path');

const SYMBOLS = {
  "!": { name: "无需", color: "#9E9E9E" },
  "@": { name: "已询问(QQ)", color: "#2196F3" },
  "#": { name: "已询问(B站)", color: "#2196F3" },
  "*": { name: "无法联系", color: "#F44336" },
  "^": { name: "待询问", color: "#FF9800" },
  "&": { name: "小号", color: "#9C27B0" },
  "-": { name: "特殊情况", color: "#607D8B" },
  "~": { name: "主播", color: "#E91E63" },
  " ": { name: "已填写", color: "#4CAF50" }
};

class Store {
  constructor() {
    const now = new Date();
    const defaultYear = now.getFullYear();
    const defaultMonth = String(now.getMonth() + 1).padStart(2, '0');
    
    const dataPath = path.join(__dirname, 'data');
    if (!fs.existsSync(dataPath)) {
      fs.mkdirSync(dataPath, { recursive: true });
    }
    
    this.store = new ElectronStore({
      cwd: dataPath,
      schema: {
        currentYear: { type: 'number', default: defaultYear },
        currentMonth: { type: 'string', default: defaultMonth },
        rememberedAddresses: {
          type: 'array',
          default: [],
          items: {
            type: 'object',
            properties: {
              nickname: { type: 'string' },
              recipient: { type: 'string' },
              phone: { type: 'string' },
              address: { type: 'string' }
            }
          }
        }
      }
    });
  }

  _getCaptainsKey(year, month) {
    return `captains_${year}_${month}`;
  }

  _getCurrentCaptainsKey() {
    return this._getCaptainsKey(this.getCurrentYear(), this.getCurrentMonth());
  }

  getCurrentYear() {
    return this.store.get('currentYear');
  }

  getCurrentMonth() {
    return this.store.get('currentMonth');
  }

  setCurrentPeriod(year, month) {
    this.store.set('currentYear', year);
    this.store.set('currentMonth', month);
    return this.getCaptains();
  }

  getRememberedAddresses() {
    return this.store.get('rememberedAddresses', []);
  }

  addRememberedAddress(address) {
    const addresses = this.getRememberedAddresses();
    const existingIndex = addresses.findIndex(a => a.nickname === address.nickname);
    
    if (existingIndex >= 0) {
      addresses[existingIndex] = { ...address };
    } else {
      addresses.push({ ...address });
    }
    
    this.store.set('rememberedAddresses', addresses);
    return addresses;
  }

  removeRememberedAddress(nickname) {
    const addresses = this.getRememberedAddresses();
    const filtered = addresses.filter(a => a.nickname !== nickname);
    this.store.set('rememberedAddresses', filtered);
    return filtered;
  }

  getRememberedAddressByNickname(nickname) {
    const addresses = this.getRememberedAddresses();
    return addresses.find(a => a.nickname === nickname);
  }

  getCaptains() {
    const key = this._getCurrentCaptainsKey();
    return this.store.get(key, []);
  }

  saveCaptain(captain) {
    const key = this._getCurrentCaptainsKey();
    const captains = this.getCaptains();
    
    if (captain.index !== undefined && captain.index >= 0) {
      captains[captain.index] = {
        status: captain.status || '^',
        nickname: captain.nickname,
        recipient: captain.recipient || '',
        phone: captain.phone || '',
        address: captain.address || '',
        filled: Boolean(captain.recipient && captain.phone && captain.address),
        remembered: captain.remembered || false
      };
      
      if (captains[captain.index].filled) {
        captains[captain.index].status = ' ';
      }
    } else {
      const filled = Boolean(captain.recipient && captain.phone && captain.address);
      captains.push({
        status: filled ? ' ' : (captain.status || '^'),
        nickname: captain.nickname,
        recipient: captain.recipient || '',
        phone: captain.phone || '',
        address: captain.address || '',
        filled,
        remembered: captain.remembered || false
      });
    }
    
    this.store.set(key, captains);
    return captains;
  }

  deleteCaptain(index) {
    const key = this._getCurrentCaptainsKey();
    const captains = this.getCaptains();
    captains.splice(index, 1);
    this.store.set(key, captains);
    return captains;
  }

  importFromTxt(filePath) {
    try {
      const key = this._getCurrentCaptainsKey();
      const content = fs.readFileSync(filePath, 'utf-8');
      const lines = content.split('\n');
      const captains = [];
      let i = 0;

      while (i < lines.length) {
        const line = lines[i].trim();
        if (!line) {
          i++;
          continue;
        }

        let status, nickname;
        if (line[0] in SYMBOLS) {
          if (line.length > 2) {
            status = line[0];
            nickname = line.substring(2).trim();
          } else {
            status = line[0];
            nickname = '';
          }
        } else {
          status = ' ';
          nickname = line;
        }

        let recipient = '', phone = '', address = '', filled = false;

        if (i + 3 < lines.length) {
          const nextLine1 = lines[i + 1].trim();
          const nextLine2 = lines[i + 2].trim();
          const nextLine3 = lines[i + 3].trim();

          if (nextLine1 && (nextLine2.replace(/\s/g, '').match(/^\d+$/) || nextLine3.includes('省') || nextLine3.includes('市') || nextLine3.includes('区'))) {
            recipient = nextLine1;
            phone = nextLine2;
            address = nextLine3;
            filled = Boolean(recipient && phone && address);
            if (filled) status = ' ';
            i += 4;
          } else {
            if (!status) status = '^';
            i += 1;
          }
        } else {
          if (!status) status = '^';
          i += 1;
        }

        captains.push({ status, nickname, recipient, phone, address, filled });

        while (i < lines.length && !lines[i].trim()) {
          i++;
        }
      }

      this.store.set(key, captains);
      return { success: true, count: captains.length };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  exportToTxt(filePath, filledOnly = false) {
    try {
      let captains = this.getCaptains();
      if (filledOnly) {
        captains = captains.filter(c => c.filled);
      }

      let content = '';
      captains.forEach(captain => {
        if (captain.filled) {
          content += captain.nickname + '\n';
          content += captain.recipient + '\n';
          content += captain.phone + '\n';
          content += captain.address + '\n\n';
        } else {
          content += captain.status + ' ' + captain.nickname + '\n\n';
        }
      });

      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const testPath = path.join(dir, 'test_write.tmp');
      try {
        fs.writeFileSync(testPath, 'test', 'utf-8');
        fs.unlinkSync(testPath);
      } catch (e) {
        const fallbackDir = path.join(__dirname, 'data', 'exports');
        if (!fs.existsSync(fallbackDir)) {
          fs.mkdirSync(fallbackDir, { recursive: true });
        }
        const fileName = path.basename(filePath);
        filePath = path.join(fallbackDir, fileName);
      }

      fs.writeFileSync(filePath, content, 'utf-8');
      return { success: true, count: captains.length, filePath };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  markAllPending() {
    const key = this._getCurrentCaptainsKey();
    const captains = this.getCaptains();
    const protectedSymbols = ['!', '&', '-', '~'];
    let count = 0;

    captains.forEach(captain => {
      if (!captain.filled && !protectedSymbols.includes(captain.status)) {
        captain.status = '^';
        count++;
      }
    });

    this.store.set(key, captains);
    return { success: true, count };
  }

  markAllAsked() {
    const key = this._getCurrentCaptainsKey();
    const captains = this.getCaptains();
    let count = 0;

    captains.forEach(captain => {
      if (!captain.filled && captain.status === '^') {
        captain.status = '@';
        count++;
      }
    });

    this.store.set(key, captains);
    return { success: true, count };
  }

  copyFilledAddresses() {
    const captains = this.getCaptains();
    const filledCaptains = captains.filter(c => c.filled);
    
    if (filledCaptains.length === 0) {
      return { success: false, message: '没有已填写的舰长地址' };
    }

    let content = '';
    filledCaptains.forEach(captain => {
      content += captain.recipient + '\n';
      content += captain.phone + '\n';
      content += captain.address + '\n\n';
    });

    try {
      const { clipboard } = require('electron');
      clipboard.writeText(content.trim());
      return { success: true, count: filledCaptains.length };
    } catch (e) {
      return { success: false, message: e.message };
    }
  }

  addGuards(names) {
    const key = this._getCurrentCaptainsKey();
    const captains = this.getCaptains();
    const existingNames = new Set(captains.map(c => c.nickname));
    let count = 0;

    names.forEach(name => {
      if (!existingNames.has(name)) {
        captains.push({
          status: '^',
          nickname: name,
          recipient: '',
          phone: '',
          address: '',
          filled: false,
          remembered: false
        });
        count++;
      }
    });

    this.store.set(key, captains);
    return { success: true, count };
  }

  clearFilledCaptains() {
    const key = this._getCurrentCaptainsKey();
    const captains = this.getCaptains();
    const unfilled = captains.filter(c => !c.filled);
    const removedCount = captains.length - unfilled.length;
    this.store.set(key, unfilled);
    return { success: true, count: removedCount };
  }

  clearUnfilledCaptains() {
    const key = this._getCurrentCaptainsKey();
    const captains = this.getCaptains();
    const filled = captains.filter(c => c.filled);
    const removedCount = captains.length - filled.length;
    this.store.set(key, filled);
    return { success: true, count: removedCount };
  }
}

module.exports = Store;
