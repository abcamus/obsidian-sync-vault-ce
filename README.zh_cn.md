[English](README.md) | [中文](README.zh_cn.md)

# 🌟 Obsidian Sync Vault 社区版

Sync Vault是一个以网盘为存储设施，用户完全自主控制同步的保险库同步插件。旨在以用户友好的方式，连接不同设备的数据孤岛，同时保障用户数据隐私和数据安全。

Obsidian Sync Vault社区版，是Sync Vault在Obsidian上的实现，用于为广大的Obsidian用户提供好用的同步方案，同时和广大用户和爱好者一起构建一个更加优秀的Obsidian生态。

## 🎯 愿景与特性

Sync Vault致力于成为知识管理领域的通用同步方案。其主要特性包括：

- **可控性**: 每一个文件的上传下载都受用户控制。
- **用户友好**：可浏览每个文件的同步状态，具有统一的操作界面。
- **稳定性**：并发访问控制增强云盘存储服务稳定性。
- **可扩展性**：轻松接入新的云盘。
- **安全性**：支持AES-GCM加密。
- **跨平台支持**: 适用于 Windows、MacOS、Linux、iOS、iPadOS和Android。

## ⚙️ 安装与使用
打开 Obsidian 第三方插件市场，搜索Sync Vault插件，点击安装。使用方法如下：

1. 在 Obsidian 中，打开Sync Vault插件设置。
2. 点击授权获取进入授权流程，右上角显示授权成功或授权失败。
3. 授权成功后在侧边栏点击云朵图标，查看同步视图。
4. 点击上传或者下载按钮。

## 🔧 配置选项

插件提供了以下配置选项:

- **选择网盘**：选择要使用的网盘。
- **是否在加载时自动同步**：如果开启，则插件会在启动时自动同步一次。
- **是否加密**：如果开启，则插件会将保险库中的文件加密后同步到远端；如果关闭，则插件会将保险库中的文件原样同步到远端。
- **请牢记加密密码**：如果忘记，则无法解密保险库中的文件。

## 🛠️ 构建和测试

```bash
$ git clone git@github.com:abcamus/obsidian-sync-vault-ce.git
$ cd obsidian-sync-vault-ce
$ npm install
$ npm run dev   # 监视更改
$ npm run build # 构建
$ npm run deploy # 部署插件到默认保险库 (参见 `deploy.sh`)
```

## 📬 联系与致谢

- **我的主页** - [@KQ Digital Garden](https://kqiu.top/about/)
- **项目链接**: [GitHub](https://github.com/abcamus/obsidian-sync-vault-ce)

感谢以下项目的支持：

- [Obsidian](https://obsidian.md/)
- [React](https://react.dev/)
