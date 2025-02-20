export default {
    "common": {
        "cancel": "取消",
        "confirm": "确认",
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

        "log": {
            "title": "日志模式",
            "desc": "记录插件运行日志",
            "openLogFile": "查看日志",
        },
    }
};