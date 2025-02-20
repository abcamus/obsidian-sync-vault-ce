[English](README.md) | [中文](README.zh_cn.md)

# 🌟 Obsidian Sync Vault CE (Community Edition)

Sync Vault is a vault synchronization plugin that uses cloud storage as its storage facility, allowing users to fully control synchronization autonomously. It aims to connect data islands across different devices in a user-friendly manner while ensuring data privacy and security.

The Obsidian Sync Vault CE is the implementation of Sync Vault on Obsidian, designed to provide a user-friendly synchronization solution for the vast community of Obsidian users, while collaboratively building a better Obsidian ecosystem with users and enthusiasts.

## 🎯 Vision and Features

Sync Vault aims to become a universal synchronization solution in the field of knowledge management. Its main features include:

- **Controllability**: Every file upload and download is controlled by the user.
- **User-friendly**: View the synchronization status of each file.
- **Stability**: Concurrent access control enhances the stability of cloud storage services.
- **Extensibility**: Easily integrate new cloud disks.
- **Security**: Supports AES-GCM encryption.
- **Cross-platform support**: Compatible with Windows, MacOS, Linux, iOS, iPadOS, and Android.

## ⚙️ Installation and Usage
Open the Obsidian third-party plugin market, search for the Sync Vault plugin, and click install. Usage is as follows:

1. In Obsidian, open the Sync Vault plugin settings.
2. Click authorize to enter the authorization process, with success or failure displayed in the top right corner.
3. After successful authorization, click the cloud icon in the sidebar to view the sync view.
4. Click the upload or download button.

## 🔧 Configuration Options

The plugin offers the following configuration options:

- **Automatic Sync on Load**: If enabled, the plugin will automatically sync once on startup.
- **Encryption**: If enabled, the plugin will encrypt the files in the vault before syncing to the remote; if disabled, the files will be synced as-is.
- **Remember Your Encryption Password**: If forgotten, you will not be able to decrypt the files in the vault.

## 🛠️ Build and Test

```bash
$ git clone git@github.com:abcamus/obsidian-sync-vault-ce.git
$ cd obsidian-sync-vault-ce
$ npm install
$ npm run dev   # watch changes
$ npm run build # build
$ npm run deploy # deploy plugin to a default vault (see `deploy.sh`)
```

## 📬 Contact and Acknowledgments

- **My homepage** - [@KQ Digital Garden](https://kqiu.top/about/)
- **Project link**: [GitHub](https://github.com/abcamus/obsidian-sync-vault-ce)

Thanks to the following projects for their support:

- [Obsidian](https://obsidian.md/)
- [React](https://react.dev/)