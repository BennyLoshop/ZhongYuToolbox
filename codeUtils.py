import base64
from datetime import datetime
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad
import random

def encode(data: str) -> str:
    # 生成动态密钥
    def generate_aes_key():
        e = ":F0wKU!Qg3}UkbW+w[:9|D3-5h=:T;7t#_GZ4#G;~ZNSq{8;}QIP>'{q.lje"
        t = datetime.now()
        n = t.year
        r = t.month
        o = t.day
        i = 33 + o * r * 33
        a = chr(i % 94 + 33)
        s = e[o + r]
        c = n * r * o % len(e)
        u = e[:c]
        l = e[c:]
        f = (l + u)[:14]
        return a + f + s

    key_str = generate_aes_key()
    key_bytes = key_str.encode('utf-8')

    cipher = AES.new(key_bytes, AES.MODE_ECB)
    padded_data = pad(data.encode('utf-8'), AES.block_size)
    encrypted_data = cipher.encrypt(padded_data)

    return base64.b64encode(encrypted_data).decode('utf-8')


def decode(encrypted_data: str) -> str:
    # 使用相同的动态密钥生成方法
    def generate_aes_key():
        e = ":F0wKU!Qg3}UkbW+w[:9|D3-5h=:T;7t#_GZ4#G;~ZNSq{8;}QIP>'{q.lje"
        t = datetime.now()
        n = t.year
        r = t.month
        o = t.day
        i = 33 + o * r * 33
        a = chr(i % 94 + 33)
        s = e[o + r]
        c = n * r * o % len(e)
        u = e[:c]
        l = e[c:]
        f = (l + u)[:14]
        return a + f + s

    key_str = generate_aes_key()
    key_bytes = key_str.encode('utf-8')

    cipher = AES.new(key_bytes, AES.MODE_ECB)
    decrypted_data = cipher.decrypt(base64.b64decode(encrypted_data))
    return unpad(decrypted_data, AES.block_size).decode('utf-8')