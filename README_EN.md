<h1 align="center">🌟 Sync Vault</h1>

<p align="center">
  <a href="./README.md">中文</a>
</p>

<p align="center">
  <a href="https://github.com/abcamus/obsidian-sync-vault-ce"><img src="https://img.shields.io/github/stars/abcamus/obsidian-sync-vault-ce?style=social" alt="GitHub Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL3.0-green?style=flat-square" alt="License"></a>
  <a href="https://kqiu.top"><img src="https://img.shields.io/badge/Obsidian-Plugin-purple?style=flat-square&logo=obsidian" alt="Obsidian Plugin"></a>
  <a href="https://github.com/abcamus/obsidian-sync-vault-ce/releases"><img src="https://img.shields.io/github/v/release/abcamus/obsidian-sync-vault-ce?include_prereleases&style=flat-square" alt="Latest Release"></a>
</p>

<p align="center">
  An Obsidian plugin that allows you to easily use resources on various cloud services as if they were local files, relieving local storage and synchronization pressure.
</p>

## Key Features

### 🔗 Link Notes and Cloud Resources

> Generate links based on file ID and path, integrated into Obsidian notes after rendering.

- `[]()` format to link cloud resources.
- `![]()` format to embed cloud resources.

### 🤖 MCP Server

Built-in [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) Server, allowing LLMs / AI Agents to directly access and operate on files in your Cloud Storage.

- Supports tools like `list_cloud_files`, `read_cloud_file`, `search_cloud_files`.
- Compatible with MCP-supported clients such as Claude Code and Cursor.
- Provides real-time context access via SSE (Server-Sent Events).

### ✨ Backup

[Introduction](https://mp.weixin.qq.com/s/zct07eny-LcMTiYjb49k9w)

- Easily upload data to various cloud drives.
- Freely switch cloud vaults and backup data to multiple directories.

### 🔄 Multi-device Auto Sync

[Baidu Netdisk Bi-directional Sync Demo](https://github.com/user-attachments/assets/fbc8c22a-9de2-42c4-b676-753007e5e031)

- Supports bi-directional and one-way sync, automatically identifies file deletion & move operations.
- Automatic merge of content conflicts.
- File deletion is recoverable.
- Ignore large files, ignore files by name using regular expressions.
- Sync third-party plugins and themes.
- End-to-end encryption for Markdown files.

### 🤝 Collaborative Editing

Distributed collaborative editing, [Demo](https://github.com/user-attachments/assets/85d63239-2c5c-4d73-8774-f4ea2f93f426).

## 📱 Supported Cloud Services (Continuously Updating)

| No. | Cloud Service | Supported Features |
| :-- | :------------ | :----------------- |
| 1 | Baidu Netdisk | Backup, Sync, Online Image Preview, Online PDF Reading, Video Playback, Audio Playback, Cloud Link |
| 2 | OneDrive | Backup, Sync, Online Image Preview, Online PDF Reading, Audio Playback, Video Playback, Cloud Link |
| 3 | Aliyun Drive | Backup, Sync, Online Image Preview, Online PDF Reading, Audio Playback, Video Playback, Cloud Link |
| 4 | 115 Drive | Online Image Preview, Online PDF Reading, Audio Playback, Video Playback, Cloud Link |
| 5 | Quark Drive | Backup, Sync, Online Image Preview, Online PDF Reading, Cloud Link |
| 6 | Tencent COS | Backup, Sync |
| 7 | Nutstore | Backup, Sync |
| 8 | InfiniCloud | Backup, Sync |
| 9 | 123 Pan | Backup, Sync |

## ⚙️ Installation and Usage

### Install from Plugin Market

Search for `sync vault ce` in the plugin market, or [click here](https://obsidian.md/plugins?id=sync-vault-ce) to install quickly.

### Get Started

1. Click the ☁️ icon in the sidebar to open the dashboard, then find the "Beginner Guide" button in the Quick Actions card.
2. Click the **Beginner Guide** button and follow the prompts to complete cloud drive login and sync mode settings.

Upon success, you will see the Sync Vault dashboard.

## 🗺️ Roadmap

- 🌐 More Cloud Services
- 🏠 Collaborative Editing
- 🎨 Better User Experience
- ⎔ Zotero Support

## 🔗 Quick Links
- [📖 Documentation](https://kqiu.top/docs/)
- [💬 Discussions](https://github.com/abcamus/obsidian-sync-vault-ce/discussions)
- [🐛 Report Bug](https://github.com/abcamus/obsidian-sync-vault-ce/issues/new?template=bug_report.md)
- [✨ Request Feature](https://github.com/abcamus/obsidian-sync-vault-ce/issues/new?template=feature_request.md)

## ❤️ Special Thanks

- [Obsidian](https://obsidian.md/)
- [React](https://react.dev/)