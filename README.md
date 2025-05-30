[English](README.md) | [中文](README.zh_cn.md)

# 🌟 Sync Vault Community Edition

[![GitHub Stars](https://img.shields.io/github/stars/abcamus/obsidian-sync-vault-ce?style=social)](https://github.com/abcamus/obsidian-sync-vault-ce)
[![License](https://img.shields.io/badge/license-AGPL3.0-green?style=flat-square)](LICENSE)
[![Obsidian Plugin](https://img.shields.io/badge/Obsidian-Plugin-purple?style=flat-square&logo=obsidian)](https://obsidian.md)
[![Latest Release](https://img.shields.io/github/v/release/abcamus/obsidian-sync-vault-ce?include_prereleases&style=flat-square)](https://github.com/abcamus/obsidian-sync-vault-ce/releases)

Sync Vault is an Obsidian vault synchronization plugin based on cloud storage. It provides a user-friendly interface that gives you complete control over the synchronization process while ensuring data privacy and security.

## ✨ Features

- End-to-end encryption for data security
- Precise file synchronization control
- Intuitive file status display

## 📱 Supported Cloud Storage

- Aliyun Drive (Supported)
- More platforms coming soon...

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

## ⚙️ Installation & Usage

### Install from Plugin Market

1. Open Obsidian Settings > Third-party plugins
2. Search for "Sync Vault"
3. Click install and enable the plugin

### Basic Setup

1. Open plugin settings
2. Select cloud storage platform and authorize
3. Configure sync options (encryption, auto-sync, etc.)
4. Click the cloud icon in the sidebar to start using

<div align="center">
  <img src="assets/user%20interface.png" alt="Sync Vault Interface Preview" width="800" style="border-radius: 8px; box-shadow: 0 4px 8px rgba(0,0,0,0.1);">
  <p><em>Sync Vault Interface: File list view with sync status</em></p>
</div>

## 🔧 Configuration

### Basic Settings
- **Cloud Storage**: Choose your cloud storage platform
- **Auto Sync**: Automatically sync when plugin starts
- **Sync Mode**: Supports manual and automatic modes

### Security Settings
- **Encryption**: Files will be encrypted before syncing when enabled
- **Password Management**: Set and safely store your encryption password (⚠️ Data cannot be recovered if password is lost)

## 🛠️ Development Guide

### Environment Setup
```bash
git clone git@github.com:abcamus/obsidian-sync-vault-ce.git
cd obsidian-sync-vault-ce
npm install
npm run dev    # Watch for changes
npm run build  # Build
npm run deploy # Deploy to default vault (see `deploy.sh`)
```

## 🗺️ Roadmap

- 🌐 More Cloud Storage Platforms
    - WebDAV
    - OneDrive
    - Dropbox

- 🏠 Self-hosted Sync Service
    - Docker deployment
    - Private cloud storage

- ⚡️ Sync Engine Optimization
    - Concurrent synchronization
    - Resume broken transfers

- 🎨 User Experience Improvements
    - Sync conflict resolution
    - File version management
    - Sync status monitoring

## 🔗 Quick Links
- [📖 Documentation](https://kqiu.top/docs/)
- [💬 Discussions](https://github.com/abcamus/obsidian-sync-vault-ce/discussions)
- [🐛 Report Bug](https://github.com/abcamus/obsidian-sync-vault-ce/issues/new?template=bug_report.md)
- [✨ Request Feature](https://github.com/abcamus/obsidian-sync-vault-ce/issues/new?template=feature_request.md)
- [☕ Buy Me a Coffee](https://buymeacoffee.com/yourusername)

Special thanks to：

- [Obsidian](https://obsidian.md/)
- [React](https://react.dev/)
