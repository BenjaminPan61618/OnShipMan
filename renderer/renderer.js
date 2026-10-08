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

let captains = [];
let currentFilter = "全部";
let hideRecipient = false;
let currentEditIndex = -1;

const filledList = document.getElementById('filled-list');
const unfilledList = document.getElementById('unfilled-list');
const filterSelect = document.getElementById('filter-select');
const statTotal = document.getElementById('stat-total');
const statFilled = document.getElementById('stat-filled');
const statUnfilled = document.getElementById('stat-unfilled');
const statusBar = document.getElementById('status-bar');
const hideRecipientCheckbox = document.getElementById('hide-recipient');

const yearSelect = document.getElementById('year-select');
const monthSelect = document.getElementById('month-select');

const statusSelect = document.getElementById('status-select');
const nicknameInput = document.getElementById('nickname');
const recipientInput = document.getElementById('recipient');
const phoneInput = document.getElementById('phone');
const addressInput = document.getElementById('address');
const rememberCheckbox = document.getElementById('remember-checkbox');
const statusIndicator = document.getElementById('status-indicator');

const btnImport = document.getElementById('btn-import');
const btnSave = document.getElementById('btn-save');
const btnCopy = document.getElementById('btn-copy');
const btnExport = document.getElementById('btn-export');
const btnSaveChanges = document.getElementById('btn-save-changes');
const btnDelete = document.getElementById('btn-delete');
const btnMarkAllPending = document.getElementById('btn-mark-all-pending');
const btnMarkAllAsked = document.getElementById('btn-mark-all-asked');
const btnFetchGuards = document.getElementById('btn-fetch-guards');
const btnManageRemembered = document.getElementById('btn-manage-remembered');
const btnClearFilled = document.getElementById('btn-clear-filled');
const btnClearUnfilled = document.getElementById('btn-clear-unfilled');
const btnClearAll = document.getElementById('btn-clear-all');
const btnNewCaptain = document.getElementById('btn-new-captain');
const btnAddSavedAddress = document.getElementById('btn-add-saved-address');
const savedAddressesList = document.getElementById('saved-addresses-list');

const btnStatusQQ = document.getElementById('btn-status-qq');
const btnStatusBilibili = document.getElementById('btn-status-bilibili');
const btnStatusPending = document.getElementById('btn-status-pending');

const fetchModal = document.getElementById('fetch-modal');
const closeModals = document.querySelectorAll('.close-modal');
const uidInput = document.getElementById('uid-input');
const btnDoFetch = document.getElementById('btn-do-fetch');
const btnCancelFetch = document.getElementById('btn-cancel-fetch');
const fetchStatus = document.getElementById('fetch-status');

const rememberedModal = document.getElementById('remembered-modal');
const rememberedList = document.getElementById('remembered-list');
const btnCloseRemembered = document.getElementById('btn-close-remembered');

async function loadCaptains() {
  captains = await window.electronAPI.getCaptains();
  refreshLists();
  updateStats();
}

async function loadCurrentPeriod() {
  const period = await window.electronAPI.getCurrentPeriod();
  yearSelect.value = period.year;
  monthSelect.value = period.month;
}

function refreshLists() {
  filledList.innerHTML = '';
  unfilledList.innerHTML = '';

  const filtered = filterCaptainsList(currentFilter);

  filtered.forEach((captain, index) => {
    if (captain.filled) {
      const tr = document.createElement('tr');
      tr.dataset.index = index;
      tr.innerHTML = `
        <td>${captain.nickname}</td>
        <td>${hideRecipient ? '***' : captain.recipient}</td>
      `;
      tr.addEventListener('click', () => selectCaptain(index));
      filledList.appendChild(tr);
    } else {
      const tr = document.createElement('tr');
      tr.dataset.index = index;
      const statusInfo = SYMBOLS[captain.status] || { name: captain.status, color: '#333' };
      tr.innerHTML = `
        <td style="color: ${statusInfo.color}; font-weight: 500;">${statusInfo.name}</td>
        <td>${captain.nickname}</td>
      `;
      tr.addEventListener('click', () => selectCaptain(index));
      unfilledList.appendChild(tr);
    }
  });
}

function filterCaptainsList(filterType) {
  if (filterType === "全部") return captains;
  if (filterType === "已填写") return captains.filter(c => c.filled);
  
  for (const [symbol, info] of Object.entries(SYMBOLS)) {
    if (info.name === filterType) {
      if (symbol === " ") {
        return captains.filter(c => c.filled);
      }
      return captains.filter(c => !c.filled && c.status === symbol);
    }
  }
  return captains;
}

function updateStats() {
  const total = captains.length;
  const filled = captains.filter(c => c.filled).length;
  const unfilled = total - filled;
  
  statTotal.textContent = total;
  statFilled.textContent = filled;
  statUnfilled.textContent = unfilled;
}

async function selectCaptain(index) {
  currentEditIndex = index;
  const captain = captains[index];
  
  statusSelect.value = captain.status;
  nicknameInput.value = captain.nickname;
  recipientInput.value = captain.recipient;
  phoneInput.value = captain.phone;
  addressInput.value = captain.address;
  rememberCheckbox.checked = captain.remembered || false;
  
  if (!captain.recipient && !captain.phone && !captain.address) {
    const remembered = await window.electronAPI.getRememberedAddressByNickname(captain.nickname);
    if (remembered) {
      recipientInput.value = remembered.recipient;
      phoneInput.value = remembered.phone;
      addressInput.value = remembered.address;
      rememberCheckbox.checked = true;
      statusBar.textContent = `已选中: ${captain.nickname} (已应用记住的地址)`;
    } else {
      statusBar.textContent = `已选中: ${captain.nickname}`;
    }
  } else {
    statusBar.textContent = `已选中: ${captain.nickname}`;
  }
  
  updateStatusIndicator();
  renderSavedAddressesList(captain.savedAddresses || []);
  
  document.querySelectorAll('tr').forEach(tr => tr.classList.remove('selected'));
  const trs = document.querySelectorAll('tr[data-index="' + index + '"]');
  trs.forEach(tr => tr.classList.add('selected'));
}

function updateStatusIndicator() {
  const recipient = recipientInput.value.trim();
  const phone = phoneInput.value.trim();
  const address = addressInput.value.trim();
  
  let text = '';
  let color = '#4CAF50';
  let hasWarning = false;
  
  if (recipient && phone && address) {
    text = '✅ 信息已完整';
  } else {
    const missing = [];
    if (!recipient) missing.push('收件人');
    if (!phone) missing.push('手机号');
    if (!address) missing.push('地址');
    text = `❌ 缺少: ${missing.join(', ')}`;
    color = '#F44336';
  }
  
  if (phone) {
    if (!/^\d+$/.test(phone.replace(/\s/g, ''))) {
      text += '\n⚠️ 手机号含非数字';
      hasWarning = true;
    } else if (phone.length !== 11) {
      text += `\n⚠️ 手机号位数异常(${phone.length}位)`;
      hasWarning = true;
    }
  }
  
  if (hasWarning) {
    color = '#FF9800';
  }
  
  statusIndicator.textContent = text;
  statusIndicator.style.color = color;
  statusIndicator.style.backgroundColor = color + '10';
}

async function saveChanges() {
  const isNew = currentEditIndex < 0;

  if (isNew && !nicknameInput.value.trim()) {
    alert('请输入昵称！');
    return;
  }

  if (!isNew) {
    const nickname = nicknameInput.value.trim();
    if (!nickname) {
      alert('昵称不能为空！');
      return;
    }
  }
  
  const nickname = nicknameInput.value.trim();
  const recipient = recipientInput.value.trim();
  const phone = phoneInput.value.trim();
  const address = addressInput.value.trim();
  const remembered = rememberCheckbox.checked;
  
  // 读取当前已保存的多地址
  const existingSaved = !isNew ? (captains[currentEditIndex].savedAddresses || []) : [];

  // 如果当前地址完整且 savedAddresses 为空，自动存一份作为默认
  let savedAddresses = [...existingSaved];
  if (recipient && phone && address && savedAddresses.length === 0) {
    savedAddresses.push({
      id: 'auto-' + Date.now().toString(36),
      label: '默认',
      recipient,
      phone,
      address
    });
  }
  
  const captain = {
    index: currentEditIndex,
    status: statusSelect.value,
    nickname: nickname,
    recipient: recipient,
    phone: phone,
    address: address,
    remembered: remembered,
    savedAddresses
  };
  
  captains = await window.electronAPI.saveCaptain(captain);
  const msgPrefix = isNew ? '舰长已添加' : '修改已保存';
  
  if (remembered && recipient && phone && address) {
    await window.electronAPI.addRememberedAddress({
      nickname: nickname,
      recipient: recipient,
      phone: phone,
      address: address
    });
    statusBar.textContent = `${msgPrefix}（地址已记住）`;
  } else if (remembered && (!recipient || !phone || !address)) {
    statusBar.textContent = `${msgPrefix}（地址信息不完整，未记住）`;
  } else {
    statusBar.textContent = msgPrefix;
  }

  // 如果是新建，选中新添加的
  if (isNew) {
    const newIndex = captains.length - 1;
    currentEditIndex = newIndex;
  }
  
  refreshLists();
  updateStats();
  updateStatusIndicator();

  // 刷新多地址列表
  const refreshedCaptain = captains[currentEditIndex];
  if (refreshedCaptain) {
    renderSavedAddressesList(refreshedCaptain.savedAddresses || []);
  }
}

async function deleteCurrent() {
  if (currentEditIndex < 0) {
    alert('请先选择一个舰长');
    return;
  }
  
  if (!confirm('确定要删除这个舰长吗？')) {
    return;
  }
  
  const name = captains[currentEditIndex].nickname;
  captains = await window.electronAPI.deleteCaptain(currentEditIndex);
  refreshLists();
  updateStats();
  clearForm();
  statusBar.textContent = `舰长 '${name}' 已删除`;
}

function clearForm() {
  statusSelect.value = '^';
  nicknameInput.value = '';
  recipientInput.value = '';
  phoneInput.value = '';
  addressInput.value = '';
  rememberCheckbox.checked = false;
  statusIndicator.textContent = '';
  currentEditIndex = -1;
  document.querySelectorAll('tr').forEach(tr => tr.classList.remove('selected'));
  renderSavedAddressesList([]);
}

function setStatus(status) {
  if (currentEditIndex < 0) {
    alert('请先新建或选择一个舰长');
    return;
  }
  statusSelect.value = status;
  saveChanges();
}

btnImport.addEventListener('click', async () => {
  const result = await window.electronAPI.importTxt();
  if (result && result.success) {
    captains = await window.electronAPI.getCaptains();
    refreshLists();
    updateStats();
    statusBar.textContent = `已导入 ${result.count} 个舰长`;
    alert(`成功导入 ${result.count} 个舰长！`);
  } else if (result) {
    alert(`导入失败: ${result.message}`);
  }
});

btnSave.addEventListener('click', async () => {
  const result = await window.electronAPI.exportTxt(false);
  if (result && result.success) {
    statusBar.textContent = `已保存 ${result.count} 个舰长信息`;
    alert('文件保存成功！');
  } else if (result) {
    alert(`保存失败: ${result.message}`);
  }
});

btnCopy.addEventListener('click', async () => {
  const result = await window.electronAPI.copyFilledAddresses();
  if (result.success) {
    statusBar.textContent = `已复制 ${result.count} 个地址到剪贴板`;
    alert(`成功复制 ${result.count} 个舰长地址到剪贴板！`);
  } else {
    alert(result.message);
  }
});

btnExport.addEventListener('click', async () => {
  const result = await window.electronAPI.exportTxt(true);
  if (result && result.success) {
    statusBar.textContent = `已导出 ${result.count} 个地址`;
    alert(`成功导出 ${result.count} 个舰长地址！`);
  } else if (result) {
    alert(`导出失败: ${result.message}`);
  }
});

btnSaveChanges.addEventListener('click', saveChanges);

btnDelete.addEventListener('click', deleteCurrent);

btnMarkAllPending.addEventListener('click', async () => {
  if (!confirm('将所有未填写的舰长标记为"待询问"吗？\n(这将覆盖除"无需"、"小号"、"特殊情况"、"主播"以外的状态)')) {
    return;
  }
  const result = await window.electronAPI.markAllPending();
  if (result.success) {
    captains = await window.electronAPI.getCaptains();
    refreshLists();
    statusBar.textContent = `已标记 ${result.count} 个舰长为"待询问"`;
    alert(`已标记 ${result.count} 个舰长为"待询问"`);
  }
});

btnMarkAllAsked.addEventListener('click', async () => {
  if (!confirm('将所有未填写的舰长标记为"已询问(QQ)"吗？')) {
    return;
  }
  const result = await window.electronAPI.markAllAsked();
  if (result.success) {
    captains = await window.electronAPI.getCaptains();
    refreshLists();
    statusBar.textContent = `已标记 ${result.count} 个舰长为"已询问(QQ)"`;
    alert(`已标记 ${result.count} 个舰长为"已询问(QQ)"`);
  }
});

btnStatusQQ.addEventListener('click', () => setStatus('@'));
btnStatusBilibili.addEventListener('click', () => setStatus('#'));
btnStatusPending.addEventListener('click', () => setStatus('^'));

btnClearFilled.addEventListener('click', async () => {
  if (!confirm('确定要清空所有已填写地址的舰长吗？此操作不可撤销！')) {
    return;
  }
  const result = await window.electronAPI.clearFilledCaptains();
  if (result.success) {
    captains = await window.electronAPI.getCaptains();
    refreshLists();
    updateStats();
    clearForm();
    statusBar.textContent = `已清空 ${result.count} 个已填写舰长`;
  }
});

btnClearUnfilled.addEventListener('click', async () => {
  if (!confirm('确定要清空所有未填写地址的舰长吗？此操作不可撤销！')) {
    return;
  }
  const result = await window.electronAPI.clearUnfilledCaptains();
  if (result.success) {
    captains = await window.electronAPI.getCaptains();
    refreshLists();
    updateStats();
    clearForm();
    statusBar.textContent = `已清空 ${result.count} 个未填写舰长`;
  }
});

filterSelect.addEventListener('change', (e) => {
  currentFilter = e.target.value;
  refreshLists();
});

hideRecipientCheckbox.addEventListener('change', (e) => {
  hideRecipient = e.target.checked;
  refreshLists();
});

recipientInput.addEventListener('input', updateStatusIndicator);
phoneInput.addEventListener('input', updateStatusIndicator);
addressInput.addEventListener('input', updateStatusIndicator);

btnFetchGuards.addEventListener('click', () => {
  fetchModal.classList.remove('hidden');
  uidInput.value = '';
  fetchStatus.textContent = '';
  fetchStatus.className = 'fetch-status';
});

closeModals.forEach(closeBtn => {
  closeBtn.addEventListener('click', () => {
    fetchModal.classList.add('hidden');
    rememberedModal.classList.add('hidden');
  });
});

btnCancelFetch.addEventListener('click', () => {
  fetchModal.classList.add('hidden');
});

btnDoFetch.addEventListener('click', async () => {
  const uid = uidInput.value.trim();
  if (!uid || !/^\d+$/.test(uid)) {
    alert('请输入有效的UID（纯数字）');
    return;
  }
  
  fetchStatus.textContent = '正在获取房间号...';
  fetchStatus.className = 'fetch-status loading';
  
  const result = await window.electronAPI.fetchGuards(uid);
  
  if (result.success) {
    fetchStatus.textContent = `成功获取 ${result.names.length} 个舰长！正在添加...`;
    fetchStatus.className = 'fetch-status success';
    
    const addResult = await window.electronAPI.saveCaptain({
      index: -1,
      status: '^',
      nickname: result.names[0],
      recipient: '',
      phone: '',
      address: ''
    });
    
    result.names.slice(1).forEach(name => {
      window.electronAPI.saveCaptain({
        index: -1,
        status: '^',
        nickname: name,
        recipient: '',
        phone: '',
        address: ''
      });
    });
    
    captains = await window.electronAPI.getCaptains();
    refreshLists();
    updateStats();
    
    setTimeout(() => {
      fetchModal.classList.add('hidden');
      statusBar.textContent = `已添加 ${result.names.length} 个舰长`;
      alert(`成功获取并添加 ${result.names.length} 个舰长！`);
    }, 500);
  } else {
    fetchStatus.textContent = `失败: ${result.message}`;
    fetchStatus.className = 'fetch-status error';
  }
});

async function switchPeriod(year, month) {
  const result = await window.electronAPI.setCurrentPeriod({
    year: year,
    month: month
  });
  if (result.success) {
    captains = result.captains;
    refreshLists();
    updateStats();
    clearForm();
    statusBar.textContent = `已切换到 ${year}年${month}月，共 ${captains.length} 个舰长`;
  }
}

yearSelect.addEventListener('change', () => {
  switchPeriod(parseInt(yearSelect.value), monthSelect.value);
});

monthSelect.addEventListener('change', () => {
  switchPeriod(parseInt(yearSelect.value), monthSelect.value);
});

btnManageRemembered.addEventListener('click', async () => {
  const addresses = await window.electronAPI.getRememberedAddresses();
  renderRememberedList(addresses);
  rememberedModal.classList.remove('hidden');
});

btnCloseRemembered.addEventListener('click', () => {
  rememberedModal.classList.add('hidden');
});

function renderRememberedList(addresses) {
  rememberedList.innerHTML = '';
  
  if (addresses.length === 0) {
    rememberedList.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">暂无记住的地址</p>';
    return;
  }
  
  addresses.forEach(addr => {
    const item = document.createElement('div');
    item.className = 'remembered-item';
    item.innerHTML = `
      <div class="nickname">${addr.nickname}</div>
      <div class="recipient">收件人: ${addr.recipient}</div>
      <div class="phone">手机号: ${addr.phone}</div>
      <div class="address">地址: ${addr.address}</div>
      <div class="remembered-item-actions">
        <button class="btn btn-small btn-success" onclick="applyRememberedAddress('${addr.nickname}')">应用到当前</button>
        <button class="btn btn-small btn-danger" onclick="removeRememberedAddress('${addr.nickname}')">删除</button>
      </div>
    `;
    rememberedList.appendChild(item);
  });
}

window.applyRememberedAddress = async (nickname) => {
  const addr = await window.electronAPI.getRememberedAddressByNickname(nickname);
  if (addr && currentEditIndex >= 0) {
    recipientInput.value = addr.recipient;
    phoneInput.value = addr.phone;
    addressInput.value = addr.address;
    rememberCheckbox.checked = true;
    updateStatusIndicator();
    statusBar.textContent = `已应用 ${nickname} 的记住地址`;
    rememberedModal.classList.add('hidden');
  }
};

window.removeRememberedAddress = async (nickname) => {
  if (!confirm(`确定要删除 ${nickname} 的记住地址吗？`)) return;
  
  await window.electronAPI.removeRememberedAddress(nickname);
  const addresses = await window.electronAPI.getRememberedAddresses();
  renderRememberedList(addresses);
  
  if (currentEditIndex >= 0 && captains[currentEditIndex].nickname === nickname) {
    rememberCheckbox.checked = false;
  }
};

function renderSavedAddressesList(saved) {
  if (!saved || saved.length === 0) {
    savedAddressesList.innerHTML = '<p class="empty-hint">（暂无保存的多地址）保存时会自动存一份</p>';
    return;
  }

  const escapeHtml = (str) => String(str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  savedAddressesList.innerHTML = '';
  saved.forEach((addr) => {
    const item = document.createElement('div');
    item.className = 'saved-address-item';
    item.innerHTML = `
      <div class="addr-label">🏷️ ${escapeHtml(addr.label) || '(未命名)'}</div>
      <div class="addr-detail">
        收件人: ${escapeHtml(addr.recipient) || '-'}<br>
        电话: ${escapeHtml(addr.phone) || '-'}<br>
        地址: ${escapeHtml(addr.address) || '-'}
      </div>
      <div class="addr-actions">
        <button class="btn btn-small btn-success">切换到这个</button>
        <button class="btn btn-small btn-danger">删除</button>
      </div>
    `;
    // 用 addEventListener 避免内联 onclick 的转义问题
    item.querySelector('.btn-success').addEventListener('click', () => window.switchToSaved(addr.id));
    item.querySelector('.btn-danger').addEventListener('click', () => window.deleteSaved(addr.id));
    savedAddressesList.appendChild(item);
  });
}

// 多地址操作 — 挂载到 window 供内联 onclick 使用
window.switchToSaved = async function(addrId) {
  if (currentEditIndex < 0) { alert('请先选择一个舰长'); return; }
  const result = await window.electronAPI.switchToSavedAddress({
    captainIndex: currentEditIndex,
    addrId
  });
  if (result.success) {
    const captain = result.captain;
    recipientInput.value = captain.recipient;
    phoneInput.value = captain.phone;
    addressInput.value = captain.address;
    statusSelect.value = captain.status;
    updateStatusIndicator();
    // 同步 captains 里的数据
    captains[currentEditIndex] = captain;
    refreshLists();
    statusBar.textContent = `已切换到地址: ${(captain.savedAddresses || []).find(a => a.id === addrId)?.label || ''}`;
  } else {
    alert(result.message);
  }
};

window.deleteSaved = async function(addrId) {
  if (currentEditIndex < 0) { alert('请先选择一个舰长'); return; }
  if (!confirm('确定要删除这个保存的地址吗？')) return;
  const result = await window.electronAPI.deleteSavedAddress({
    captainIndex: currentEditIndex,
    addrId
  });
  if (result.success) {
    // 同步 captains 里的数据
    captains[currentEditIndex].savedAddresses = result.savedAddresses;
    renderSavedAddressesList(result.savedAddresses);
    statusBar.textContent = `已删除 ${result.removed} 个地址`;
  }
};

// ========== 新建舰长 ==========
btnNewCaptain.addEventListener('click', () => {
  clearForm();
  nicknameInput.focus();
  statusBar.textContent = '请填写新舰长信息，完成后点击 💾 保存修改';
});

// ========== 清空全部 ==========
btnClearAll.addEventListener('click', async () => {
  const count = captains.length;
  if (count === 0) {
    alert('当前列表已为空');
    return;
  }
  if (!confirm(`确定要清空全部 ${count} 个舰长吗？此操作不可撤销！`)) return;
  if (!confirm('⚠️ 二次确认：真的要清空吗？')) return;

  const result = await window.electronAPI.clearAllCaptains();
  if (result.success) {
    captains = await window.electronAPI.getCaptains();
    refreshLists();
    updateStats();
    clearForm();
    statusBar.textContent = `已清空全部 ${result.count} 个舰长`;
  }
});

// ========== 把当前地址存为新地址 ==========
btnAddSavedAddress.addEventListener('click', async () => {
  if (currentEditIndex < 0) {
    alert('请先选择一个舰长，或新建一个');
    return;
  }
  const recipient = recipientInput.value.trim();
  const phone = phoneInput.value.trim();
  const address = addressInput.value.trim();
  if (!recipient || !phone || !address) {
    alert('当前地址信息不完整，请先填完整');
    return;
  }

  const label = prompt('给这个地址起个标签（如：默认 / 老家 / 新地址）：', `地址${(captains[currentEditIndex].savedAddresses || []).length + 1}`);
  if (label === null) return; // 用户取消

  const result = await window.electronAPI.addSavedAddress({
    captainIndex: currentEditIndex,
    address: { label: label.trim() || '未命名', recipient, phone, address }
  });
  if (result.success) {
    captains[currentEditIndex].savedAddresses = result.savedAddresses;
    renderSavedAddressesList(result.savedAddresses);
    statusBar.textContent = `已保存新地址: ${label}`;
  } else {
    alert(result.message);
  }
});

loadCaptains();
loadCurrentPeriod();
