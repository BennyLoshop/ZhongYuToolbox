import sys
import os
import shutil
import socket
import subprocess
from pathlib import Path
from PySide6.QtWidgets import QApplication, QLabel, QWidget, QVBoxLayout
from PySide6.QtCore import Qt, QThread, Signal

# ---------------- 工具函数 ----------------
def port_in_use(port: int) -> bool:
    """检查端口是否被占用"""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) == 0


# ---------------- 后台线程 ----------------
class InstallerThread(QThread):
    status_signal = Signal(str)  # 发射状态文本

    def run(self):
        # 初始提示
        self.status_signal.emit("请稍候")

        # 检查端口是否被占用
        if port_in_use(5005):
            self.status_signal.emit("已安装，可以关闭窗口了")
            return

        # 开始安装
        self.status_signal.emit("正在安装")
        try:
            startup_path = Path(os.getenv("APPDATA")) / r"Microsoft\Windows\Start Menu\Programs\Startup"
            startup_path.mkdir(parents=True, exist_ok=True)

            target_exe = startup_path / "tbHelperService.exe"
            current_exe = Path(sys.argv[0]).resolve()

            # 确保是exe才复制，否则提示失败
            if current_exe.suffix.lower() != ".exe":
                self.status_signal.emit("安装失败: 请先用 pyinstaller 打包为 exe")
                return

            shutil.copy(current_exe, target_exe)

            # 启动 startup 里的 exe
            subprocess.Popen([str(target_exe), "server"])

            self.status_signal.emit("已安装，可以关闭窗口了")
        except Exception as e:
            self.status_signal.emit(f"安装失败: {e}")


# ---------------- GUI ----------------
def run_gui_installer():
    app_qt = QApplication(sys.argv)

    win = QWidget()
    layout = QVBoxLayout()
    label = QLabel("正在检查助手状态")
    label.setAlignment(Qt.AlignCenter)
    layout.addWidget(label)
    win.setLayout(layout)
    win.setWindowTitle("助手安装")
    win.resize(300, 120)
    win.show()

    # 启动后台线程
    thread = InstallerThread()
    thread.status_signal.connect(label.setText)
    thread.start()

    sys.exit(app_qt.exec())


# ---------------- Flask server (原有代码) ----------------
from flask import Flask, request, Response, jsonify, stream_with_context
import requests

flask_app = Flask(__name__)

@flask_app.route('/proxy/ping')
def ping():
    resp = Response("pong")
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp

@flask_app.route('/proxy/<path:url>', methods=['GET', 'OPTIONS'])
def proxy_stream(url):
    # OPTIONS 预检请求
    if request.method == 'OPTIONS':
        resp = Response()
        resp.headers['Access-Control-Allow-Origin'] = '*'
        resp.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        resp.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Range'
        return resp

    target_url = url if url.startswith(("http://", "https://")) else f"http://{url}"

    # 支持 Range 请求
    headers = {}
    range_header = request.headers.get('Range')
    if range_header:
        headers['Range'] = range_header

    try:
        r = requests.get(target_url, headers=headers, stream=True, timeout=10)
        r.raise_for_status()

        content_type = r.headers.get('Content-Type', 'application/octet-stream')
        content_length = r.headers.get('Content-Length')
        status_code = 206 if 'Range' in headers else 200

        def generate():
            for chunk in r.iter_content(chunk_size=1024*1024):  # 每次 1MB
                if chunk:
                    yield chunk

        response = Response(stream_with_context(generate()), status=status_code, mimetype=content_type)
        # Range 响应头
        if 'Content-Range' in r.headers:
            response.headers['Content-Range'] = r.headers['Content-Range']
        if content_length:
            response.headers['Content-Length'] = content_length

        response.headers['Accept-Ranges'] = 'bytes'
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Range'
        return response

    except requests.exceptions.RequestException as e:
        response = Response(f"获取资源失败: {str(e)}", status=502)
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
        response.headers['Access-Control-Allow-Headers'] = 'Authorization, Content-Type, Range'
        return response


def run_flask_server():
    flask_app.run(port=5005)


# ---------------- 主入口 ----------------
if __name__ == "__main__":
    exe_name = Path(sys.argv[0]).name.lower()
    if exe_name == "tbhelperservice.exe" or "server" in sys.argv:
        run_flask_server()
    else:
        run_gui_installer()
