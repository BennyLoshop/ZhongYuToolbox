from flask import Flask, request, Response, stream_with_context
import requests
import re

app = Flask(__name__)

@app.route('/proxy/ping')
def ping():
    resp = Response("pong")
    resp.headers['Access-Control-Allow-Origin'] = '*'
    return resp

@app.route('/proxy/<path:url>', methods=['GET', 'OPTIONS'])
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

if __name__ == '__main__':
    app.run(port=5005, threaded=True)
