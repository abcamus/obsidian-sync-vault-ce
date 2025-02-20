export default {
    "common": {
        "cancel": "Cancel",
        "confirm": "Confirm",
    },
    "plugin": {
        "name": "Sync Vault",
        "title": "Open/Close Sync Vault View",
        "view": {
            "syncStatus": "Sync Vault Status View",
            "cloudDisk": "Sync Vault Cloud View",
        },
        "authorize": {
            "title": "Authorize",
            "desc": "Authorize to use Sync Vault plugin",
            "success": "Authorize success",
            "failed": "Authorize failed",
        },
    },
    "fileNavBar": {
        "rootFolder": "Root Folder",
    },
    "settingTab": {
        "vault": {
            "title": "Vault",
            "vaultDesc": "Cloud Path: %{syncPath}",
            "enterRemotePath": "Enter cloud sync path",
        },
        "menuStartToUse": {
            "title": "Get Started",
            "desc": "Authorize and activate after installation",
        },
        "menuSyncConfig": {
            "title": "Sync Settings",
            "desc": "Configure upload, download strategies and encryption mode",
            "uploadStrategy": {
                "title": "Upload Mode",
                "desc": "Full auto upload (not available yet); Controlled upload: only previously uploaded files will be auto-uploaded",
                "userControl": "Controlled Upload",
            },
          
            "downloadStrategy": {
                "title": "Download Mode",
                "desc": "Full auto update (not available yet); Update on load: auto download files from cloud when plugin loads; Manual only: requires clicking download button",
                "autoOnLoad": "Update on Load",
                "manual": "Manual Only",
            },
        },
        "cloudDisk": {
            "title": "Select Cloud Storage",
            "desc": "Choose the cloud storage to use",
            "aliyunDisk": "Aliyun Drive",
            "switchTo": "Switch to %{message}",
            "userName": "Username",
            "volume": "Storage",
            "getInfoFailed": "Failed to get cloud storage info, please try again later",
        },
        "accessToken": {
            "title": "Access Token",
            "desc": "Display and manage your access token",
            "clickToAuthorize": "Click to Authorize",
            "revoke": "Revoke",
            "unauthorized": "Unauthorized, please go to settings page to authorize",
        },
        "autoSync": {
            "title": "Auto Sync on Load",
            "desc": "Automatically sync from cloud when plugin starts",
        },
        "log": {
            "title": "Log Mode",
            "desc": "Record plugin running logs",
            "openLogFile": "View Logs",
        }
    },
};
