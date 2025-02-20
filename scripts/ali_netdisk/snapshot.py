import requests
from datetime import datetime
import time
from api import AliNetDiskApi


def get_drive_id(access_token):
    method, url = AliNetDiskApi["user_mng"]["get_drive_id"].values()
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }
    body = {}
    response = requests.request(
        method, url, headers=headers, data=body, files={})
    return {
        "default_drive_id": response.json()["default_drive_id"],
        "resource_drive_id": response.json()["resource_drive_id"],
        "backup_drive_id": response.json()["backup_drive_id"],
    }


def list_files(access_token, parent_file_id="root", limit=100, marker=""):
    method, url = AliNetDiskApi["file_mng"]["list_files"].values()
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }
    body = {
        "drive_id": "902823001",
        "parent_file_id": parent_file_id,
        "limit": limit,
        "marker": marker,
    }
    try:
        response = requests.request(
            method, url, headers=headers, json=body, files={})
        if response.status_code != 200:
            raise Exception(response.json())
        return [
            {
                "name": file["name"],
                "file_id": file["file_id"],
                "type": file["type"],
            } for file in response.json()["items"]
        ], response.json()["next_marker"]
    except Exception as e:
        print(e)
        return []

def list_all_files(access_token, folder_id):
    items = []
    next_marker = ""
    while True:
        current_items, next_marker = list_files(
            access_token, folder_id, 100, next_marker)
        print(f'current_items: {len(current_items)}, next_marker: {next_marker}')
        items.extend(current_items)
        if next_marker == "":
            break
    return items

def search_files(access_token, dir_path):
    current_time = datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
    method, url = AliNetDiskApi["file_mng"]["search_files"].values()
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }
    body = {
        "drive_id": "902823001",
        "query": f"created_at < {current_time}",
    }
    try:
        response = requests.request(method, url, headers=headers, json=body)
        if response.status_code == 200:
            return [(file['name'], file['file_id']) for file in response.json()["items"]]
        else:
            raise Exception(response.json())
    except Exception as e:
        print(e)
        return []


def get_file_by_path(access_token, file_path):
    method, url = AliNetDiskApi["file_mng"]["get_file_by_path"].values()
    headers = {
        'Content-Type': 'application/json',
        'Authorization': f'Bearer {access_token}'
    }
    body = {
        "drive_id": "902823001",
        "file_path": file_path
    }
    response = requests.request(method, url, headers=headers, json=body)
    if response.status_code == 200:
        data = response.json()
        return {
            "file_id": data["file_id"],
            "file_name": data["name"],
            "type": data["type"],
        }
    else:
        print(f'status: {response.status_code}, response: {response.json()}')
        return None


def delay_80ms():
    time.sleep(0.08)


# 生成文件夹的快照
def create_snapshot(access_token, folder_id):
    # 获取文件夹的子文件
    print(f'create snapshot of folder: {folder_id}')
    items = list_all_files(access_token, folder_id)
    files = []
    delay_80ms()
    for item in items:
        if item["type"] == "folder":
            print(f'snapshot folder: {item["name"]}')
            files.extend(create_snapshot(access_token, item["file_id"]))
        else:
            files.append(item)
    return files


def create_snapshot_of_path(access_token, dir_path):
    folder = get_file_by_path(access_token, dir_path)
    if folder is None:
        print(f'folder not found: {dir_path}')
        exit(1)
    return create_snapshot(access_token, folder["file_id"])


if __name__ == "__main__":
    access_token = input("请输入access_token: ")
    root_dir = "/apps/obsidian/Brain Vault/"
    start_time = time.time()
    items = create_snapshot_of_path(access_token, root_dir)
    end_time = time.time()
    print(f"items: {len(items)}, time elapsed: {end_time - start_time}s")