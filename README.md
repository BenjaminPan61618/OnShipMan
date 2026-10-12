# 🚢 OnShipMan — 大航海收件信息管理器

一款基于 Electron 的桌面应用，专门为 B 站大航海舰长礼物的收件地址管理而设计。

适用于 UP 主或志愿者管理多位舰长的**姓名、手机号、收货地址**，并跟踪每位舰长的信息填写状态（待询问 / 已询问 / 已填写）。

---

## ✨ 功能特性

### 舰长管理
- 手动新建 / 删除舰长条目
- 状态标记：`待询问 (^)` / `已询问 (!)` / `已填写 ( )`
- 记住已确认的地址，下次新月份自动填充

### 多地址管理（每位舰长支持保存多个地址）
- 把当前填写的地址保存到舰长的"地址簿"，可自定义标签（如"默认"、"老家"、"新地址"）
- 一键**切换**不同保存的地址作为当前激活地址
- 随时**删除**多余的已保存地址

### 批量操作
- 一键**清空已填写 / 未填写**的舰长
- 一键**清空全部**舰长（带二次确认）
- 一键**标记全部**为已询问 / 待询问

### 月份数据切换
- 每月独立存储，互不干扰
- 自动识别当前年月并加载对应数据
- 历史月份数据保留，随时回看

### 数据导出
- 一键导出已填写地址为 TXT

---

## 📸 界面预览

应用界面分为左右两栏：
- **左侧舰长列表**：显示昵称、状态、收件人、电话、地址等，支持点击选中
- **右侧编辑区**：编辑当前选中舰长的详细信息 + 该舰长的多地址管理 + 批量操作区

---

## 🚀 快速开始

### 环境要求
- Node.js 18 或更高版本
- npm / yarn / pnpm（任选其一）
- Linux / macOS / Windows（开发主要在 Linux 上测试）

### 安装依赖

```bash
cd onshipman
npm install
```

### 首次运行准备

程序运行时会在 `data/config.json` 中存储数据。首次运行前：

```bash
# 可选：复制脱敏示例作为初始模板
cp data/config.example.json data/config.json
```

> ⚠️ **隐私提醒**：`data/config.json` 存放的是你真实的舰长数据（姓名、手机号、地址），**已通过 `.gitignore` 排除**，不会被提交到 git 仓库。`data/config.example.json` 里是脱敏的示例数据，用于帮助他人理解数据格式。

### 启动应用

```bash
# Linux / macOS（推荐，禁用沙箱兼容更多环境）
./run.sh

# 或直接
npm start
```

### 打包发布

```bash
# Linux AppImage + deb
npm run build:linux

# 其他平台
npm run build
```

打包产物输出到 `dist/` 目录。

---

## 📁 项目结构

```
onshipman/
├── main.js                 # Electron 主进程入口
├── preload.js              # 预加载脚本，暴露 IPC API
├── store.js                # electron-store 数据管理层
├── package.json
├── run.sh                  # Linux 启动脚本
│
├── renderer/               # 渲染进程（前端 UI）
│   ├── index.html
│   ├── renderer.js
│   └── style.css
│
├── classic/                # 旧版 Python (Tkinter) 实现，仅供参考
│   ├── captain_manager_v2.py
│   └── export.py
│
└── data/
    ├── .gitkeep            # 占位：保留 data/ 目录结构
    ├── config.example.json # 脱敏示例数据（会被 git 追踪）
    ├── config.json         # 🔒 你的真实数据（已 gitignore）
    └── exports/            # 🔒 导出的 TXT 文件（已 gitignore）
```

## 🛠️ 技术栈

| 组件 | 版本 | 说明 |
|------|------|------|
| Electron | ^30.0.0 | 跨平台桌面应用框架 |
| electron-store | ^8.2.0 | JSON 持久化存储（基于 JSON 文件） |
| electron-builder | ^24.13.3 | 打包工具（支持 AppImage / deb / exe） |
| 前端 | 原生 HTML/CSS/JS | 无额外框架 |

---

## 📜 许可证

GPL v2 License — 详见 LICENSE
