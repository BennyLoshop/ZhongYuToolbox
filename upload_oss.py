"""
OSS 上传脚本 — 与 index.js 中 uploadBoardFile 逻辑一致
用法: python upload_oss.py <本地文件路径> [--fc quora_v2] [--fr res]
"""

import argparse
import hashlib
import os
import sys
import time
import uuid

import oss2
import requests

# ---------- 配置 ----------
API_BASE_URL = "https://zyapi.loshop.com.cn"
TOKEN_ENV = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjMwODc1IiwiaHR0cDovL3NjaGVtYXMueG1sc29hcC5vcmcvd3MvMjAwNS8wNS9pZGVudGl0eS9jbGFpbXMvbmFtZSI6IjI0d3V5aXh1YW4iLCJodHRwOi8vc2NoZW1hcy5taWNyb3NvZnQuY29tL3dzLzIwMDgvMDYvaWRlbnRpdHkvY2xhaW1zL3JvbGUiOiJTdHVkZW50Iiwic3ViIjoiMzA4NzUiLCJqdGkiOiJlYjQyYzM0My05ZGNmLTQ4ZjMtOTdmMC02N2JiMTgzZmFiMzUiLCJpYXQiOjE3ODA4MzY2ODksInR5cCI6IlVzZXJuYW1lQW5kUGFzc3dvcmQiLCJuYmYiOjE3ODA4MzY2ODksImV4cCI6MTc4MDg0Mzg4OSwiaXNzIjoiRXp5IiwiYXVkIjoiU1haIn0.i-4vg-aJLQ0EfwJGz4zUxKChKcp1ctGbS_uj3jcUevk"         # 优先从环境变量读取 token
USER_ID_ENV = "30875"     # 优先从环境变量读取 userId

V_MAP = {"quora_v2": 3}
G_MAP = {"res": 1}


def generate_nonce() -> str:
    """生成与 JS generateNonce 等价的 nonce"""
    return str(uuid.uuid4()).replace("-", "")


def md5(s: str) -> str:
    return hashlib.md5(s.encode("utf-8")).hexdigest().upper()  # JS端用了 .toUpperCase()


def get_sts_credentials(token: str, userId: str, fc: str, fr: str,
                        ft: int = 2, fe: str = "", fo: str = "0") -> dict:
    """
    调用 GenerateTokenV2Async 获取 STS 临时凭证
    """
    nonce = generate_nonce()
    ts = int(time.time() * 1000)  # 毫秒时间戳
    raw = f"{userId}+{fc}+{fr}+{ft}+{fe}+{fo}+{nonce}+{ts}"
    sign = md5(raw)

    url = f"{API_BASE_URL}/api/services/app/ObjectStorage/GenerateTokenV2Async"
    headers = {
        "Accept": "application/json",
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    body = {
        "fc": V_MAP[fc],
        "fr": G_MAP[fr],
        "ft": ft,
        "fe": fe,
        "fo": fo,
        "nonce": nonce,
        "ts": ts,
        "sign": sign,
    }

    resp = requests.post(url, json=body, headers=headers, timeout=30)
    resp.raise_for_status()
    data = resp.json()
    if not data.get("result"):
        raise RuntimeError(f"获取OSS Token失败: {data}")
    return data["result"], nonce


def upload_file(local_path: str, token: str, userId: str,
                fc: str = "quora_v2", fr: str = "res") -> str:
    """
    上传文件到 OSS，返回公开访问 URL
    """
    file_name = os.path.basename(local_path)
    result, nonce = get_sts_credentials(token, userId, fc, fr)

    auth = oss2.StsAuth(
        result["accessKeyId"],
        result["accessKeySecret"],
        result["securityToken"],
    )
    region = result.get("region") or "oss-cn-hangzhou"
    # 与 JS 一致：通过 region 连接 OSS
    bucket_endpoint = f"https://{region}.aliyuncs.com"
    bucket = oss2.Bucket(auth, bucket_endpoint, result["bucket"])

    date_str = time.strftime("%Y%m%d")
    remote_path = f"{fc}/{fr}/{userId}/{date_str}/{nonce}/{file_name}"

    print(f"正在上传: {local_path} -> {remote_path}")
    bucket.put_object_from_file(remote_path, local_path)
    print("上传完成!")

    # 构造公开 URL，优先用 bucket 名拼默认地址
    url = f"https://{result['bucket']}.{region}.aliyuncs.com/{remote_path}"
    return url


def main():
    parser = argparse.ArgumentParser(description="上传文件到 OSS")
    parser.add_argument("file", help="本地文件路径")
    parser.add_argument("--token", help="Bearer token (也可通过环境变量 ZY_TOKEN 设置)")
    parser.add_argument("--userId", help="用户 ID (也可通过环境变量 ZY_USER_ID 设置)")
    parser.add_argument("--fc", default="quora_v2", help="文件夹分类，默认 quora_v2")
    parser.add_argument("--fr", default="res", help="资源分类，默认 res")
    args = parser.parse_args()

    token = args.token or os.environ.get(TOKEN_ENV)
    userId = args.userId or os.environ.get(USER_ID_ENV)

    if not token:
        print("错误: 请提供 --token 或设置环境变量 ZY_TOKEN", file=sys.stderr)
        sys.exit(1)
    if not userId:
        print("错误: 请提供 --userId 或设置环境变量 ZY_USER_ID", file=sys.stderr)
        sys.exit(1)
    if not os.path.isfile(args.file):
        print(f"错误: 文件不存在: {args.file}", file=sys.stderr)
        sys.exit(1)

    url = upload_file(args.file, token, userId, args.fc, args.fr)
    print(f"\n✅ 上传成功!\nURL: {url}")
    return url


if __name__ == "__main__":
    main()
