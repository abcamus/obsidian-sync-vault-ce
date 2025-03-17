export default {
    "common": {
        "cancel": "Cancel",
        "confirm": "Confirm",
    },
    "sync": {
        "message": {
            "loadingRemoteMeta": "Loading remote file information...",
            "loading": "Loading...",
        },
        "toolTip": {
            "fullySynced": "Fully synced",
            "localModified": "Local modified, click to upload",
            "remoteModified": "Remote modified, click to download",
            "localCreated": "Local created, click to upload",
            "remoteCreated": "Remote created, click to download",
            "localDeleted": "Local deleted, click to upload",
            "remoteDeleted": "Remote deleted, click to download",
            "conflict": "Conflict",
            "unknown": "Unknown",
            "syncing": "Syncing",
        }
    },
    "plugin": {
        "name": "Sync vault",
        "title": "Open/close sync vault view",
        "view": {
            "syncStatus": "Sync vault status view",
            "cloudDisk": "Sync vault cloud view",
        },
        "authorize": {
            "title": "Authorize",
            "desc": "Authorize to use sync vault plugin",
            "success": "Authorize success",
            "failed": "Authorize failed",
        },
    },
    "fileNavBar": {
        "rootFolder": "Root folder",
    },
    "settingTab": {
        "vault": {
            "title": "Vault",
            "vaultDesc": "Cloud path: %{syncPath}",
            "enterRemotePath": "Enter cloud sync path",
        },
        "menuStartToUse": {
            "title": "Get started",
            "desc": "Authorize and activate after installation",
        },
        "menuSyncConfig": {
            "title": "Sync settings",
            "desc": "Configure upload, download strategies and encryption mode",
            "switchSyncMode": {
                "title": "Switch Sync Mode",
                "desc": "Support controlled sync mode, extensible for other sync modes",
            },
            "mode": {
                "selfControlled": "Controlled",
            },
            "uploadStrategy": {
                "title": "Upload mode",
                "desc": "Full auto upload (not available yet); Controlled upload: only previously uploaded files will be auto-uploaded",
                "userControl": "Controlled upload",
            },
            "downloadStrategy": {
                "title": "Download mode",
                "desc": "Full auto update (not available yet); Update on load: auto download files from cloud when plugin loads; Manual only: requires clicking download button",
                "autoOnLoad": "Update on load",
                "manual": "Manual only",
            },
        },
        "cloudDisk": {
            "title": "Select cloud storage",
            "desc": "Choose the cloud storage to use",
            "aliyunDisk": "Aliyun drive",
            "switchTo": "Switch to %{message}",
            "userName": "Username",
            "volume": "Storage",
            "getInfoFailed": "Failed to get cloud storage info, please try again later",
        },
        "accessToken": {
            "title": "Access token",
            "desc": "Display and manage your access token",
            "clickToAuthorize": "Click to authorize",
            "revoke": "Revoke",
            "unauthorized": "Unauthorized, please go to settings page to authorize",
        },
        "autoSync": {
            "title": "Auto sync on load",
            "desc": "Automatically sync from cloud when plugin starts",
        },
        "menuUpgradeAndHelp": {
            "title": "Upgrade & Help",
            "upgrade": {
                "title": "Upgrade to Pro",
                "checkUpdate": "Check for updates",
                "checking": "Checking...",
                "updateAvailable": "New version available",
                "latestVersion": "Already up to date",
                "checkFailed": "Check failed",
                "newVersion": "New version available",
                "version": "New version: %{version}",
                "releaseNotes": "Release Notes",
                "noReleaseNotes": "No release notes available",
                "autoUpdateWarning": {
                    "title": "⚠️ Auto Update Notice:",
                    "items": [
                        "Do not close Obsidian during the update",
                        "Restart sync vault after update",
                        "If auto update fails, please update manually"
                    ]
                },
                "autoUpdate": "Auto Update",
                "manualUpdate": "Manual Update",
                "cancel": "Cancel",
                "autoUpdateFailed": "Auto update failed, please try manual update",
                "downloading": "Downloading...",
                "updating": "Updating...",
                "updateInstalled": "Update installed, please restart sync vault to apply changes",
                "updateInstallFailed": "Update download failed:",
                "clickToOpen": "Click to open",
                "helpNotFound": "README.md file not found",
            },
            "log": {
                "title": "Log Mode",
                "desc": "Record plugin runtime logs",
                "openLogFile": "View Logs",
            },
        }
    },
};
