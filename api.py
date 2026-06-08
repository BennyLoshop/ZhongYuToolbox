import time
import hashlib
import random
import string
import json
import requests
import oss2
from datetime import datetime
from pathlib import Path
from urllib.parse import urlparse
import codeUtils
import re
import json
from PIL import Image
from io import BytesIO
import os

def login(username, pwd):
    url = "http://sxz.api.zykj.org/api/TokenAuth/Login"
    headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Connection": "keep-alive",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
    }
    data = {"userName": username, "password": pwd, "clientType": 1}

    try:
        response = requests.post(url, headers=headers, json=data, verify=False)
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                return result["result"]["accessToken"]
            else:
                return "0"
        else:
            return "0"
    except Exception as e:
        return "0"

def ppt2webp(filepath,token,userid):
    url = upload(nonce=generate_custom_fileid(),filename="s.ppt",token=token,user_id=userid,sourcePath=filepath)
    rep = requests.get("https://sfs.zyai.cc:8443/OfficeConvertToPdf/Convert?pptUrl="+url)
    file_url = rep.json()["Data"]
    local_filename = file_url.split("/")[-1]
    print(f"正在下载: {file_url}")
    resp = requests.get(file_url, stream=True)
    resp.raise_for_status()

    with open(local_filename, "wb") as f:
        for chunk in resp.iter_content(chunk_size=8192):
            f.write(chunk)

    print(f"下载完成: {local_filename}")

    # 2. 上传文件
    upload_url = "https://pdf2img.zyai.cc/upload"
    with open(local_filename, "rb") as f:
        files = {"file": (local_filename, f)}
        r = requests.post(upload_url, files=files)
    
    r.raise_for_status()
    result = r.json()['imgPaths']

    # 3. 输出结果
    print("上传成功，返回结果：")
    print(result)

    # 删除临时文件
    os.remove(local_filename)
    output_files = []
    for idx, url in enumerate(result):
        # 下载图片
        print(f"下载: {url}")
        resp = requests.get(url)
        resp.raise_for_status()

        # 打开图片
        img = Image.open(BytesIO(resp.content)).convert("RGB")

        # 输出文件名：a.webp, b.webp, ...
        filename = f"./{chr(ord('a') + idx)}.webp"
        img.save(filename, "webp")

        print(f"保存: {filename}")
        output_files.append(filename)

    return output_files


def upload_page_list(pageList, user_id, token):
    """
    遍历 pageList，把每个文件上传，并更新 ossImageUrl。
    """
    today_str = datetime.datetime.now().strftime("%Y%m%d")
    uploaded_pages = []

    for page in pageList:
        oss_url = page["ossImageUrl"]

        # 从 oss_url 解析 nonce 和 filename
        nonce, filename = api.parse_oss_url(oss_url)

        # 实际上传
        final_url = api.upload(
            V=1,
            nonce=nonce,
            filename=filename,
            sourcePath=page["id"].replace(
                "/storage/emulated/0/", "storage/emulated/0/"
            ),  # 转换为本地路径
            user_id=user_id,
            token=token,
        )

        # 替换上传后的 url
        page["ossImageUrl"] = final_url

        uploaded_pages.append(page)

    return uploaded_pages

def generate_pagehash() -> str:
    """
    生成一个 pageHash（毫秒时间戳），保证唯一。
    """
    # 当前时间（毫秒）
    ts = int(time.time() * 1000)
    # 加上一点随机性，避免同一毫秒重复
    rand = random.randint(0, 999)
    return str(ts + rand)

def generate_custom_fileid(prefix="h", length=32) -> str:
    """
    生成自定义 fileId，长度 length，不包括前缀。
    必须包含至少一个非16进制字符（g-z）。
    """
    hex_chars = "0123456789abcdef"
    extra_chars = "ghijklmnopqrstuvwxyz"
    all_chars = hex_chars + extra_chars

    while True:
        # 随机生成 length 位
        body = ''.join(random.choices(all_chars, k=length))
        # 判断是否至少包含一个非16进制字符
        if any(c in extra_chars for c in body):
            return prefix + body

def get_uuid_or_res(path: str) -> str:
    """
    根据路径判断返回：
    - UUID（fileId 后的第一个匹配 UUID 格式目录）
    - 'res/img'（如果路径包含 res/img）
    - '' 其他情况
    """
    p = Path(path)
    parts = p.parts

    try:
        note_idx = parts.index("note")
        sub_dirs = parts[note_idx + 2 : -1]  # fileId 后到文件名的所有目录
        uuid_pattern = re.compile(
            r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        )

        for candidate in sub_dirs:
            if uuid_pattern.match(candidate):
                return candidate+"/"

        # 检查是否包含 res/img
        for i in range(len(sub_dirs) - 1):
            if sub_dirs[i] == "res" and sub_dirs[i + 1] == "img":
                return "res/img/"

        return ""
    except Exception:
        return ""


def parse_oss_url(oss_url: str):
    """
    从 ossImageUrl 中提取 nonce 和 filenameAndPath
    """
    path = urlparse(oss_url).path.strip("/")
    parts = path.split("/")

    if len(parts) < 6:
        raise ValueError(f"URL 格式不正确: {oss_url}")

    # nonce 在第 5 个元素
    nonce = parts[4]
    # filenameAndPath 从第 6 个开始拼接
    filename_and_path = "/".join(parts[5:])

    return nonce, filename_and_path

# ---------- 辅助 ----------
def generate_nonce():
    """生成随机 nonce"""
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=32))

def md5_upper(s: str) -> str:
    return hashlib.md5(s.encode("utf-8")).hexdigest().upper()

# ---------- 主函数 ----------
def upload(V=1, nonce=None, filename=None, sourcePath=None, token="",user_id=None):
    """
    上传文件到 OSS
    V: 功能模块 (int)，默认 1=note_v2
    nonce: 可指定，不传自动生成
    filename: 远程文件名，默认取 sourcePath 文件名
    sourcePath: 本地文件路径 (必须)
    """
    if not sourcePath:
        raise ValueError("必须指定 sourcePath")

    # 功能映射表
    V_MAP = {
        1: "note_v2", 2: "eval_v2", 3: "quora_v2", 4: "mistake_v2",
        5: "study_v2", 6: "column_v2", 7: "paper_v2", 8: "revise_v2",
        9: "selection_v2", 19: "manage_v2"
    }
    fc = V_MAP.get(V)
    if not fc:
        raise ValueError(f"未知 V 值: {V}")

    fr = "res"
    ft, fe, fo = 2, "", "0"

    # userId 从 API 获取，这里假设你已经有
    

    nonce = nonce or generate_nonce()
    file_name = filename or Path(sourcePath).name
    ts = int(time.time() * 1000)
    date_str = datetime.now().strftime("%Y%m%d")

    raw_str = f"{user_id}+{fc}+{fr}+{ft}+{fe}+{fo}+{nonce}+{ts}"
    sign = md5_upper(raw_str)

    # 调接口获取临时 token
    
    url_token = "https://zyapi.loshop.com.cn/api/services/app/ObjectStorage/GenerateTokenV2Async"
    json_data = {
        "fc": V, "fr": 1, "ft": ft, "fe": fe, "fo": fo,
        "nonce": nonce, "ts": ts, "sign": sign
    }
    resp = requests.post(url_token, json=json_data, headers={"Authorization": f"Bearer {token}"})
    resp.raise_for_status()
    result = resp.json()["result"]

    # 上传
    auth = oss2.StsAuth(result["accessKeyId"], result["accessKeySecret"], result["securityToken"])
    bucket = oss2.Bucket(auth, "http://oss-cn-hangzhou.aliyuncs.com", result["bucket"])
    remote_file = f"{fc}/{fr}/{user_id}/{date_str}/{nonce}/{file_name}"
    bucket.put_object_from_file(remote_file, sourcePath)

    # 返回 URL
    print(f"http://{result['bucket']}.oss-cn-hangzhou.aliyuncs.com/{remote_file}")
    return f"http://{result['bucket']}.oss-cn-hangzhou.aliyuncs.com/{remote_file}"


def addOrUpdateResource(resList, token):
    url = "http://sxz.api.zykj.org/CloudNotes/api/Resources/AddOrUpdate"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=UTF-8",
        "Connection": "Keep-Alive",
        "Accept-Encoding": "gzip",
    }
    data = codeUtils.encode(json.dumps(resList, ensure_ascii=False))
    print(json.dumps(resList, ensure_ascii=False))

    response = requests.post(url, headers=headers, data=data, verify=False)
    if response.status_code == 200:
        result = response.json()
        print(response.json())
        if result.get("code") == 0:
            return True
        else:
            return False

def addOrUpdateNote(fileId, fileName, parentId, type, fileUrl, token):
    url = "http://sxz.api.zykj.org/CloudNotes/api/Notes/AddOrUpdate"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json; charset=UTF-8",
        "Connection": "Keep-Alive",
        "Accept-Encoding": "gzip",
    }
    data = {
        "fileId": fileId,
        "fileName": fileName,
        "parentId": parentId,
        "fileUrl": fileUrl,
        "type": str(type),
    }
    print(data)
    data = codeUtils.encode(json.dumps(data, ensure_ascii=False))

    response = requests.post(url, headers=headers, data=data, verify=False)
    if response.status_code == 200:
        result = response.json()
        print(response.json())
        if result.get("code") == 0:
            return True
        else:
            return False

# 使用示例
if __name__ == "__main__":
    r= ppt2webp("pp.pptx",token="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjMwODc1IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6IjI0d3V5aXh1YW4iLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJTdHVkZW50Iiwic3ViIjoiMzA4NzUiLCJqdGkiOiJjNzI5YTc1Ny1lMDY0LTQ5N2QtYWJjOS1jNDU4ODdmNDNhYzkiLCJpYXQiOjE3NTg0MTI4NjEsInR5cCI6IlVzZXJuYW1lQW5kUGFzc3dvcmQiLCJuYmYiOjE3NTg0MTI4NjEsImV4cCI6MTc1ODQyMDA2MSwiaXNzIjoiRXp5IiwiYXVkIjoiU1haIn0.PpaAH64ogpnmEfMR-LXwQf5f6dG_egI3UA9OmIyYgdY",userid=30875)
    print(r)