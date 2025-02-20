AliNetDiskApi = {
    "user_mng": {
        "get_drive_id": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/user/getDriveInfo",
        },
        "get_user_info": {
            "method": "GET",
            "url": "https://open.aliyundrive.com/oauth/users/info",
        },
        "get_user_space_info": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/user/getSpaceInfo",
        },
        "get_user_vip_info": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/business/v1.0/user/getVipInfo",
        },
        "get_user_auth_scopes": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/oauth/users/scopes",
        },
    },
    "file_mng": {
        "create_file_fast_transfer": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/createFastTransfer",
        },
        "create_file_share": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/createShare",
        },
        "list_files": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/list",
        },
        "search_files": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/search",
        },
        "fetch_starred_files": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/starredList",
        },
        "get_file_detail": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/get",
        },
        "get_file_by_path": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/get_by_path",
        },
        "get_file_detail_in_batch": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/batch/get",
        },
        "get_file_download_url": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/getDownloadUrl",
        },
        "create_file": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/create",
        },
        "get_upload_url": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/getUploadUrl",
        },
        "list_uploaded_parts": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/listUploadedParts",
        },
        "complete_upload": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/complete",
        },
        "update_file": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/update",
        },
        "move_file": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/move",
        },
        "copy_file": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/copy",
        },
        "move_to_trash": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/recyclebin/trash",
        },
        "delete_file": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/delete",
        },
        "get_async_task_status": {
            "method": "POST",
            "url": "https://open.aliyundrive.com/adrive/v1.0/openFile/async_task/get",
        },
    },
}
