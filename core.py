import json
from pathlib import Path
import hashlib
import datetime
import os
import uuid
import api


# ========== 配置 ==========
def uploadNote(
    output_file="reconstructed.json", user_id=None, token="", name="", imgList=[]
):
    download_root = Path(
        "storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note"
    )
    custom_fileId = api.generate_custom_fileid()
    oss_base_url = "http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res"

    # ========== 工具函数 ==========
    def calc_md5(file_path: Path) -> str:
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest().upper()

    def get_resource_type(file_path: Path) -> int:
        if file_path.suffix.lower() in [".png"]:
            return 2
        if file_path.suffix.lower() in [".webp"]:
            return 0
        return 1

    resource_list = []

    today_str = datetime.datetime.now().strftime("%Y%m%d")
    oss_pageHash = api.generate_pagehash()
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    api.upload(
        V=1,
        nonce=custom_fileId,
        filename=f"{oss_pageHash}/page_router.bin",
        sourcePath="example/page_router.bin",
        user_id=user_id,
        token=token,
    )
    api.upload(
        V=1,
        nonce=custom_fileId,
        filename=f"{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/059848e4-1971-47fb-9e47-517266cdef05_matrix.bin",
        sourcePath="example/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/059848e4-1971-47fb-9e47-517266cdef05_matrix.bin",
        user_id=user_id,
        token=token,
    )
    api.upload(
        V=1,
        nonce=custom_fileId,
        filename=f"{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/a2b4fb47-3623-45be-9fe9-57fc62e66651_file.bin",
        sourcePath="example/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/a2b4fb47-3623-45be-9fe9-57fc62e66651_file.bin",
        user_id=user_id,
        token=token,
    )
    api.upload(
        V=1,
        nonce=custom_fileId,
        filename=f"{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/e339e39b-64d9-4de0-bfaa-dace2a3f8e7d_command.bin",
        sourcePath="example/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/e339e39b-64d9-4de0-bfaa-dace2a3f8e7d_command.bin",
        user_id=user_id,
        token=token,
    )
    api.upload(
        V=1,
        nonce=custom_fileId,
        filename=f"{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/header.bin",
        sourcePath="example/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/header.bin",
        user_id=user_id,
        token=token,
    )
    api.upload(
        V=1,
        nonce=custom_fileId,
        filename=f"{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/router.bin",
        sourcePath="example/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/router.bin",
        user_id=user_id,
        token=token,
    )
    api.upload(
        V=1,
        nonce=custom_fileId,
        filename=f"{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/screenshot.png",
        sourcePath="example/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/screenshot.png",
        user_id=user_id,
        token=token,
    )
    api.upload(
        V=1,
        nonce=custom_fileId,
        filename=f"{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/snapshot.bin",
        sourcePath="example/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/snapshot.bin",
        user_id=user_id,
        token=token,
    )

    pageIndex = 0

    for i in imgList:
        pageHash = api.generate_pagehash()
        api.upload(
            V=1,
            nonce=custom_fileId,
            filename=f"{pageHash}/B466246B6F67160E63431159941CD9A9screenCaptureb59d24b6-00fa-4f53-bc4f-1df255a5101a.webp",
            sourcePath=i,
            user_id=user_id,
            token=token,
        )

        pageList = [
            {
                "id": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}/page_router.bin",
                "fileId": custom_fileId,
                "pageName": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}",
                "pageIndex": pageIndex,
                "md5": "C6FFAEB070ADBEC6B886BE63587CB0F8",
                "resourceType": 1,
                "ossImageUrl": f"http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/30875/{today_str}/{custom_fileId}/{oss_pageHash}/page_router.bin",
                "createTimeStamp": timestamp,
                "updateTimeStamp": timestamp,
                "toBeUploaded": False,
                "wasDeleted": False,
            },
            {
                "id": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/059848e4-1971-47fb-9e47-517266cdef05_matrix.bin",
                "fileId": custom_fileId,
                "pageName": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}",
                "pageIndex": pageIndex,
                "md5": "5D03C5A75809ED20D24C18388BB8AB63",
                "resourceType": 1,
                "ossImageUrl": f"http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/30875/{today_str}/{custom_fileId}/{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/059848e4-1971-47fb-9e47-517266cdef05_matrix.bin",
                "createTimeStamp": timestamp,
                "updateTimeStamp": timestamp,
                "toBeUploaded": False,
                "wasDeleted": False,
            },
            {
                "id": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/a2b4fb47-3623-45be-9fe9-57fc62e66651_file.bin",
                "fileId": custom_fileId,
                "pageName": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}",
                "pageIndex": pageIndex,
                "md5": "5924B6262213683E6A4A2AFD3E4A270B",
                "resourceType": 1,
                "ossImageUrl": f"http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/30875/{today_str}/{custom_fileId}/{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/a2b4fb47-3623-45be-9fe9-57fc62e66651_file.bin",
                "createTimeStamp": timestamp,
                "updateTimeStamp": timestamp,
                "toBeUploaded": False,
                "wasDeleted": False,
            },
            {
                "id": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/e339e39b-64d9-4de0-bfaa-dace2a3f8e7d_command.bin",
                "fileId": custom_fileId,
                "pageName": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}",
                "pageIndex": pageIndex,
                "md5": "FEC4C90827E797E54126BB996BF0AF05",
                "resourceType": 1,
                "ossImageUrl": f"http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/30875/{today_str}/{custom_fileId}/{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/e339e39b-64d9-4de0-bfaa-dace2a3f8e7d_command.bin",
                "createTimeStamp": timestamp,
                "updateTimeStamp": timestamp,
                "toBeUploaded": False,
                "wasDeleted": False,
            },
            {
                "id": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/header.bin",
                "fileId": custom_fileId,
                "pageName": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}",
                "pageIndex": pageIndex,
                "md5": "A929A287A521818CA4E56A9E643866AE",
                "resourceType": 1,
                "ossImageUrl": f"http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/30875/{today_str}/{custom_fileId}/{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/header.bin",
                "createTimeStamp": timestamp,
                "updateTimeStamp": timestamp,
                "toBeUploaded": False,
                "wasDeleted": False,
            },
            {
                "id": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/router.bin",
                "fileId": custom_fileId,
                "pageName": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}",
                "pageIndex": pageIndex,
                "md5": "053971527BD9F3D4E3F9B2A1A4D2023F",
                "resourceType": 1,
                "ossImageUrl": f"http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/30875/{today_str}/{custom_fileId}/{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/router.bin",
                "createTimeStamp": timestamp,
                "updateTimeStamp": timestamp,
                "toBeUploaded": False,
                "wasDeleted": False,
            },
            {
                "id": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/screenshot.png",
                "fileId": custom_fileId,
                "pageName": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}",
                "pageIndex": pageIndex,
                "md5": "538BC7AC54289E9EAA758C50A006AE59",
                "resourceType": 2,
                "ossImageUrl": f"http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/30875/{today_str}/{custom_fileId}/{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/screenshot.png",
                "createTimeStamp": timestamp,
                "updateTimeStamp": timestamp,
                "toBeUploaded": False,
                "wasDeleted": False,
            },
            {
                "id": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/snapshot.bin",
                "fileId": custom_fileId,
                "pageName": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}",
                "pageIndex": pageIndex,
                "md5": "9A26C2CA8A7C8731602497EA578C994F",
                "resourceType": 1,
                "ossImageUrl": f"http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/30875/{today_str}/{custom_fileId}/{oss_pageHash}/a888b5fb-e65d-4611-a3af-1f80a0fb6ced/snapshot.bin",
                "createTimeStamp": timestamp,
                "updateTimeStamp": timestamp,
                "toBeUploaded": False,
                "wasDeleted": False,
            },
            {
                "id": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}/res/image/B466246B6F67160E63431159941CD9A9screenCaptureb59d24b6-00fa-4f53-bc4f-1df255a5101a.webp",
                "fileId": custom_fileId,
                "pageName": f"/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/30875/note/{custom_fileId}/{pageHash}",
                "pageIndex": pageIndex,
                "md5": "4126E637D965204140D4982A1B847283",
                "resourceType": pageIndex,
                "ossImageUrl": f"http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/30875/{today_str}/{custom_fileId}/{pageHash}/B466246B6F67160E63431159941CD9A9screenCaptureb59d24b6-00fa-4f53-bc4f-1df255a5101a.webp",
                "createTimeStamp": timestamp,
                "updateTimeStamp": timestamp,
                "toBeUploaded": False,
                "wasDeleted": False,
            },
        ]

        for resource in pageList:
            resource_list.append(resource)

        pageIndex += 1

    # ========== 构建 JSON ==========
    output_data = {
        "code": "sxz",
        "userId": user_id,
        "totalCount": len(resource_list),
        "resourceList": resource_list,
    }

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(output_data, f, ensure_ascii=False, indent=4)

    print(f"✅ JSON 已生成: {output_file}")

    api.addOrUpdateResource(resource_list, token)

    new_url = f"http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/{user_id}/{today_str}/{custom_fileId}/"
    api.addOrUpdateNote(custom_fileId, name, "0", 12, new_url, token)

def uploadPpt(file,user,userid):
    token=api.login(user[0],user[1])
    if token=="0":
        return
    img = api.ppt2webp(file,token,userid)
    print(uploadNote(
        output_file="reconstructed.json",
        user_id=userid,
        token=token,
        name=os.path.basename(file),
        imgList=img,
    ))

uploadPpt("pp.pptx","eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjMwODc1IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6IjI0d3V5aXh1YW4iLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJTdHVkZW50Iiwic3ViIjoiMzA4NzUiLCJqdGkiOiJjNzI5YTc1Ny1lMDY0LTQ5N2QtYWJjOS1jNDU4ODdmNDNhYzkiLCJpYXQiOjE3NTg0MTI4NjEsInR5cCI6IlVzZXJuYW1lQW5kUGFzc3dvcmQiLCJuYmYiOjE3NTg0MTI4NjEsImV4cCI6MTc1ODQyMDA2MSwiaXNzIjoiRXp5IiwiYXVkIjoiU1haIn0.PpaAH64ogpnmEfMR-LXwQf5f6dG_egI3UA9OmIyYgdY",30875)