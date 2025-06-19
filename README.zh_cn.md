[English](README.md) | [中文](README.zh_cn.md)

# 🌟 Sync Vault 社区版

[![GitHub Stars](https://img.shields.io/github/stars/abcamus/obsidian-sync-vault-ce?style=social)](https://github.com/abcamus/obsidian-sync-vault-ce)
[![License](https://img.shields.io/badge/license-AGPL3.0-green?style=flat-square)](LICENSE)
[![Obsidian Sync Vault](https://img.shields.io/badge/Obsidian-Plugin-purple?style=flat-square&logo=obsidian)](https://kqiu.top)
[![Latest Release](https://img.shields.io/github/v/release/abcamus/obsidian-sync-vault-ce?include_prereleases&style=flat-square)](https://github.com/abcamus/obsidian-sync-vault-ce/releases)

Sync Vault 是一个基于云存储的 Obsidian 保险库同步插件。它提供用户友好的界面，可以完全掌控同步过程，同时确保数据隐私和安全。

## ✨ 特性

- 端到端加密，确保数据安全
- 精确的文件同步控制
- 直观的文件状态显示

## 📱 支持的云存储

- 阿里云盘（已支持）
- 更多云存储平台开发中...

## Free vs. Paid Edition

| Feature               | Free Edition       | Paid Edition              |
|-----------------------|--------------------|---------------------------|
| **Cloud Drives**      | Aliyun             | ✅ Baidu, OneDrive, 115 (Soon) |
| **Auto-Sync**         | Manual Only     | ✅ Scheduled & Real-Time  |
| **Sync Modes**        | Basic           | ✅ Auto, P2P, Plugin Sync       |
| **File Filtering**    | No              | ✅ Regex Ignore Rules     |
| **Sync Reports**      | No              | ✅ Detailed Logs          |
| **Conflict Resolution** | Keep recent        | ✅ Keep recent, Mannual merge, Increment merge             |
| **Video Playback**    | Download Only   | ✅ Stream (Baidu/Aliyun)  |
| **File History**      | No         | ✅ Unlimited             |
| **Customer Support**  | Community       | ✅ Priority Response      |

**Upgrade now → [Sync Vault](https://kqiu.top)**

## ⚙️ 安装与使用

### 从插件市场安装

1. 打开 Obsidian 设置 > 第三方插件
2. 搜索 "Sync Vault"
3. 点击安装并启用插件

### 基本配置

1. 打开插件设置
2. 选择云存储平台并完成授权
3. 配置同步选项（加密、自动同步等）
4. 点击侧边栏的云图标开始使用

<div align="center">
  <img src="assets/user%20interface.png" alt="Sync Vault 界面预览" width="800" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
  <p><em>Sync Vault 界面预览：带同步状态的文件列表视图</em></p>
</div>

## 🔧 配置选项

### 基础设置
- **云存储选择**：选择要使用的云存储平台
- **自动同步**：插件启动时自动同步
- **同步模式**：支持手动和自动两种模式

### 安全设置
- **加密选项**：开启后文件将被加密后同步
- **密码管理**：设置并妥善保管加密密码（⚠️ 密码丢失将无法恢复数据）

## 🛠️ 开发指南

### 环境准备
```bash
git clone git@github.com:abcamus/obsidian-sync-vault-ce.git
cd obsidian-sync-vault-ce
npm install
$ npm run dev   # 监视更改
$ npm run build # 构建
$ npm run deploy # 部署插件到默认保险库 (参见 `deploy.sh`)
```

## 🗺️ 开发路线

- 🌐 支持更多云存储平台
  - WebDAV
  - OneDrive
  - Dropbox

- 🏠 自托管同步服务
  - Docker 部署
  - 私有云存储

- ⚡️ 同步引擎优化
  - 并发同步
  - 断点续传

- 🎨 用户体验改进
  - 同步冲突解决
  - 文件版本管理
  - 同步状态监控

## 🔗 快速链接
- [📖 Documentation](https://kqiu.top/docs/)
- [💬 Discussions](https://github.com/abcamus/obsidian-sync-vault-ce/discussions)
- [🐛 Report Bug](https://github.com/abcamus/obsidian-sync-vault-ce/issues/new?template=bug_report.md)
- [✨ Request Feature](https://github.com/abcamus/obsidian-sync-vault-ce/issues/new?template=feature_request.md)

感谢以下项目的支持：

- [Obsidian](https://obsidian.md/)
- [React](https://react.dev/)
