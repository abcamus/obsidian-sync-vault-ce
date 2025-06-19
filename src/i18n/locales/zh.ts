export default {
    "common": {
        "cancel": "取消",
        "confirm": "确认",
    },
    "sync": {
        "message": {
            "loadingRemoteMeta": "正在加载远程文件信息...",
            "loading": "加载中...",
        },
        "toolTip": {
            "fullySynced": "已同步",
            "localModified": "本地修改，点击上传",
            "remoteModified": "远程修改，点击下载",
            "localCreated": "本地创建，点击上传",
            "remoteCreated": "远程创建，点击下载",
            "localDeleted": "本地删除，点击上传",
            "remoteDeleted": "远程删除，点击下载",
            "conflict": "冲突",
            "unknown": "未知",
            "syncing": "同步中",
        }
    },
    "plugin": {
        "name": "Sync Vault",
        "title": "打开/关闭Sync Vault视图",
        "view": {
            "syncStatus": "Sync Vault 同步状态视图",
            "cloudDisk": "Sync Vault 云盘视图",
        },
        "authorize": {
            "title": "授权",
            "desc": "授权后，您可以使用 Sync Vault 插件",
            "success": "授权成功",
            "failed": "授权失败",
        },
    },
    "fileNavBar": {
        "rootFolder": "根目录",
    },

    "settingTab": {
        "label": {
            "vaultInfo": "仓库信息",
            "startToUse": "开始使用",
            "syncSetting": "同步设置",
            "encryptSetting": "加密设置",
            "help": "帮助与更新",
        },
        "vault": {
            "title": "仓库",
            "vaultDesc": "云端路径：%{syncPath}",
            "enterRemotePath": "输入云盘同步路径",
        },
        "menuStartToUse": {
            "title": "开始使用",
            "desc": "安装插件后，在此鉴权",
        },

        "key": {
            "title": "密钥",
            "desc": "设置文档加密密钥",
            "placeholder": "输入密钥",
            "showPassword": "显示密码",
            "hidePassword": "隐藏密码"
        },

        "menuSyncConfig": {
            "title": "同步功能设置",
            "desc": "设置上传、下载策略，以及加密模式",
            "switchSyncMode": {
                "title": "切换同步模式",
                "desc": "支持受控同步模式，可扩展其他同步模式",
            },
            "mode": {
                "selfControlled": "受控",
            },
            "uploadStrategy": {
                "title": "上传模式",
                "desc": "受控上传：只有已经上传过的文件才会自动上传",
                "userControl": "受控上传",
            },
            "downloadStrategy": {
                "title": "下载模式",
                "desc": "加载时更新：在插件加载时自动下载云盘上的文件；仅手动下载：需要手动点击下载按钮",
                "autoOnLoad": "加载时更新",
                "manual": "仅手动下载",
            },
            "encryptMode": {
                "title": "加密模式",
                "desc": "加密模式：所有文件会加密后上传",
            }
        },

        "cloudDisk": {
            "title": "选择云盘",
            "desc": "选择要使用的云盘",
            "aliyunDisk": "阿里云盘",
            "switchTo": "切换到 %{message}",
            "userName": "用户名",
            "volume": "容量",
            "getInfoFailed": "获取云盘信息失败，请稍后重试",
        },
        "accessToken": {
            "title": "授权码",
            "desc": "显示和管理您的访问令牌",
            "clickToAuthorize": "点击授权",
            "revoke": "撤销授权",
            "unauthorized": "未授权，请前往设置页面点击授权",
        },
        "autoSync": {
            "title": "加载时自动同步",
            "desc": "在插件启动的时候自动从云盘同步",
        },

        "menuUpgradeAndHelp": {
            "title": "升级和帮助",
            "upgrade": {
                "title": "升级到pro版",
                "checkUpdate": "升级到pro版",
                "checking": "检查中...",
                "updateAvailable": "发现新版本",
                "latestVersion": "版本已最新",
                "checkFailed": "检查失败",
                "newVersion": "发现新版本",
                "version": "新版本: %{version}",
                "releaseNotes": "更新内容",
                "noReleaseNotes": "暂无更新说明",
                "autoUpdateWarning": {
                    "title": "⚠️ 自动更新注意事项：",
                    "items": [
                        "更新过程中请勿关闭 Obsidian",
                        "更新完成后需要重启 sync vault",
                        "如果自动更新失败，请使用手动更新"
                    ]
                },
                "autoUpdate": "自动更新",
                "manualUpdate": "手动更新",
                "cancel": "取消",
                "autoUpdateFailed": "自动更新失败，请尝试手动更新",
                "downloading": "下载中...",
                "updating": "更新中...",
                "updateInstalled": "更新安装完成，请重启 sync vault 以应用更新",
                "updateInstallFailed": "下载更新失败:",
                "clickToOpen": "点击打开",
                "helpNotFound": "无法找到 README.md 文件",
            },
            "log": {
                "title": "日志模式",
                "desc": "记录插件运行日志",
                "openLogFile": "查看日志",
            },
        },
    }
};