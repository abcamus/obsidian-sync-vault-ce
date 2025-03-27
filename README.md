[English](README.md) | [中文](README.zh_cn.md)

# 🌟 Sync Vault Community Edition

Sync Vault is an Obsidian vault synchronization plugin based on cloud storage. It provides a user-friendly interface that gives you complete control over the synchronization process while ensuring data privacy and security.

## ✨ Features

- End-to-end encryption for data security
- Precise file synchronization control
- Intuitive file status display

## 📱 Supported Cloud Storage

- Aliyun Drive (Supported)
- More platforms coming soon...

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

## 📬 Contact & Acknowledgments

- **My Homepage** - [@KQ Digital Garden](https://kqiu.top/about/)
- **Project Link**: [GitHub](https://github.com/abcamus/obsidian-sync-vault-ce)

Special thanks to：

- [Obsidian](https://obsidian.md/)
- [React](https://react.dev/)
