"""
中育工具箱 - 分享服务器
支持资源类型: 错题、笔记、笔记文件夹、随身答问题、新测评、优客畅学课程/章节
"""

import sqlite3
import uuid
import hashlib
import json
import os
import time
import re
import io
import zipfile
import base64
import requests
from datetime import datetime, timedelta
from flask import Flask, request, jsonify, render_template_string
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad, unpad

app = Flask(__name__)
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'shares.db')


# ==================== CORS ====================

@app.after_request
def add_cors(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, DELETE, OPTIONS'
    return response


@app.route('/api/<path:path>', methods=['OPTIONS'])
@app.route('/api/<path:path>/<path:subpath>', methods=['OPTIONS'])
def handle_options(path='', subpath=''):
    return '', 204

# ==================== 工具函数 ====================

# 学校服务器地址替换逻辑（与 toolbox index.js 逻辑一致）
def _remap_server(server):
    """将发现服务返回的服务器地址映射为可用 HTTPS 地址
    
    支持模式：
    1. {code}.api.zykj.org  → https://zyapi-{code}.loshop.com.cn
    2. {code}.api2.zykj.org → https://zyapi-{code}.loshop.com.cn
    3. 已为 https:// 的直接返回
    4. 特殊硬编码映射
    """
    if not server:
        return ''
    
    # 已知硬编码映射
    hardcoded = {
        'http://sxzsyxx.api.zykj.org': 'https://zyapi-sxzsyxx.loshop.com.cn',
        'http://bjbsz.api2.zykj.org': 'https://zyapi-bjbsz.loshop.com.cn',
    }
    if server in hardcoded:
        return hardcoded[server]
    
    # 通用模式: {code}.api.zykj.org → https://zyapi-{code}.loshop.com.cn
    m = re.match(r'https?://([^.]+)\.api\.zykj\.org', server)
    if m:
        return f'https://zyapi-{m.group(1)}.loshop.com.cn'
    
    # 通用模式: {code}.api2.zykj.org → https://zyapi-{code}.loshop.com.cn
    m = re.match(r'https?://([^.]+)\.api2\.zykj\.org', server)
    if m:
        return f'https://zyapi-{m.group(1)}.loshop.com.cn'
    
    return server


def get_api_base_sync(school_code):
    """根据学校代码获取 API 基础 URL（同步版，与 toolbox 逻辑一致）
    
    1. sxz / 空白 → 默认 https://zyapi.loshop.com.cn
    2. 其它学校代码 → 先尝试 hagateway.zykj.org/api/discovery/{schoolCode} 发现
    3. 发现失败 → 尝试直接构造 https://zyapi-{schoolCode}.loshop.com.cn
    """
    school_code = (school_code or '').strip().lower()
    if school_code in ('sxz', ''):
        return 'https://zyapi.loshop.com.cn'

    # 尝试学校发现服务
    try:
        resp = requests.get(
            f'https://hagateway.zykj.org/api/discovery/{school_code}',
            timeout=10
        )
        if resp.ok:
            school_info = resp.json()
            server = _remap_server(school_info.get('server', ''))
            if server.startswith('https://'):
                return server
    except Exception:
        pass

    # 兜底：直接构造 URL
    return f'https://zyapi-{school_code}.loshop.com.cn'


# ==================== AES 加密（与前端 CryptoJS AES-ECB-PKCS7 一致）====================

def _aes_key():
    """生成与前端一致的 AES-128 密钥（基于日期）"""
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
    return (a + f + s).encode('utf-8')


def aes_encrypt(data_str):
    """AES-128-ECB-PKCS7 加密，与前端 window.aesEncrypt 一致"""
    key = _aes_key()
    cipher = AES.new(key, AES.MODE_ECB)
    padded = pad(data_str.encode('utf-8'), AES.block_size)
    encrypted = cipher.encrypt(padded)
    # CryptoJS 默认输出 Base64
    return base64.b64encode(encrypted).decode('utf-8')


# ==================== 数据库 ====================

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS shares (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            share_id TEXT UNIQUE NOT NULL,
            api_base TEXT NOT NULL DEFAULT '',
            username TEXT DEFAULT '',
            token TEXT NOT NULL,
            resource_type TEXT NOT NULL,
            resource_id TEXT NOT NULL,
            chapter_id TEXT DEFAULT '',
            title TEXT DEFAULT '',
            password_hash TEXT DEFAULT '',
            content TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            view_count INTEGER DEFAULT 0,
            max_views INTEGER DEFAULT 0
        )
    ''')
    # 兼容旧表：添加缺失列
    try:
        conn.execute('ALTER TABLE shares ADD COLUMN api_base TEXT NOT NULL DEFAULT ""')
    except:
        pass
    try:
        conn.execute('ALTER TABLE shares ADD COLUMN content TEXT DEFAULT ""')
    except:
        pass
    conn.commit()
    conn.close()


def generate_share_id():
    return uuid.uuid4().hex[:10]


def hash_pwd(pwd):
    return hashlib.sha256(pwd.encode()).hexdigest() if pwd else ''


# ==================== 内容获取函数 ====================

def fetch_mistake_item(api_base, token, item_id):
    """获取错题详情"""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{api_base}/api/services/app/MistakeBook/GetMistakeQstItemDetailInfoAsync?itemId={item_id}"
    resp = requests.get(url, headers=headers, timeout=30)
    detail = resp.json().get('result', {})
    if not detail:
        return None

    # 将相对路径转为完整 URL
    def _full_url(path):
        if not path:
            return path
        if path.startswith('http://') or path.startswith('https://'):
            return path
        return f"{api_base}{path}"

    # pictureNote：API 可能返回 null/None，用 or [] 兜底
    raw_pics = detail.get('pictureNote') or []

    result = {
        'source': detail.get('source', ''),
        'creationTime': detail.get('creationTime', ''),
        'stemShoot': detail.get('stemShoot', ''),
        'pictureNote': [_full_url(u) for u in raw_pics],
        'qst': None,
        'note_screenshot': None,
    }

    # 获取题目 HTML（题干+答案+解析）
    qst_path = detail.get('qstPath', '')
    if qst_path:
        try:
            qst_html = requests.get(f"{api_base}{qst_path}?showAnalysis=true",
                                    headers=headers, timeout=15).text
            from html.parser import HTMLParser

            # 提取题干
            stem = _extract_html_section(qst_html, 'class="stem"', 'class="answers"', 'class="analysis"')
            result['stem'] = stem or _extract_tag(qst_html, 'stem')

            # 提取答案
            answers = _extract_html_section(qst_html, 'class="answers"', 'class="analysis"', None)
            result['answers'] = answers or _extract_tag(qst_html, 'answers')

            # 提取解析
            analysis_parts = _extract_all_sections(qst_html, 'class="analysis"')
            result['analysis'] = analysis_parts
        except Exception as e:
            result['qst_error'] = str(e)

    # 笔记 zip URL（下载解压提取 screenshot.png 存为 base64）
    note_url = detail.get('note')
    if note_url:
        try:
            full_note = _full_url(note_url)
            zip_resp = requests.get(full_note, headers=headers, timeout=30)
            if zip_resp.status_code != 200:
                result['note_error'] = f'HTTP {zip_resp.status_code}: url={full_note}'
            else:
                with zipfile.ZipFile(io.BytesIO(zip_resp.content)) as zf:
                    names = zf.namelist()
                    png_name = next((n for n in names if n.lower().endswith('screenshot.png')), None)
                    if png_name:
                        png_bytes = zf.read(png_name)
                        result['note_screenshot'] = 'data:image/png;base64,' + base64.b64encode(png_bytes).decode()
                        result['note_screenshot_size'] = len(png_bytes)
                    else:
                        result['note_error'] = f'zip内未找到screenshot.png, 文件列表: {names}'
        except Exception as e:
            result['note_error'] = str(e)

    return result


def fetch_evaluation(api_base, token, exam_task_id):
    """获取新测评题目 URL 列表"""
    headers = {"Authorization": f"Bearer {token}"}

    try:
        resp = requests.get(
            f'{api_base}/api/services/app/Task/GetExamTaskAsync?id={exam_task_id}',
            headers=headers, timeout=15
        )
        exam_data = resp.json()
        exam = exam_data.get('result', exam_data)
    except Exception:
        return None

    if not isinstance(exam, dict):
        return None

    qst_ids = []
    # 实际 API 返回结构: result.groups[].questions[].id
    for group in exam.get('groups', []):
        for q in group.get('questions', []):
            q_id = q.get('id')
            if q_id:
                qst_ids.append(q_id)

    # 兜底：尝试其他可能的字段名
    if not qst_ids:
        qst_ids = exam.get('qstIds', [])
    if not qst_ids:
        items = exam.get('items', [])
        qst_ids = [it.get('qstId', it.get('id')) for it in items if it.get('qstId') or it.get('id')]

    question_urls = [f'{api_base}/Question/View/{q_id}?showAnalysis=true' for q_id in qst_ids]

    return {
        'examName': exam.get('examName', ''),
        'questionUrls': question_urls,
    }


def fetch_course(api_base, token, course_id, chapter_id=''):
    """获取优客畅学课程/章节文章内容"""
    headers = {"Authorization": f"Bearer {token}"}

    if chapter_id:
        url = f"{api_base}/SelfStudy/api/learn/readContent?catalogId={chapter_id}&courseId={course_id}"
    else:
        url = f"{api_base}/SelfStudy/api/Learn/CourseDetail?id={course_id}"

    resp = requests.get(url, headers=headers, timeout=30)
    data = resp.json()

    title = ''
    description = ''
    content = ''

    if not isinstance(data, dict):
        return {'title': title, 'description': description, 'content': content,
                'catalogId': chapter_id, 'courseId': course_id}

    # 多路径提取内容
    inner = data.get('data')
    result = data.get('result')

    # data.data 可能是: 字符串(直接是内容) | 字典(含content/title等) | None
    if isinstance(inner, str):
        content = inner
    elif isinstance(inner, dict):
        content = inner.get('content', inner.get('htmlContent', inner.get('textContent', ''))) or ''
        title = inner.get('title', inner.get('catalogTitle', '')) or ''
        description = inner.get('description', inner.get('summary', '')) or ''

    # data.result 同理
    if not content and isinstance(result, dict):
        content = result.get('content', result.get('htmlContent', result.get('textContent', ''))) or ''
        if not title:
            title = result.get('title', result.get('catalogTitle', '')) or ''
            description = result.get('description', result.get('summary', '')) or ''

    # 兜底：data.content / data.htmlContent 直接在顶层
    if not content:
        content = data.get('content') or data.get('htmlContent') or data.get('textContent') or ''
    if not title:
        title = data.get('title') or data.get('catalogTitle') or ''

    article = {
        'title': title,
        'description': description,
        'content': content,
        'catalogId': chapter_id,
        'courseId': course_id,
    }
    return article


def fetch_quora(api_base, token, session_id):
    """获取随身答会话消息"""
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{api_base}/api/services/app/Quora/GetMessages?sessionId={session_id}"
    resp = requests.get(url, headers=headers, timeout=30)
    data = resp.json()
    return data.get('result', data)


def fetch_note_resource(api_base, token, file_id):
    """获取笔记资源列表"""
    headers = {"Authorization": f"Bearer {token}"}
    encrypted_params = aes_encrypt(f"fileId={file_id}")
    url = f"{api_base}/special/GetByFileId?{encrypted_params}"

    def _parse_response(data):
        """从响应中提取 resourceList"""
        # 路径1: AES 加密的 data 字段
        if isinstance(data, dict) and 'data' in data:
            try:
                raw = base64.b64decode(data['data'])
                key = _aes_key()
                cipher = AES.new(key, AES.MODE_ECB)
                decrypted = unpad(cipher.decrypt(raw), AES.block_size)
                inner = json.loads(decrypted.decode('utf-8'))
                rl = inner.get('resourceList', [])
                if rl:
                    return {'resourceList': rl, 'fileName': inner.get('fileName', '')}
            except Exception:
                pass  # AES 解密失败，继续尝试其他路径

        # 路径2: success/result 嵌套
        result = data.get('result', {}) if isinstance(data, dict) else {}
        if isinstance(result, dict):
            rl = result.get('resourceList', result.get('items', []))
            return {'resourceList': rl, 'fileName': result.get('fileName', '')}

        # 路径3: 直接返回的 list
        if isinstance(data, list):
            return {'resourceList': data, 'fileName': ''}

        return {'resourceList': [], 'fileName': ''}

    try:
        resp = requests.get(url, headers=headers, timeout=30)
        data = resp.json()
        return _parse_response(data)
    except Exception as e:
        # 兜底：尝试不带 AES 加密参数请求
        try:
            url2 = f"{api_base}/special/GetByFileId?fileId={file_id}"
            resp2 = requests.get(url2, headers=headers, timeout=30)
            data2 = resp2.json()
            return _parse_response(data2)
        except Exception:
            return {"error": str(e), "resourceList": []}


# ---- HTML 解析辅助 ----

def _extract_tag(html, class_name):
    """提取 class 对应的 div 内容"""
    import re
    pattern = rf'<div[^>]*class="[^"]*{class_name}[^"]*"[^>]*>(.*?)</div>'
    matches = re.findall(pattern, html, re.DOTALL)
    if matches:
        return _clean_html_h3(matches[0])
    return ''


def _extract_html_section(html, start_marker, *end_markers):
    """提取两个标记之间的 HTML"""
    idx = html.find(start_marker)
    if idx == -1:
        return ''
    # 找到这个 div 的起始位置
    div_start = html.rfind('<div', 0, idx + 1)
    if div_start == -1:
        div_start = idx
    # 手动解析，匹配 div 标签深度
    depth = 0
    i = div_start
    in_tag = False
    result_start = None
    while i < len(html):
        if html[i:i + 4] == '<div':
            depth += 1
            if result_start is None:
                result_start = i
        elif html[i:i + 5] == '</div':
            depth -= 1
            if depth == 0 and result_start is not None:
                section = html[result_start:i + 6]
                # 检查是否在 end_markers 之前
                for em in end_markers:
                    if em and em in html[result_start:i]:
                        # 重新提取到该 marker 前
                        em_idx = section.find(em)
                        if em_idx > 0:
                            section = section[:em_idx]
                        break
                return _clean_html_h3(section)
        i += 1
    return ''


def _extract_all_sections(html, marker):
    """提取所有匹配的 section"""
    import re
    parts = []
    pattern = rf'<div[^>]*{re.escape(marker)}[^>]*>(.*?)</div>'
    # 更健壮的方式
    idx = 0
    while True:
        idx = html.find(marker, idx)
        if idx == -1:
            break
        # 找到包含这个 marker 的 div 起始
        div_start = html.rfind('<div', 0, idx)
        if div_start == -1:
            idx += len(marker)
            continue
        # 匹配深度
        depth = 0
        i = div_start
        while i < len(html):
            if html[i:i + 4] == '<div':
                depth += 1
            elif html[i:i + 5] == '</div':
                depth -= 1
                if depth == 0:
                    section = html[div_start:i + 6]
                    parts.append(_clean_html_h3(section))
                    break
            i += 1
        idx = i + 1
    return parts


def _clean_html_h3(html):
    """去除 h3 标题标签"""
    import re
    html = re.sub(r'<h3[^>]*>.*?</h3>', '', html, flags=re.DOTALL)
    return html.strip()


# ==================== API 端点 ====================

@app.route('/api/share/create', methods=['POST'])
def create_share():
    """创建分享——立即从 API 拉取内容存入数据库"""
    data = request.get_json(force=True, silent=True) or {}
    api_base = data.get('api_base', '').rstrip('/')
    resource_type = data.get('resource_type', '')
    resource_id = data.get('resource_id', '')
    chapter_id = data.get('chapter_id', '')
    title = data.get('title', '')
    password = data.get('password', '')
    token = data.get('token', '')
    username = data.get('username', '')
    expires_hours = data.get('expires_hours', 0)
    max_views = data.get('max_views', 0)

    if not api_base:
        return jsonify({'success': False, 'error': '缺少 apihost (api_base)'}), 400
    if not resource_type or not resource_id:
        return jsonify({'success': False, 'error': '缺少 resource_type 或 resource_id'}), 400

    valid_types = ('mistake', 'evaluation', 'course', 'chapter', 'quora', 'note', 'note_folder')
    if resource_type not in valid_types:
        return jsonify({'success': False, 'error': f'无效的资源类型，可选: {valid_types}'}), 400

    if not token:
        return jsonify({'success': False, 'error': '缺少 token'}), 400

    # 立即从 API 拉取内容
    content = None
    try:
        if resource_type == 'mistake':
            content = fetch_mistake_item(api_base, token, resource_id)
        elif resource_type in ('evaluation',):
            content = fetch_evaluation(api_base, token, resource_id)
        elif resource_type in ('course', 'chapter'):
            content = fetch_course(api_base, token, resource_id, chapter_id)
        elif resource_type == 'quora':
            content = fetch_quora(api_base, token, resource_id)
        elif resource_type in ('note', 'note_folder'):
            content = fetch_note_resource(api_base, token, resource_id)
    except Exception as e:
        return jsonify({'success': False, 'error': f'获取资源内容失败: {str(e)}'}), 500

    if content is None:
        return jsonify({'success': False, 'error': '无法获取资源内容（资源可能不存在或无权限）'}), 404

    content_json = json.dumps(content, ensure_ascii=False)

    share_id = generate_share_id()
    password_hash = hash_pwd(password) if password else ''
    expires_at = None
    if expires_hours > 0:
        expires_at = (datetime.now() + timedelta(hours=expires_hours)).isoformat()

    conn = get_db()
    conn.execute('''
        INSERT INTO shares (share_id, api_base, username, token, resource_type,
                           resource_id, chapter_id, title, password_hash, content,
                           expires_at, max_views)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (share_id, api_base, username, token, resource_type,
          resource_id, chapter_id, title, password_hash, content_json,
          expires_at, max_views))
    conn.commit()
    conn.close()

    share_url = f"{request.host_url}index.html#share={share_id}"
    return jsonify({
        'success': True,
        'share_id': share_id,
        'share_url': share_url,
        'has_password': bool(password),
        'expires_at': expires_at,
    })


@app.route('/api/share/<share_id>/info', methods=['GET'])
def share_info(share_id):
    """获取分享信息（不含内容，用于密码校验前展示）"""
    conn = get_db()
    row = conn.execute('SELECT * FROM shares WHERE share_id = ?', (share_id,)).fetchone()
    conn.close()

    if not row:
        return jsonify({'success': False, 'error': '分享不存在或已删除'}), 404

    row = dict(row)
    if row['expires_at'] and datetime.now() > datetime.fromisoformat(row['expires_at']):
        return jsonify({'success': False, 'error': '分享已过期'}), 410

    if row['max_views'] > 0 and row['view_count'] >= row['max_views']:
        return jsonify({'success': False, 'error': '分享已达到最大查看次数'}), 410

    return jsonify({
        'success': True,
        'share_id': row['share_id'],
        'resource_type': row['resource_type'],
        'title': row['title'],
        'has_password': bool(row['password_hash']),
        'created_at': row['created_at'],
        'expires_at': row['expires_at'],
        'view_count': row['view_count'],
        'max_views': row['max_views'],
    })


@app.route('/api/share/<share_id>', methods=['POST'])
def access_share(share_id):
    """访问分享内容——直接从数据库读取"""
    password = (request.get_json(force=True, silent=True) or {}).get('password', '')

    conn = get_db()
    row = conn.execute('SELECT * FROM shares WHERE share_id = ?', (share_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({'success': False, 'error': '分享不存在或已删除'}), 404

    row = dict(row)

    if row['expires_at'] and datetime.now() > datetime.fromisoformat(row['expires_at']):
        conn.close()
        return jsonify({'success': False, 'error': '分享已过期'}), 410

    if row['max_views'] > 0 and row['view_count'] >= row['max_views']:
        conn.close()
        return jsonify({'success': False, 'error': '分享已达到最大查看次数'}), 410

    if row['password_hash'] and hash_pwd(password) != row['password_hash']:
        conn.close()
        return jsonify({'success': False, 'error': '密码错误'}), 403

    conn.execute('UPDATE shares SET view_count = view_count + 1 WHERE share_id = ?', (share_id,))
    conn.commit()
    conn.close()

    # 直接从数据库读取内容
    try:
        content = json.loads(row['content']) if row['content'] else {}
    except json.JSONDecodeError:
        content = {'raw': row['content']}

    content['_meta'] = {
        'share_id': row['share_id'],
        'resource_type': row['resource_type'],
        'title': row['title'],
        'username': row['username'],
        'created_at': row['created_at'],
    }

    return jsonify({'success': True, 'content': content})


@app.route('/api/shares', methods=['GET'])
def list_shares():
    """列出所有分享（需要 token 验证）"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({'success': False, 'error': '缺少认证'}), 401

    conn = get_db()
    rows = conn.execute(
        'SELECT share_id, api_base, username, resource_type, resource_id, title, '
        'created_at, expires_at, view_count, max_views, '
        'CASE WHEN password_hash != "" THEN 1 ELSE 0 END as has_password '
        'FROM shares WHERE token = ? ORDER BY created_at DESC',
        (token,)
    ).fetchall()
    conn.close()
    return jsonify({'success': True, 'shares': [dict(r) for r in rows]})


@app.route('/api/share/<share_id>/delete', methods=['DELETE'])
def delete_share(share_id):
    """删除分享"""
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return jsonify({'success': False, 'error': '缺少认证'}), 401

    conn = get_db()
    row = conn.execute('SELECT token FROM shares WHERE share_id = ?', (share_id,)).fetchone()
    if not row:
        conn.close()
        return jsonify({'success': False, 'error': '分享不存在'}), 404
    if row['token'] != token:
        conn.close()
        return jsonify({'success': False, 'error': '无权删除此分享'}), 403

    conn.execute('DELETE FROM shares WHERE share_id = ?', (share_id,))
    conn.commit()
    conn.close()
    return jsonify({'success': True})


# ==================== 分享查看页面 ====================

SHARE_PAGE_HTML = r'''
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>分享内容 - 中育工具箱</title>
<link href="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.3.3/css/bootstrap.min.css" rel="stylesheet">
<style>
body {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}
.container { max-width: 960px; padding-top: 40px; padding-bottom: 40px; }
.card { border-radius: 16px; box-shadow: 0 10px 40px rgba(0,0,0,.15); }
.card-header { border-radius: 16px 16px 0 0 !important; }
.answer-card .card-header { background: #d4edda; color: #155724; }
.analysis-card .card-header { background: #d1ecf1; color: #0c5460; }
.note-img { max-width: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,.1); }
.pic-grid img { width: 100%; border-radius: 8px; cursor: pointer; transition: .2s; }
.pic-grid img:hover { transform: scale(1.02); box-shadow: 0 6px 20px rgba(0,0,0,.2); }
.meta-badge { font-size: .85rem; }
.password-box { max-width: 420px; margin: 100px auto; }
.spinner-box { text-align: center; padding: 80px 0; }
pre.json-view { background: #f8f9fa; border-radius: 8px; padding: 16px; max-height: 500px; overflow: auto; font-size: .85rem; }
</style>
</head>
<body>
<div class="container" id="app">
    <!-- 密码输入 -->
    <div id="passwordStep" style="display:none;">
        <div class="card password-box">
            <div class="card-body text-center p-5">
                <h4 class="mb-3">🔒 此内容已加密</h4>
                <p class="text-muted">请输入分享密码以查看内容</p>
                <div class="input-group mb-3">
                    <input type="password" id="pwdInput" class="form-control" placeholder="输入密码" onkeydown="if(event.key==='Enter')unlock()">
                    <button class="btn btn-primary" onclick="unlock()">解锁</button>
                </div>
                <div id="pwdError" class="text-danger small" style="display:none;">密码错误，请重试</div>
            </div>
        </div>
    </div>

    <!-- 加载 -->
    <div id="loadingStep">
        <div class="spinner-box">
            <div class="spinner-border text-light" role="status" style="width:3rem;height:3rem;"></div>
            <p class="text-light mt-3">正在加载分享内容...</p>
        </div>
    </div>

    <!-- 内容 -->
    <div id="contentStep" style="display:none;">
        <!-- 标题栏 -->
        <div class="card mb-4">
            <div class="card-body d-flex justify-content-between align-items-center flex-wrap">
                <div>
                    <h4 class="mb-1" id="contentTitle">分享内容</h4>
                    <span class="badge bg-secondary meta-badge" id="contentType"></span>
                    <span class="text-muted small ms-2" id="contentMeta"></span>
                </div>
                <div class="text-muted small">
                    由 <strong id="contentUser"></strong> 分享
                </div>
            </div>
        </div>

        <!-- 题目 -->
        <div class="card mb-3" id="stemCard" style="display:none;">
            <div class="card-header fw-bold text-primary">📝 题目</div>
            <div class="card-body" id="stemBody"></div>
        </div>

        <!-- 答案 -->
        <div class="card mb-3 answer-card" id="answerCard" style="display:none;">
            <div class="card-header fw-bold">✅ 答案</div>
            <div class="card-body" id="answerBody"></div>
        </div>

        <!-- 解析 -->
        <div class="card mb-3 analysis-card" id="analysisCard" style="display:none;">
            <div class="card-header fw-bold">📖 解析</div>
            <div class="card-body" id="analysisBody"></div>
        </div>

        <!-- 错题笔记截图 -->
        <div class="card mb-3" id="noteScreenshotCard" style="display:none;">
            <div class="card-header fw-bold text-primary">📸 笔记截图</div>
            <div class="card-body p-2 text-center">
                <img id="noteScreenshotImg" src="" class="note-img" alt="笔记截图">
            </div>
        </div>

        <!-- 错题图片笔记 -->
        <div class="card mb-3" id="picNoteCard" style="display:none;">
            <div class="card-header fw-bold text-primary">🖼️ 图片笔记</div>
            <div class="card-body pic-grid" id="picNoteBody"></div>
        </div>

        <!-- 随身答对话 -->
        <div class="card mb-3" id="quoraCard" style="display:none;">
            <div class="card-header fw-bold text-primary">💬 对话记录</div>
            <div class="card-body" id="quoraBody" style="max-height:600px;overflow:auto;"></div>
        </div>

        <!-- 课程内容 -->
        <div class="card mb-3" id="courseCard" style="display:none;">
            <div class="card-header fw-bold text-primary">📚 课程内容</div>
            <div class="card-body" id="courseBody"></div>
        </div>

        <!-- 云笔记 -->
        <div class="card mb-3" id="noteCard" style="display:none;">
            <div class="card-header fw-bold text-primary">📓 云笔记</div>
            <div class="card-body text-center" id="noteBody"></div>
            <div class="card-footer d-flex justify-content-between align-items-center" id="noteNav" style="display:none;">
                <button class="btn btn-sm btn-outline-primary" onclick="prevNotePage()">上一页</button>
                <span id="notePageInfo" class="text-muted small"></span>
                <button class="btn btn-sm btn-outline-primary" onclick="nextNotePage()">下一页</button>
            </div>
        </div>

        <!-- 通用 JSON -->
        <div class="card mb-3" id="rawCard" style="display:none;">
            <div class="card-header fw-bold text-secondary">📋 原始数据</div>
            <div class="card-body p-2">
                <pre class="json-view" id="rawBody"></pre>
            </div>
        </div>

        <!-- 错误 -->
        <div class="alert alert-danger" id="errorAlert" style="display:none;"></div>
    </div>

    <!-- footer -->
    <div class="text-center text-light mt-4 mb-3 opacity-75 small">
        中育工具箱 · 分享功能
    </div>
</div>

<script>
const SHARE_ID = '{{ share_id }}';
const API = window.location.origin;

async function load() {
    try {
        // 先获取分享信息
        const infoResp = await fetch(`${API}/api/share/${SHARE_ID}/info`);
        const info = await infoResp.json();

        if (!info.success) {
            showError(info.error);
            return;
        }

        // 需要密码
        if (info.has_password) {
            document.getElementById('loadingStep').style.display = 'none';
            document.getElementById('passwordStep').style.display = '';
            return;
        }

        await fetchContent('');
    } catch (e) {
        showError('网络错误: ' + e.message);
    }
}

async function unlock() {
    const pwd = document.getElementById('pwdInput').value;
    if (!pwd) return;
    await fetchContent(pwd);
}

async function fetchContent(password) {
    document.getElementById('passwordStep').style.display = 'none';
    document.getElementById('loadingStep').style.display = '';
    document.getElementById('contentStep').style.display = 'none';

    try {
        const resp = await fetch(`${API}/api/share/${SHARE_ID}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({password: password})
        });
        const data = await resp.json();

        if (!data.success) {
            if (data.error === '密码错误') {
                document.getElementById('loadingStep').style.display = 'none';
                document.getElementById('passwordStep').style.display = '';
                document.getElementById('pwdError').style.display = '';
                return;
            }
            showError(data.error);
            return;
        }

        render(data.content);
    } catch (e) {
        showError('加载失败: ' + e.message);
    }
}

function render(content) {
    document.getElementById('loadingStep').style.display = 'none';
    document.getElementById('contentStep').style.display = '';

    const meta = content._meta || {};
    document.getElementById('contentTitle').textContent = meta.title || '分享内容';
    document.getElementById('contentUser').textContent = meta.username || '用户';

    const typeMap = {
        'mistake':'错题', 'evaluation':'新测评', 'course':'课程',
        'chapter':'章节', 'quora':'随身答', 'note':'笔记', 'note_folder':'笔记文件夹'
    };
    document.getElementById('contentType').textContent = typeMap[meta.resource_type] || meta.resource_type;
    document.getElementById('contentMeta').textContent = meta.created_at ? '创建于 ' + meta.created_at : '';

    let hasContent = false;

    // 题干
    const stem = content.stem || '';
    if (stem) {
        document.getElementById('stemBody').innerHTML = stem;
        document.getElementById('stemCard').style.display = '';
        hasContent = true;
    }

    // 答案
    const answers = content.answers || '';
    if (answers) {
        document.getElementById('answerBody').innerHTML = answers;
        document.getElementById('answerCard').style.display = '';
        hasContent = true;
    }

    // 解析
    const analysis = content.analysis || [];
    if (analysis.length > 0) {
        document.getElementById('analysisBody').innerHTML = analysis.join('<hr>');
        document.getElementById('analysisCard').style.display = '';
        hasContent = true;
    }

    // 错题笔记截图
    if (content.note_screenshot) {
        document.getElementById('noteScreenshotImg').src = content.note_screenshot;
        document.getElementById('noteScreenshotCard').style.display = '';
        hasContent = true;
    }

    // 错题图片笔记
    if (content.pictureNote && content.pictureNote.length > 0) {
        let html = '<div class="row g-2">';
        content.pictureNote.forEach(url => {
            html += `<div class="col-6 col-md-4">
                <img src="${url}" onclick="window.open('${url}')" loading="lazy">
            </div>`;
        });
        html += '</div>';
        document.getElementById('picNoteBody').innerHTML = html;
        document.getElementById('picNoteCard').style.display = '';
        hasContent = true;
    }

    // 随身答
    if (meta.resource_type === 'quora') {
        document.getElementById('quoraBody').innerHTML = renderQuora(content);
        document.getElementById('quoraCard').style.display = '';
        hasContent = true;
    }

    // 课程
    if ((meta.resource_type === 'course' || meta.resource_type === 'chapter') && !hasContent) {
        document.getElementById('courseBody').innerHTML = renderCourse(content);
        document.getElementById('courseCard').style.display = '';
        hasContent = true;
    }

    // 云笔记 / 笔记文件夹
    if ((meta.resource_type === 'note' || meta.resource_type === 'note_folder') && !hasContent) {
        if (content.resourceList && content.resourceList.length > 0) {
            renderNotePages(content.resourceList, content.fileName);
            document.getElementById('noteCard').style.display = '';
            hasContent = true;
        } else {
            document.getElementById('rawBody').textContent = JSON.stringify(content, null, 2);
            document.getElementById('rawCard').style.display = '';
            hasContent = true;
        }
    }

    if (!hasContent) {
        document.getElementById('rawBody').textContent = JSON.stringify(content, null, 2);
        document.getElementById('rawCard').style.display = '';
    }
}

var _notePages = [];
var _notePageIdx = 0;

function buildPageMap(resourceList) {
    var map = {};
    var IMG_RE = /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i;
    for (var i = 0; i < resourceList.length; i++) {
        var item = resourceList[i];
        var ossUrl = item.ossImageUrl || item.url || '';
        if (!ossUrl || !IMG_RE.test(ossUrl)) continue;  // 非图片跳过
        var page = (item.pageIndex || 0) + 1;
        if (!map[page]) map[page] = { thumbnails: [], originals: [] };
        var fullUrl = ossUrl.startsWith('http') ? ossUrl : 'http://friday-note.oss-cn-hangzhou.aliyuncs.com/' + ossUrl;
        if (item.resourceType == 2) {
            map[page].thumbnails.push(fullUrl);
        } else {
            map[page].originals.push(fullUrl);
        }
    }
    return map;
}

function renderNotePages(resourceList, fileName) {
    var pageMap = buildPageMap(resourceList);
    var pages = Object.keys(pageMap).sort(function(a, b) { return a - b; });
    _notePages = [];
    for (var p = 0; p < pages.length; p++) {
        var pageNum = pages[p];
        var pageData = pageMap[pageNum];
        var urls = pageData.thumbnails.length > 0 ? pageData.thumbnails : pageData.originals;
        _notePages.push({ pageNum: pageNum, urls: urls });
    }
    _notePageIdx = 0;
    if (fileName) document.getElementById('contentTitle').textContent = fileName;
    renderNoteCurrentPage();
}

function renderNoteCurrentPage() {
    if (_notePages.length === 0) {
        document.getElementById('noteBody').innerHTML = '<p class="text-muted">无页面内容</p>';
        document.getElementById('noteNav').style.display = 'none';
        return;
    }
    var page = _notePages[_notePageIdx];
    var html = '<h5 class="mb-3">第 ' + page.pageNum + ' 页</h5><div>';
    for (var u = 0; u < page.urls.length; u++) {
        html += '<img src="' + page.urls[u] + '" class="note-img mb-2" style="max-width:100%;cursor:pointer;" loading="lazy" onclick="window.open(\'' + page.urls[u] + '\')">';
    }
    html += '</div>';
    document.getElementById('noteBody').innerHTML = html;
    document.getElementById('notePageInfo').textContent = (_notePageIdx + 1) + ' / ' + _notePages.length;
    document.getElementById('noteNav').style.display = _notePages.length > 1 ? '' : 'none';
}

function prevNotePage() {
    if (_notePageIdx > 0) { _notePageIdx--; renderNoteCurrentPage(); }
}
function nextNotePage() {
    if (_notePageIdx < _notePages.length - 1) { _notePageIdx++; renderNoteCurrentPage(); }
}

function renderQuora(content) {
    const msgs = content.items || content.messages || content || [];
    if (!Array.isArray(msgs)) return '<p class="text-muted">无消息记录</p>';
    let html = '';
    msgs.forEach(m => {
        const isUser = m.senderType === 1 || m.role === 'user';
        const align = isUser ? 'text-end' : 'text-start';
        const bg = isUser ? 'bg-primary text-white' : 'bg-light';
        html += `<div class="${align} mb-2">
            <div class="d-inline-block ${bg} rounded-3 px-3 py-2" style="max-width:80%;">
                ${m.content || m.text || m.message || JSON.stringify(m)}
            </div>
        </div>`;
    });
    return html || '<p class="text-muted">无消息记录</p>';
}

function renderCourse(content) {
    // 使用字符串拼接，不用模板字面量，避免长HTML字符串的潜在问题
    var metaTitle = (content._meta && content._meta.title) || '';
    var courseTitle = content.title || metaTitle || '';
    var html = '';
    if (courseTitle) html += '<h5>' + courseTitle + '</h5>';
    if (content.description) html += '<p class="text-muted">' + content.description + '</p>';
    if (content.content) html += '<div id="courseContent">' + content.content + '</div>';
    if (html) {
        setTimeout(processCourseContent, 50);
        return html;
    }
    return '<pre class="json-view">' + JSON.stringify(content, null, 2) + '</pre>';
}

function processCourseContent() {
    var container = document.getElementById('courseContent');
    if (!container) return;
    // 复制 change_all() 的三件套变换
    processCourseObjects(container);
    processCourseVideos(container);
    processCourseDivs(container);
}

function processCourseObjects(container) {
    var objs = container.getElementsByTagName('object');
    while (objs.length > 0) {
        var obj = objs[0];
        var name = obj.name || '';
        var link = obj.data || '';
        var p = document.createElement('p');
        p.innerHTML = '附件：' + name + ' <a href="' + link + '" target="_blank" rel="noopener">点击下载</a>';
        obj.parentNode.insertBefore(p, obj);
        obj.remove();
    }
}

function processCourseVideos(container) {
    var vids = container.getElementsByTagName('video');
    for (var i = vids.length - 1; i >= 0; i--) {
        var vid = vids[i];
        if (!vid.hasAttribute('controls')) {
            var link = vid.src || '';
            var p = document.createElement('p');
            p.innerHTML = '视频附件：<a href="' + link + '" target="_blank" rel="noopener">点击下载</a>';
            vid.parentNode.insertBefore(p, vid);
            vid.remove();
        }
    }
}

function processCourseDivs(container) {
    var divs = container.getElementsByTagName('div');
    for (var i = divs.length - 1; i >= 0; i--) {
        var d = divs[i];
        if (d.hasAttribute('data-type')) {
            var type = d.getAttribute('data-type');
            if (type === 'ppt' || type === 'pdf') {
                var name = d.getAttribute('data-name') || '';
                var link = d.getAttribute('data-url') || '';
                var p = document.createElement('p');
                p.innerHTML = '附件：' + name + ' <a href="' + link + '" target="_blank" rel="noopener">点击下载</a>';
                d.parentNode.insertBefore(p, d);
                d.remove();
            } else if (type === 'image-block') {
                var img = d.querySelector('img');
                if (img) img.setAttribute('width', '100%');
                d.setAttribute('data-type', 'image-block-changed');
            }
        }
        if (d.hasAttribute('data-id')) {
            var title = d.getAttribute('data-title') || '';
            var p = document.createElement('p');
            p.className = 'text-muted';
            p.textContent = '无法查看习题：' + title;
            d.parentNode.insertBefore(p, d);
            d.remove();
        }
    }
    // 处理所有 img 标签：宽度100%
    var imgs = container.getElementsByTagName('img');
    for (var j = 0; j < imgs.length; j++) {
        if (!imgs[j].hasAttribute('width')) imgs[j].style.maxWidth = '100%';
    }
}

function showError(msg) {
    document.getElementById('loadingStep').style.display = 'none';
    document.getElementById('contentStep').style.display = '';
    document.getElementById('errorAlert').textContent = msg;
    document.getElementById('errorAlert').style.display = '';
}

load();
</script>
</body>
</html>
'''


@app.route('/s/<share_id>')
def view_share_page(share_id):
    """分享查看页面"""
    return render_template_string(SHARE_PAGE_HTML, share_id=share_id)


@app.route('/')
def index():
    """首页"""
    return '''
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head><meta charset="UTF-8"><title>中育工具箱 - 分享服务</title>
    <link href="https://cdn.bootcdn.net/ajax/libs/twitter-bootstrap/5.3.3/css/bootstrap.min.css" rel="stylesheet">
    <style>body{background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;}
    .container{max-width:700px;padding-top:60px}
    .card{border-radius:16px;box-shadow:0 10px 40px rgba(0,0,0,.15)}</style></head>
    <body>
    <div class="container">
        <div class="card">
            <div class="card-body p-5 text-center">
                <h2 class="mb-3">📤 中育工具箱</h2>
                <h5 class="text-primary mb-4">分享服务已启动</h5>
                <hr>
                <p class="text-muted">API 端点:</p>
                <div class="text-start bg-light rounded-3 p-3 small">
                    <code>POST /api/share/create</code> - 创建分享<br>
                    <code>GET  /s/{share_id}</code> - 查看分享<br>
                    <code>POST /api/share/{share_id}</code> - 获取分享内容<br>
                    <code>GET  /api/share/{share_id}/info</code> - 分享信息<br>
                    <code>GET  /api/shares</code> - 我的分享列表<br>
                    <code>DELETE /api/share/{share_id}</code> - 删除分享
                </div>
                <p class="mt-3 text-muted small">Port: ''' + str(PORT) + '''</p>
            </div>
        </div>
    </div></body></html>'''


# ==================== 登录辅助 ====================

def _try_login(api_base, username, password):
    """尝试自动登录获取 token（与 index.js:1353 逻辑一致）"""
    try:
        resp = requests.post(
            f'{api_base}/api/TokenAuth/Login',
            json={
                'userName': username,
                'password': password,
            },
            headers={'Content-Type': 'application/json'},
            timeout=10,
        )
        data = resp.json()
        token = data.get('result', {}).get('accessToken') or data.get('accessToken')
        return token
    except Exception:
        return None


# ==================== 启动 ====================

PORT = int(os.environ.get('PORT', 5115))

if __name__ == '__main__':
    init_db()
    print(f'\n  中育工具箱 - 分享服务器已启动')
    print(f'  地址: http://localhost:{PORT}')
    print(f'  在 index.html 中使用 #share=<id> 查看分享\n')
    app.run(host='0.0.0.0', port=PORT, debug=True)
