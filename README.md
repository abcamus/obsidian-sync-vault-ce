<h1 align="center">🌟 Sync Vault</h1>

<p align="center">
  <a href="./README_EN.md">English</a>
</p>

<p align="center">
  <a href="https://github.com/abcamus/obsidian-sync-vault-ce"><img src="https://img.shields.io/github/stars/abcamus/obsidian-sync-vault-ce?style=social" alt="GitHub Stars"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-AGPL3.0-green?style=flat-square" alt="License"></a>
  <a href="https://kqiu.top"><img src="https://img.shields.io/badge/Obsidian-Plugin-purple?style=flat-square&logo=obsidian" alt="Obsidian Plugin"></a>
  <a href="https://github.com/abcamus/obsidian-sync-vault-ce/releases"><img src="https://img.shields.io/github/v/release/abcamus/obsidian-sync-vault-ce?include_prereleases&style=flat-square" alt="Latest Release"></a>
  <br>
  <a href="https://kqiu.top"><img src="https://img.shields.io/badge/官网-点击访问-blue?style=flat-square" alt="访问官网"></a>
</p>

<p align="center">
  连接 TB 级网盘与 Obsidian AI 大脑，跨设备免本地存储轻松同步、链接一切资源。
</p>

## 主要功能简介

### 🔗 链接笔记和云盘资源

> 基于文件ID和文件路径生成链接，经插件渲染后集成到Obsidian笔记中。

- `[]()` 格式链接云盘资源。
- `![]()` 格式嵌入云盘资源。

### 🤖 MCP Server

内置 [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) Server，允许 LLM / AI Agent 直接读取和操作网盘中的文件。

- 兼容 Claude Code、Cursor 等支持 MCP 的客户端。
- 通过 SSE (Server-Sent Events) 提供实时上下文访问。

#### 🛠️ 工具调用能力 (MCP Tools)

| 工具名称 | 功能描述 | 备注 |
| :--- | :--- | :--- |
| `get_cloud_account_info` | 获取云端账户及存储容量信息 | |
| `list_cloud_files` | 列出云端指定路径的文件和文件夹 | |
| `read_cloud_file` | 读取云端文件内容（支持流式读取） | |
| `create_cloud_file` | 在云端创建新文件或文件夹 | |
| `delete_cloud_file` | 删除云端文件或文件夹 | |
| `move_cloud_file` | 移动云端文件或文件夹 | |
| `rename_cloud_file` | 重命名云端文件或文件夹 | |
| `download_cloud_file` | 下载云端文件到本地 | |
| `upload_cloud_file` | 上传本地文件到云端 | |
| `semantic_search` | 基于语义的全局搜索 | 仅限百度网盘 |
| `sharelink_set` | 设置/创建分享链接 | 仅限百度网盘 |
| `upload_by_url` | 通过离线 URL 任务上传 | 仅限百度网盘 |

### 💻 CLI 命令（1.13.0）

Sync Vault 提供 Obsidian CLI 命令，便于自动化脚本与 AI Agent 编排：

| 命令 | 用途 | 常用参数 |
| :--- | :--- | :--- |
| `sync-vault:help` | 查看命令帮助 | `help=true` |
| `sync-vault:list` | 列出云端目录（支持分页/过滤/递归） | `path` `cloud` `limit` `offset` `type` `minSize` `modifiedAfter` `recursive` |
| `sync-vault:search` | 搜索云端文件（支持分页/类型过滤） | `query` `cloud` `limit` `offset` `path` `type` |
| `sync-vault:read` | 读取云端文件内容 | `path` `cloud` `maxLength` |
| `sync-vault:info` | 获取账号与容量信息（结构化状态） | `cloud` |
| `sync-vault:doctor` | 诊断同步健康状态 | `cloud` |

常用示例：

```bash
obsidian sync-vault:list path=/ cloud=aliyun limit=100 offset=0
obsidian sync-vault:search query=obsidian cloud=quark type=markdown
obsidian sync-vault:read path=/Notes/Welcome.md cloud=onedrive maxLength=8192
obsidian sync-vault:info cloud=aliyun
obsidian sync-vault:doctor cloud=aliyun
```

> 提示：所有子命令均支持 `help=true` 查看该命令参数。

### ✨ 备份

[介绍](https://mp.weixin.qq.com/s/zct07eny-LcMTiYjb49k9w)

- 轻松上传资料到多种网盘。
- 自由切换云端仓库，备份资料到多个目录。

### 🔄 多设备自动同步

[百度网盘双向同步演示](https://github.com/user-attachments/assets/fbc8c22a-9de2-42c4-b676-753007e5e031)

- 支持双向同步和单向同步，自动识别文件删除 & 移动操作。
- 内容冲突自动合并。
- 文件删除可恢复。
- 忽略大文件，按照正则表达式忽略对应名字文件。
- 同步第三方插件和主题。
- Markdown 文件端到端加密。

### 🤝 多人协同编辑

分布式多人协同编辑，[演示](https://github.com/user-attachments/assets/85d63239-2c5c-4d73-8774-f4ea2f93f426)。


## 📱 不同云服务支持的功能（持续完善中）

| 编号  | 云服务         | 支持的功能                                                                                                                                                                                                                                                                                                                                                                                                                    |
| :-- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | 百度网盘        | 备份、同步、图片预览、PDF阅读、视频播放、音频播放、网盘超链接 |
| 2   | OneDrive    | 备份、同步、图片预览、PDF阅读、音频播放、视频播放、网盘超链接                                                                                                                                                                                                                                                                                                                                                                                   |
| 3   | 阿里云盘        | 备份、同步、图片预览、PDF阅读、音频播放、视频播放、网盘超链接                                                                                                                                                                                                                                                                                                                                                                                        |
| 4   | 115网盘       | 图片预览、PDF阅读、音频播放、视频播放、网盘超链接                                                                                                                                                                                                                                                                                                                                                                                                  |
| 5   | 夸克网盘        | 备份、同步、图片预览、PDF阅读、网盘超链接                                                                                                                                                                                                                                                                                                                                                                                                     |
| 6   | 腾讯COS       | 备份、同步                                                                                                                                                                                                                                                                                                                                                                                                           |
| 7   | 坚果云         | 备份、同步                                                                                                                                                                                                                                                                                                                                                                                                           |
| 8   | InfiniCloud | 备份、同步                                                                                                                                                                                                                                                                                                                                                                                                           |
| 9   | 123云盘       | 备份、同步                                                                                                                                                                                                                                                                                                                                                                                                           |


## ⚙️ 安装和使用

### 从插件市场安装

插件市场搜索 `sync vault ce`，或 [点击链接](https://obsidian.md/plugins?id=sync-vault-ce) 快速安装。

### 开始使用

1. 点击侧边栏 ☁️ 图标，打开看板后，在快捷操作卡片找到新手引导按钮。
2. 点击 **新手引导** 按钮，按照提示完成网盘登陆和同步模式设置。

### 配置MCP(SSE)

#### Claude Code CLI

  在 `.claude/mcp.json` 中添加如下代码(注：3000修改为实际的端口)：
  ```json
  {
    "mcpServers": {
      "sync-vault-mcp": {
        "type": "sse",
          "url": "http://127.0.0.1:3000/sse"
        }
    }
  }
  ```

#### Claude Desktop

> Claude Desktop由于只支持 STDIO 方式接入MCP Server，可选择桥接器转接 Sync Vault MCP，这里可以选择 sse-bridge。

1. `npm install -g @mcpwizard/sse-bridge`
2. 在 Claude Desktop 【设置】-【开发者】中点击编辑配置按钮，复制粘贴以下代码。
  ```json
  {
    "mcpServers": {
      "sync-vault-mcp": {
        "command": "npx",
        "args": [
          "@mcpwizard/sse-bridge",
          "http://127.0.0.1:3000/sse"
        ]
      }
    }
  }
  ```

#### Cursor/Trae

在 Cursor/Trae 的MCP设置中，选择手动添加 MCP Server（Sync Vault MCP 默认 `http://127.0.0.1:3000/sse`）。

```json
{
  "mcpServers": {
    "sync-vault-mcp": {
      "type": "sse",
        "url": "http://127.0.0.1:3000/sse"
      }
  }
}
```

## 🗺️ Roadmap

- 🌐 更多云服务
- 🏠 多人协同
- 🎨 更好的用户体验
- ⎔ 支持Zotero
- 🤖 AI Infra

## 🔗 Quick Links
- [📖 Documentation](https://kqiu.top/docs/)
- [💬 Discussions](https://github.com/abcamus/obsidian-sync-vault-ce/discussions)
- [🐛 Report Bug](https://github.com/abcamus/obsidian-sync-vault-ce/issues/new?template=bug_report.md)
- [✨ Request Feature](https://github.com/abcamus/obsidian-sync-vault-ce/issues/new?template=feature_request.md)
- [🥂 Pricing](https://kqiu.top/product/sync-vault/)

## ❤️ Special Thanks

- [Obsidian](https://obsidian.md/)
- [React](https://react.dev/)
