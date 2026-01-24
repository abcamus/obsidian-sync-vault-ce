export const AliNetdiskApi = {
    info: {
        get_user_info: {
            method: 'GET',
            url: 'https://open.aliyundrive.com/oauth/users/info'
        },
        get_space_info: {
            method: 'POST',
            url: 'https://open.aliyundrive.com/adrive/v1.0/user/getSpaceInfo'
        },
        get_drive_info: {
            method: 'POST',
            url: 'https://open.aliyundrive.com/adrive/v1.0/user/getDriveInfo'
        },
        get_file_info_by_path: {
            method: 'POST',
            url: 'https://open.aliyundrive.com/adrive/v1.0/openFile/get_by_path'
        },
        list: {
            method: 'POST',
            url: 'https://open.aliyundrive.com/adrive/v1.0/openFile/list'
        }
    },
    file_mng: {
        rename: {
            method: 'POST',
            url: 'https://open.aliyundrive.com/adrive/v1.0/openFile/update'
        },
        delete: {
            method: 'POST',
            url: 'https://open.aliyundrive.com/adrive/v1.0/openFile/delete'
        },
        copy: {
            method: 'POST',
            url: 'https://open.aliyundrive.com/adrive/v1.0/openFile/copy'
        },
        move: {
            method: 'POST',
            url: 'https://open.aliyundrive.com/adrive/v1.0/openFile/move'
        }
    },
    download: {
        get_download_url: {
            method: 'POST',
            url: 'https://open.aliyundrive.com/adrive/v1.0/openFile/getDownloadUrl'
        }
    },
    upload: {
        create_upload_url: {
            method: 'POST',
            url: 'https://open.aliyundrive.com/adrive/v1.0/openFile/create'
        },
        complete_upload: {
            method: 'POST',
            url: 'https://open.aliyundrive.com/adrive/v1.0/openFile/complete'
        }
    }
}