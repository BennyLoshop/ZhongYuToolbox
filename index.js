(() => {
    window.API_BASE_URL = localStorage.getItem("apiBaseUrl") || "https://zyapi.loshop.com.cn";
    window.API_BASE_BASE_URL = localStorage.getItem("apiBaseOrigin") || "https://zyapi.loshop.com.cn";
    window.proxyBaseUrl = localStorage.getItem("apiBaseUrl") ? localStorage.getItem("apiBaseUrl").replace("//", "//picAgent.") : "https://zyapi.loshop.com.cn/picAgent/";
    window.SHARE_SERVER = localStorage.getItem("shareServer") || "https://zytbshareapi.loshop.com.cn";
    window.proxyUrl = (url) => {
        const base = window.proxyBaseUrl;
        return base.endsWith('/') ? base + url : base + '/' + url;
    };
    window.proxyImgSrc = (url) => {
        if (url && typeof url === 'string' && url.startsWith('http://sxz.alicdn.zykj.org/')) {
            return url.replace('http://sxz.alicdn.zykj.org/', 'https://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/');
        }
        return window.proxyBaseUrl + url;
    };
    let breadcrumbStack = [
        { id: "0", name: "根目录" }
    ];
    window.breadcrumbStack = breadcrumbStack;
    updateBreadcrumb();

    let currentExamPage = 1;
    const examPageSize = 20;
    let totalExamCount = 0;
    window.currentExamPage = currentExamPage;
    window.examPageSize = examPageSize;
    window.totalExamCount = totalExamCount;


    let searchNotesRunning = false;
    let searchCurrentPage = 1;
    let searchPageSize = 20;
    let searchResults = [];
    let searchKeyword = "";
    window.searchNotesRunning = searchNotesRunning;
    window.searchCurrentPage = searchCurrentPage;
    window.searchPageSize = searchPageSize;
    window.searchResults = searchResults;
    window.searchKeyword = searchKeyword;


    var a = [
        [4, "语文"],
        [5, "数学"],
        [6, "外语"],
        [7, "物理"],
        [8, "化学"],
        [9, "生物"],
        [10, "政治"],
        [11, "历史"],
        [12, "地理"],
        [13, "全科专用（级部发布）"],
        [14, "信息技术"],
        [15, "通用技术"],
        [24, "体育与健康"],
        [34, "技术"],
        [35, "艺术"],
        [41, "研创大任务"],
        [42, "级部管理"],
        [53, "家务劳动"],
        [66, "调查问卷"]
    ];
    for (var i in a)
        $(ques_subject).append(`<option value="${a[i][0]}">${a[i][1]}</option>`)

    let aeskey = () => {
        var e = ":F0wKU!Qg3}UkbW+w[:9|D3-5h=:T;7t#_GZ4#G;~ZNSq{8;}QIP>'{q.lje",
            t = new Date,
            n = t.getFullYear(),
            r = t.getMonth() + 1,
            o = t.getDate(),
            i = 33 + o * r * 33,
            a = String.fromCharCode(i % 94 + 33),
            s = e[o + r],
            c = n * r * o % e.length,
            u = e.substring(0, c),
            l = e.substring(c),
            f = (l + u).substring(0, 14);
        return "".concat(a).concat(f).concat(s)
    }

    window.key = CryptoJS.enc.Utf8.parse(aeskey()),
        window.aesDecrypt = (encryptedBase64Str) => {
            if (!encryptedBase64Str)
                return "";
            try {
                let decryptedData = CryptoJS.AES.decrypt(encryptedBase64Str, key, {
                    mode: CryptoJS.mode.ECB,
                    padding: CryptoJS.pad.Pkcs7
                });
                return decryptedData.toString(CryptoJS.enc.Utf8);
            } catch (e) {
                console.log(e);
            }
        },
        window.aesEncrypt = (data) => {
            let encryptedData = CryptoJS.AES.encrypt(data, key, {
                mode: CryptoJS.mode.ECB,
                padding: CryptoJS.pad.Pkcs7
            });
            return encryptedData.toString();
        };

    if (localStorage.getItem("token")) {
        const ezyToken = localStorage.getItem("token");
        let expired = true;

        try {
            const parts = ezyToken.split(".");
            if (parts.length >= 2) {
                const payloadJson = atob(parts[1]);
                const payload = JSON.parse(payloadJson);
                if (payload.exp && payload.exp > Date.now() / 1000) {
                    expired = false;
                }
            }
        } catch {
            // 静默处理，不打印错误、不弹窗
            expired = true;
        }

        if (expired) {
            $("#welc").html("身份过期，建议重新登录");
            $("#loginc").show();
            $("#logoutc").hide();
        } else {
            startTokenRefresh();
            $("#welc2").html(
                `你好！<img src="${localStorage.getItem("photo")}" style="height:calc(1.425rem + 2.5vw);margin-right:2%;margin-bottom:0.5vh;">${localStorage.getItem("realName")}`
            );
            $("#logoutc").show();
            $("#loginc").hide();
            $(login_btn).html("重新登录");
        }
    } else {
        $("#loginc").show();
        $("#logoutc").hide();
    }

    // ==================== 分享功能：通过 #share=xxx 参数查看分享内容 ====================
    (function checkShareHash() {
        const m = location.hash.match(/^#share=([a-f0-9]+)/);
        if (!m) return;
        const shareId = m[1];
        // 确保 DOM 就绪后加载
        function doLoad() {
            loadSharedContent(shareId);
        }
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', doLoad);
        } else {
            doLoad();
        }
    })();

    // 监听页面滚动，控制按钮显示
    window.addEventListener('DOMContentLoaded', () => {
        window.addEventListener('scroll', () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;

            // 懒加载触发逻辑保持不变
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            if (scrollTop + windowHeight >= documentHeight - 50) {
                loadMoreQuestions();
            }

            // 控制返回顶部按钮显示
            if (scrollTop > 300) {
                document.getElementById('back_to_top').style.display = 'block';
                document.getElementById('back_to_top').style.opacity = '1';
            } else {
                document.getElementById('back_to_top').style.opacity = '0';
                setTimeout(() => {
                    if (window.scrollY < 300) document.getElementById('back_to_top').style.display = 'none';
                }, 300);
            }
        });

        // 点击回到顶部
        document.getElementById('back_to_top').addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });

        document.querySelectorAll('#sidebarMenu .nav-link').forEach(link => {
            link.addEventListener('click', () => {
                const offcanvasEl = document.getElementById('sidebarMenu');
                const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
                if (bsOffcanvas) {
                    bsOffcanvas.hide();
                }
            });
        });
    });

    let lastProxyStatus = null;
    window.lastProxyStatus = lastProxyStatus;

    // 首次检测
    detectLocalProxy();
    // 每10秒检测一次
    setInterval(detectLocalProxy, 10000);


    //     showGg(`<p><b>公告</b></p>
    // <p>网站新域名上线：zytb.loshop.com.cn</p>
    // <p>QQ群：1067807011</p>
    // `);

}
)();
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        // 一、点击 tab 时，记录 hash（方便刷新时恢复）
        document.querySelectorAll('#sidebarMenu a.nav-link[data-bs-toggle="tab"]').forEach(link => {
            link.addEventListener('shown.bs.tab', e => {
                const target = e.target.getAttribute('href');
                if (target && target.startsWith('#')) {
                    history.replaceState(null, '', target); // 更新地址栏 hash
                }
            });
        });

        // 二、页面加载时，根据 hash 激活对应 tab
        const currentHash = window.location.hash;
        if (currentHash) {
            const tabLink = document.querySelector(`#sidebarMenu a.nav-link[href="${currentHash}"]`);
            if (tabLink) {
                // 激活 tab（Bootstrap 5）
                const tabTrigger = new bootstrap.Tab(tabLink);
                tabTrigger.show();

                // 触发绑定的 onclick 逻辑（如 loadPictures()）
                if (typeof tabLink.onclick === 'function') {
                    tabLink.onclick();
                }
            }
        } else {
            // 没有 hash 时默认显示第一个（登录）
            const defaultTab = document.querySelector('#sidebarMenu a.nav-link[href="#Login"]');
            if (defaultTab) {
                const tabTrigger = new bootstrap.Tab(defaultTab);
                tabTrigger.show();
            }
        }

        // 三、监听 hashchange（用户手动改地址或浏览器前进/后退时也能切换）
        window.addEventListener('hashchange', () => {
            const newHash = window.location.hash;
            const tabLink = document.querySelector(`#sidebarMenu a.nav-link[href="${newHash}"]`);
            if (tabLink) {
                const tabTrigger = new bootstrap.Tab(tabLink);
                tabTrigger.show();
                if (typeof tabLink.onclick === 'function') {
                    tabLink.onclick();
                }
            }
        });
    });
})();
(function () {
    const iframeId = 'ck_iframe';
    const targetClass = 'header-box';
    const targetId = 'actScrollList';
    const intervalMs = 100; // 每1s执行一次检查（作为保险）
    let intervalHandle = null;
    let observerInstalled = false;

    function applyOnce(doc) {
        let changed = false;
        // 1) 删除 header-box（如果存在）
        const header = doc.querySelector('.' + targetClass);
        if (header) {
            header.remove();
            console.log(`[${new Date().toLocaleTimeString()}] 已移除 .${targetClass}`);
            changed = true;
        }

        // 2) 注入 CSS（带 !important，覆盖其它规则）
        //    若已存在同 id 的 style，则覆盖其内容
        const styleId = 'injected-actScrollList-style';
        let styleEl = doc.getElementById(styleId);
        const cssText = `#${targetId} { height: 70vh !important; max-height: 70vh !important; min-height: 70vh !important; overflow: auto !important; }`;
        if (!styleEl) {
            styleEl = doc.createElement('style');
            styleEl.id = styleId;
            styleEl.type = 'text/css';
            styleEl.appendChild(doc.createTextNode(cssText));
            // 插入到 head 或 documentElement
            const head = doc.head || doc.getElementsByTagName('head')[0] || doc.documentElement;
            head.appendChild(styleEl);
            console.log(`[${new Date().toLocaleTimeString()}] 已注入样式，强制 #${targetId} = 70vh`);
            changed = true;
        } else if (styleEl.textContent !== cssText) {
            styleEl.textContent = cssText;
            console.log(`[${new Date().toLocaleTimeString()}] 已更新注入样式`);
            changed = true;
        }

        // 3) 直接设置元素内联高度（作为额外保险）
        const act = doc.getElementById(targetId);
        if (act) {
            // 设置内联样式并通过 setProperty 带 !important
            const before = act.style.getPropertyValue('height');
            act.style.setProperty('height', '71vh', 'important');
            act.style.setProperty('max-height', '71vh', 'important');
            act.style.setProperty('min-height', '71vh', 'important');
            if (before !== '70vh') {
                console.log(`[${new Date().toLocaleTimeString()}] 已设置 #${targetId} style.height = 70vh (inline important)`);
                changed = true;
            }
        } else {
            // 若尚未找到元素，仅记录
            // console.log(`#${targetId} 尚未找到`);
        }

        return changed;
    }

    function installObserver(doc) {
        if (observerInstalled) return;
        try {
            // 观察 body 下的子树变化：新增/移除节点或属性变化
            const root = doc.body || doc.documentElement;
            if (!root) return;
            const mo = new MutationObserver((mutations) => {
                let need = false;
                for (const m of mutations) {
                    // 如果有新节点被添加，或 class/id/属性变化，就尝试执行一次 applyOnce
                    if (m.addedNodes && m.addedNodes.length) {
                        need = true; break;
                    }
                    if (m.type === 'attributes') {
                        need = true; break;
                    }
                }
                if (need) {
                    try {
                        applyOnce(doc);
                    } catch (e) {
                        console.warn('observer 执行 applyOnce 时出错:', e);
                    }
                }
            });
            mo.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'id', 'style'] });
            // 将 observer 引用挂到 document 上，以便未来可以断开（如果需要）
            doc._injectedMutationObserver = mo;
            observerInstalled = true;
            console.log('已在 iframe 内部安装 MutationObserver，用于动态内容监控。');
        } catch (e) {
            console.warn('安装 MutationObserver 失败:', e);
        }
    }

    function start() {
        const iframe = document.getElementById(iframeId);
        if (!iframe) {
            console.warn(`找不到 iframe#${iframeId}，将继续每 ${intervalMs}ms 重试...`);
        }

        let attempts = 0;
        const maxAttempts = 0; // 0 = 不限制；如需限制可设大于0的次数

        intervalHandle = setInterval(() => {
            attempts++;
            try {
                const node = document.getElementById(iframeId);
                if (!node) {
                    if (attempts % 10 === 0) console.log(`等待 iframe#${iframeId} 出现... (尝试 ${attempts})`);
                    if (maxAttempts && attempts >= maxAttempts) {
                        console.warn('达到最大尝试次数，停止定时器。');
                        clearInterval(intervalHandle);
                    }
                    return;
                }

                const win = node.contentWindow;
                const doc = node.contentDocument || (win && win.document);
                if (!doc) {
                    if (attempts % 10 === 0) console.log('iframe 文档尚不可访问或尚未加载，继续等待...');
                    return;
                }

                // 确认 iframe 已加载（readyState）
                const ready = doc.readyState;
                if (ready !== 'complete' && ready !== 'interactive') {
                    // 还在加载，继续下一轮
                    // console.log('iframe 正在加载，等待 complete...');
                    return;
                }

                // 执行一次修改
                applyOnce(doc);
                // 安装 observer（只安装一次）
                installObserver(doc);

                // 还可以额外监听 iframe 的 load 事件，确保当 iframe 重新加载时重新应用
                if (!node._listenerAttached) {
                    node.addEventListener('load', () => {
                        try {
                            const d = node.contentDocument;
                            applyOnce(d);
                            // 重新安装 observer（先断开旧的）
                            if (d && d._injectedMutationObserver) {
                                try { d._injectedMutationObserver.disconnect(); } catch (e) { }
                            }
                            observerInstalled = false;
                            installObserver(d);
                        } catch (e) {
                            console.warn('iframe load 事件处理失败:', e);
                        }
                    });
                    node._listenerAttached = true;
                }

                // 如果你想在成功第一次后停止轮询，可以取消下面注释：
                // clearInterval(intervalHandle);

            } catch (err) {
                console.error('尝试访问/修改 iframe 时发生错误:', err);
            }

            if (maxAttempts && attempts >= maxAttempts) {
                console.warn('达到最大尝试次数，停止定时器。');
                clearInterval(intervalHandle);
            }
        }, intervalMs);
    }

    // 提供停止函数
    window.stopIframeAdjust = function () {
        try {
            if (intervalHandle) clearInterval(intervalHandle);
            const node = document.getElementById(iframeId);
            const doc = node && (node.contentDocument || node.contentWindow && node.contentWindow.document);
            if (doc && doc._injectedMutationObserver) {
                try { doc._injectedMutationObserver.disconnect(); } catch (e) { }
            }
            observerInstalled = false;
            console.log('已停止 iframe 调整和 observer。');
        } catch (e) {
            console.warn('停止时发生异常:', e);
        }
    };

    // 启动
    start();
    console.log(`已启动针对 iframe#${iframeId} 的每 ${intervalMs}ms 调整器（同源）。`);
})();



async function detectLocalProxy() {
    let proxyBaseUrl = "https://zyapi.loshop.com.cn/picAgent/";
    let localOk = false;
    try {
        let resp = await fetch("http://127.0.0.1:5005/proxy/ping", { method: "GET", mode: "cors" });
        if (resp.ok) {
            proxyBaseUrl = "http://127.0.0.1:5005/proxy/";
            localOk = true;
        }
    } catch (e) {
        // 本地服务不可用
    }
    window.proxyBaseUrl = proxyBaseUrl;

    let userAgent = navigator.userAgent;
    let isWindows = userAgent.indexOf("Windows") !== -1;
    let isAndroid = userAgent.indexOf("Android") !== -1;

    if (lastProxyStatus !== localOk) {
        lastProxyStatus = localOk;

        const createToast = (id, title, message, btnHtml) => {
            if (document.getElementById(id)) return;
            let toastHtml = `
            <div id="${id}" style="
                position:fixed;
                bottom:32px;
                right:32px;
                z-index:9999;
                width:auto;
                max-width:400px;
                background:#333;
                color:#fff;
                padding:16px 24px;
                border-radius:8px;
                box-shadow:0 4px 12px rgba(0,0,0,0.5);
                opacity:0.95;
                font-size:clamp(14px, 3vw, 18px);
                line-height:1.4;
                box-sizing:border-box;
                word-wrap:break-word;
            ">
                <div style="font-weight:bold;margin-bottom:8px;font-size:clamp(16px, 3.5vw, 20px);">${title}</div>
                <div style="margin-bottom:12px;">${message}</div>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    ${btnHtml}
                    <button style="
                        padding:6px 12px;
                        font-size:clamp(12px, 3vw, 16px);
                        border:none;
                        border-radius:4px;
                        background:#555;
                        color:#fff;
                        cursor:pointer;
                    " onclick="document.getElementById('${id}').remove()">关闭</button>
                </div>
            </div>`;
            let div = document.createElement('div');
            div.innerHTML = toastHtml;
            document.body.appendChild(div);
        };

        if (!localOk) {
            if (isWindows) {
                createToast(
                    'proxyToast',
                    '加速插件未检测到',
                    '检测到您使用的是 Windows 系统，建议下载并运行加速插件以提升资源加载速度。不使用加速插件不会影响使用。',
                    '<a href="https://wumama.lanzouw.com/iG92334tbeeb" style="color:#fff;text-decoration:none;background:#007bff;padding:6px 12px;border-radius:4px;font-size:clamp(12px, 3vw, 16px);">下载 tbHelperInstaller.exe</a>'
                );
            } else if (isAndroid) {
                // createToast(
                //     'proxyToast',
                //     '加速服务未检测到',
                //     '检测到您使用的是安卓设备，建议下载并安装加速插件以提升资源加载速度。不使用加速插件不会影响使用。',
                //     '<a href="/tbHelper.apk" style="color:#fff;text-decoration:none;background:#007bff;padding:6px 12px;border-radius:4px;font-size:clamp(12px, 3vw, 16px);" download>下载 tbHelper.apk</a>'
                // );
            }
        } else {
            createToast(
                'proxyToast',
                '本地加速服务已启用',
                '',
                ''
            );
            setTimeout(() => {
                let toast = document.getElementById('proxyToast');
                if (toast) toast.remove();
            }, 3000);
        }
    }
}



/*ques_subject.onchange = function() {
    if (this.value == "-1") return;
    $.ajax({
        type: "GET",
        headers: {
            "token": localStorage.getItem("ezyToken"),
            "id": this.value
        },
        url: location.origin + `/getCatalogs`,
        dataType: "json",
        success: function(data) {
            ques_topic.innerHTML = `<option value="-1">请选择</option>`;
            for (i in data) {
                $(ques_topic).append(`<option value="${data[i].id}">${data[i].name}</option>`)
            }
        }
    })
};*/

async function loadPictures() {
    const token = localStorage.getItem("token");
    if (!token) {
        console.error("Token not found in localStorage");
        return;
    }

    const maxCount = 5;
    let state = {
        normal: { skip: 0, total: 0 },
        recycle: { skip: 0, total: 0 }
    };

    async function fetchPictures(isRecycleBin, skip) {
        const url = `${window.API_BASE_URL}/api/services/app/PictureLibrary/GetAllPicturesFromLibrary?SkipCount=${skip}&MaxResultCount=${maxCount}&IsRecycleBin=${isRecycleBin}`;
        const res = await fetch(url, {
            headers: { "Authorization": "Bearer " + token }
        });
        const data = await res.json();
        return data.result;
    }


    function renderPagination(containerId, currentSkip, total, onPageChange) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const currentPage = Math.floor(currentSkip / maxCount) + 1;
        const totalPages = Math.ceil(total / maxCount) || 1;

        let html = `<div class="btn-group" role="group" aria-label="分页">`;

        for (let i = 1; i <= totalPages; i++) {
            html += `
      <button type="button" 
        class="btn btn-sm ${i === currentPage ? 'btn-primary' : 'btn-secondary'}"
        data-page="${i}">
        ${i}
      </button>`;
        }

        html += `</div>`;
        container.innerHTML = html;

        container.querySelectorAll("button[data-page]").forEach(btn => {
            btn.addEventListener("click", e => {
                const page = parseInt(e.target.getAttribute("data-page"), 10);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                    onPageChange((page - 1) * maxCount);
                }
            });
        });
    }
    function renderSkeleton(containerId, rows = maxCount) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = `
      <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle text-center">
        <thead class="table-light">
          <tr>
            <th style="width:120px">图片</th>
            <th>名称</th>
            <th>大小</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
    `;

        for (let i = 0; i < rows; i++) {
            html += `
          <tr>
            <td>
              <div class="skeleton-box" style="width:100px; height:100px;"></div>
            </td>
            <td><div class="skeleton-line" style="width:80px"></div></td>
            <td><div class="skeleton-line" style="width:60px"></div></td>
            <td><div class="skeleton-line" style="width:120px"></div></td>
            <td><div class="skeleton-line" style="width:50px"></div></td>
          </tr>
        `;
        }

        html += "</tbody></table></div>";
        container.innerHTML = html;
    }

    function renderTable(items, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        let html = `
      <div class="table-responsive">
      <table class="table table-bordered table-hover align-middle text-center">
        <thead class="table-light">
          <tr>
            <th style="width:120px">图片</th>
            <th>名称</th>
            <th>大小</th>
            <th>时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
    `;

        items.forEach(item => {
            const imgUrl = proxyImgSrc(item.picture);
            const aUrl = "https://zyapi.loshop.com.cn/picAgent/" + encodeURIComponent(item.picture);

            html += `
        <tr>
          <td>
            <div style="width:100px; height:100px; overflow:hidden; display:flex; align-items:center; justify-content:center; background:#f8f9fa;">
              <img src="${imgUrl}" alt="${item.name}" style="object-fit:cover; width:100%; height:100%;">
            </div>
          </td>
          <td>${item.name}</td>
          <td>${item.size}</td>
          <td>${item.createTime}</td>
          <td><a href="${aUrl}" target="_blank" class="btn btn-sm btn-primary">查看</a></td>
        </tr>
      `;
        });

        html += "</tbody></table></div>";
        container.innerHTML = html;
    }


    // skeleton 的 CSS
    const style = document.createElement("style");
    style.innerHTML = `
  .skeleton-box {
    background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 37%, #e0e0e0 63%);
    background-size: 400% 100%;
    animation: skeleton-loading 1.4s ease infinite;
    border-radius: 4px;
  }
  .skeleton-line {
    height: 16px;
    margin: 6px auto;
    background: linear-gradient(90deg, #e0e0e0 25%, #f0f0f0 37%, #e0e0e0 63%);
    background-size: 400% 100%;
    animation: skeleton-loading 1.4s ease infinite;
    border-radius: 4px;
  }
  @keyframes skeleton-loading {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;
    document.head.appendChild(style);


    async function loadSection(isRecycleBin, tableId, paginationId, key) {
        renderSkeleton(tableId, maxCount);  // 先显示骨架屏

        try {
            const result = await fetchPictures(isRecycleBin, state[key].skip);
            state[key].total = result.totalCount;

            renderTable(result.items, tableId);
            renderPagination(paginationId, state[key].skip, state[key].total, newSkip => {
                state[key].skip = newSkip;
                loadSection(isRecycleBin, tableId, paginationId, key);
            });
        } catch (e) {
            document.getElementById(tableId).innerHTML =
                `<div class="text-danger p-3 text-center">加载失败，请重试</div>`;
            console.error(e);
        }
    }



    // 初始加载
    loadSection(false, "pictureTable", "picturePagination", "normal");
    loadSection(true, "recycleTable", "recyclePagination", "recycle");
}


// ==================== 图库上传图片 ====================
async function uploadPictureBtn() {
    // 用隐藏的 file input 选择文件
    let input = document.getElementById('pictureFileInput');
    if (!input) {
        input = document.createElement('input');
        input.type = 'file';
        input.id = 'pictureFileInput';
        input.accept = 'image/*';
        input.style.display = 'none';
        document.body.appendChild(input);
        input.addEventListener('change', function () {
            if (input.files[0]) doUploadPicture(input.files[0]);
        });
    }
    input.click();
}

async function doUploadPicture(file) {
    const token = localStorage.getItem("token");
    if (!token) return swal("请先登录", "", "warning");

    let userId = window.currentUserId;
    if (!userId) {
        try { userId = await getUserId(); window.currentUserId = userId; } catch (e) { return swal("无法获取用户ID", "", "warning"); }
    }

    const btn = document.getElementById('btnUploadPicture');
    btn.disabled = true;
    btn.textContent = '上传中...';

    try {
        // 用已验证的 note_v2 fc 上传（imagestore_v2 的 fc 映射未知）
        const url = await uploadFile(file, userId, 'note_v2', '', file.name);

        const sizeStr = formatFileSize(file.size);
        // 从 URL 提取 nonce：路径最后一段的前半部分 (nonce/文件名 中的 nonce)
        const parts = url.split('/');
        const nonce = parts[parts.length - 2] || generateNonce();

        // 记录到图库（与抓包对齐：PictureLibrary/AddPictureAsync）
        const recordResp = await fetch(`${window.API_BASE_URL}/api/services/app/PictureLibrary/AddPictureAsync`, {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "AppName": "com.zykj.manage",
                "AppVersion": "32"
            },
            body: JSON.stringify({
                picture: url,
                name: nonce,
                size: sizeStr
            })
        });

        const recordData = await recordResp.json();
        if (!recordData.success) throw new Error(recordData.error?.message || "记录失败");

        swal("上传成功", "", "success");
        setTimeout(() => loadPictures(), 500);
    } catch (e) {
        console.error(e);
        swal("上传失败", e.message, "error");
    } finally {
        btn.disabled = false;
        btn.textContent = '上传图片';
        const input = document.getElementById('pictureFileInput');
        if (input) input.value = '';
    }
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + 'KB';
    return (bytes / 1024 / 1024).toFixed(2) + 'MB';
}



function showGg(str) {
    const key = 'noticeDismissedAt';
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const lastTime = localStorage.getItem(key);

    if (lastTime && Date.now() - Number(lastTime) < oneWeek) return;
    if (document.getElementById('ggModal')) return;

    const modalHTML = `
    <div class="modal fade show" id="ggModal" tabindex="-1" style="display: block; background-color: rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
      <div class="modal-dialog modal-fullscreen">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">📢 公告</h5>
          </div>
          <div class="modal-body">
            <div>${str}</div>
            <div class="form-check mt-3">
              <input class="form-check-input" type="checkbox" id="dont-remind">
              <label class="form-check-label" for="dont-remind">
                一周内不再提醒
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button id="gg-ok-btn" class="btn btn-primary">我知道了</button>
          </div>
        </div>
      </div>
    </div>
  `;

    const div = document.createElement('div');
    div.innerHTML = modalHTML;
    document.body.appendChild(div);

    document.getElementById('gg-ok-btn').onclick = () => {
        if (document.getElementById('dont-remind').checked) {
            localStorage.setItem(key, Date.now().toString());
        }
        const modal = document.getElementById('ggModal');
        if (modal) modal.remove();
    };
}
let quesSkip = 0;
const quesTake = 12;
let quesLoading = false;
let quesAllLoaded = false;
let quesParams = {};  // 保存当前的查询条件
function quesTopicSelect(el) {
    $('#ques_topic .ques-topic-tab').removeClass('btn-primary active').addClass('btn-outline-secondary');
    $(el).removeClass('btn-outline-secondary').addClass('btn-primary active');
    ques_query();
}
function quesWatchToggle(el, val) {
    if (val === 0) {
        if (el.checked) {
            for (let i = 1; i <= 4; i++) document.getElementById('ques_watch_' + i).checked = false;
        } else {
            // 不限不允许取消，至少选一个
            el.checked = true;
            return;
        }
    } else {
        if (el.checked) {
            document.getElementById('ques_watch_0').checked = false;
        }
    }
    ques_query();
}
async function ques_query() {
    quesSkip = 0;
    quesAllLoaded = false;
    $(ques_list).html("");

    let topicRaw = $('#ques_topic .active').data('topic');
    const topic = (topicRaw !== undefined && topicRaw !== null) ? topicRaw : '';
    const subject = $(ques_subject).val();
    const keyword = document.getElementById("ques_search").value.trim();
    const updateStart = document.getElementById("ques_update_start").value;
    const updateEnd = document.getElementById("ques_update_end").value;
    const joinStart = document.getElementById("ques_join_start").value;
    const joinEnd = document.getElementById("ques_join_end").value;

    quesParams = {
        "keyword": keyword,
        "orderBy": 0,
        "skip": quesSkip,
        "take": quesTake,
        "updateTime": {
            "start": updateStart ? updateStart + "T00:00:00" : "",
            "end": updateEnd ? updateEnd + "T23:59:59" : ""
        },
        "joinTime": {
            "start": joinStart ? joinStart + "T00:00:00" : "",
            "end": joinEnd ? joinEnd + "T23:59:59" : ""
        },
        "justWatch": document.getElementById('ques_watch_0').checked ? [0] : [1,2,3,4].filter(v => document.getElementById('ques_watch_'+v).checked)
    };
    quesParams.catalogId = parseInt(topic, 10);
    quesParams.topicId = parseInt(subject, 10);

    await loadMoreQuestions();
}

// 加载一页数据
async function loadMoreQuestions() {
    if (quesLoading || quesAllLoaded) return;
    quesLoading = true;

    quesParams.skip = quesSkip;
    quesParams.take = quesTake;

    let resp = await fetch(`${window.API_BASE_URL}/api/services/app/Quora/GetSessions`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify(quesParams)
    });
    let json = await resp.json();
    let data = json.result || [];

    if (data.length === 0) {
        quesAllLoaded = true;
        quesLoading = false;
        return;
    }

    data.forEach((item) => {
        const col = $(`
        <div class="col-12 col-md-6 col-lg-4">
            <div class="ques-card card h-100" 
                style="cursor:pointer; background:rgba(255,255,255,0.9); box-shadow:0 2px 6px rgba(0,0,0,0.1);">
                ${item.unRead ? '<div class="ques-unread-ribbon">未读</div>' : ''}
                <div class="card-body d-flex align-items-center mb-2">
                    <img src="${item.askUserPhoto || 'https://s4.anilist.co/file/anilistcdn/user/avatar/large/default.png'}" 
                        class="avatar me-2" 
                        style="width:40px;height:40px;border-radius:50%;object-fit:cover;">
                    <div class="overflow-hidden" style="white-space:nowrap;text-overflow:ellipsis;">
                        <div class="fw-bold">${item.askUserName}</div>
                        <div class="text-secondary small">${item.summary}</div>
                    </div>
                </div>
                <div class="card-img-container" style="max-height:250px; overflow:hidden;">
                    <img src="${proxyImgSrc(item.snapshot)}" class="card-img-bottom w-100" style="object-fit:cover;">
                </div>
            </div>
        </div>
    `);

        col.find('.ques-card').data("id", item.id);
        col.find('.ques-card').click(() => {
            col.find('.ques-unread-ribbon').remove();
            fetch(`${window.API_BASE_URL}/api/services/app/Quora/ResetReadState?sessionId=${item.id}`, {
                method: "GET",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            });
            previewQuestion(item.id);
        });

        $(ques_list).append(col);
    });



    quesSkip += data.length;
    if (data.length < quesTake) {
        quesAllLoaded = true;
    }
    quesLoading = false;
}

// 预览详情
async function previewQuestion(sessionId) {
    ques_focus = sessionId;
    let resp = await fetch(`${window.API_BASE_URL}/api/services/app/Quora/GetMessages`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
            "SessionId": sessionId,
            "Skip": 0,
            "Take": 1000
        })
    });
    let json = await resp.json();
    let data = json.result || [];
    if (!data.length) return;

    // 左侧消息列表
    let listHtml = data.map((d, i) => {
        let badgeClass = d.isPrimary ? 'bg-success' : 'bg-secondary';
        let badgeText = d.isPrimary ? '公开' : '不公开';
        return `
        <button class="list-group-item list-group-item-action d-flex justify-content-between align-items-center ${i === 0 ? 'active' : ''}"
             data-index="${i}"
             data-snapshot="${d.snapShot}"
             data-content="${d.content}"
             data-username="${d.userName}"
             data-sendtime="${d.sendTime}"
             onclick="quesSelectMsg(this)">
            <span class="ques-msg-name">${d.userName}</span>
            <span class="badge rounded-pill ${badgeClass}">${badgeText}</span>
        </button>`;
    }).join('');

    // 右侧详情（默认首条）
    let first = data[0];
    let rightHtml = data.length ? `
        <div id="ques_detail_user" class="fw-bold mb-1">${first.userName}</div>
        <div id="ques_detail_time" class="text-muted small mb-3">${first.sendTime}</div>
        <img id="ques_detail_img" src="${proxyImgSrc(first.snapShot)}"
             data-raw-snapshot="${first.snapShot}"
             data-content="${first.content}"
             class="img-fluid rounded"
             style="max-height:55vh; object-fit:contain;">
    ` : '';

    $(ques_preview_body).html(`
        <div class="row g-0 position-relative ques-preview-row" style="margin:-16px;">
            <button id="quesToggleBtn" class="btn btn-sm btn-outline-secondary d-md-none position-absolute top-0 start-0 m-2" style="z-index:1;" type="button" data-bs-toggle="collapse" data-bs-target="#quesSidebar">
                ☰ 问题列表
            </button>
            <div id="quesSidebar" class="col-md-4 col-lg-3 bg-body-tertiary border-end collapse d-md-flex flex-column">
                <div class="px-3 py-2 fw-bold fs-5 border-bottom d-flex justify-content-between align-items-center">
                    问题列表
                    <button class="btn-close d-md-none" type="button" data-bs-toggle="collapse" data-bs-target="#quesSidebar" aria-label="Close"></button>
                </div>
                <div class="list-group list-group-flush ques-sidebar-scroll">
                    ${listHtml}
                </div>
            </div>
            <div class="col-md-8 col-lg-9 d-flex flex-column align-items-center justify-content-center p-4">
                <div class="w-100 text-end mb-1">
                    <span style="cursor:pointer;font-size:1.2rem;opacity:0.5;" title="分享" onclick="openShareModal('quora','${sessionId}','随身答对话')">📤</span>
                </div>
                ${rightHtml}
            </div>
        </div>`);

    ques_preview.click();

    // 窄屏：sidebar 展开/收起时切换按钮可见性
    $('#quesSidebar').off('show.bs.collapse hidden.bs.collapse').on('show.bs.collapse', function () {
        $('#quesToggleBtn').hide();
    }).on('hidden.bs.collapse', function () {
        $('#quesToggleBtn').show();
    });
}

// 选中消息切换右侧详情
function quesSelectMsg(el) {
    $('.list-group-item').removeClass('active');
    $(el).addClass('active');
    $('#ques_detail_user').text(el.dataset.username);
    $('#ques_detail_time').text(el.dataset.sendtime);
    $('#ques_detail_img').attr('src', proxyImgSrc(el.dataset.snapshot));
    $('#ques_detail_img').attr('data-raw-snapshot', el.dataset.snapshot);
    $('#ques_detail_img').attr('data-content', el.dataset.content);
}

// 🔸 核心：监听整页滚动
window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const windowHeight = window.innerHeight;
    const documentHeight = document.documentElement.scrollHeight;

    if (scrollTop + windowHeight >= documentHeight - 50) {
        loadMoreQuestions();
    }
});

ques_download.onclick = function () {
    download($('#ques_detail_img').attr('data-content'), 'test.zip');
};

async function mistake_query() {
    var subject = $(mistake_subject).val();
    let data = await fetch(`${window.API_BASE_URL}/api/services/app/MistakeBook/SearchMistakeQstItemsAsync`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
            "attainedLevel": [],
            "bookId": subject,
            "diff": [],
            "errorReason": [],
            "haveNoTag": false,
            "maxResultCount": 1000,
            "skipCount": 0,
            "tagIdList": []
        })
    })
        .then(response => response.json());
    data = data.result;
    console.log(data);
    data = data.items;

    $(mistake_list).html("");
    for (i in data) {
        var tb = $(`<tr class="table" background-color: rgba(255,255,255,0.8) !important;>
                    <th scope="row">${Number(i) + 1}</th>
                    <td>${data[i].source}</td>
                    <td><img src=${data[i].stemShoot} width=100%></img></td>
                    <td>${data[i].creationTime}</td>
                </tr>`)
        tb.data("id", data[i].id);
        tb.click(async function () {
            try {
                // 显示 loading
                $("#screenshotImg").attr("src", "");
                $("#mistakeQstCard").hide(); $("#mistakeQstBody").html("");
                $("#mistakeAnsCard").hide(); $("#mistakeAnsBody").html("");
                $("#mistakeExpCard").hide(); $("#mistakeExpBody").html("");
                $("#mistakeNoteCard").hide();
                $("#mistakePicCard").hide(); $("#mistakePicBody").html("");
                const modalBody = document.querySelector("#screenshotModal .modal-body");
                const origHtml = modalBody.innerHTML;
                modalBody.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"></div><div class="mt-2 text-muted">加载中...</div></div>';
                $("#screenshotModal").modal("show");

                // 获取题目详情
                let res = await fetch(`${window.API_BASE_URL}/api/services/app/MistakeBook/GetMistakeQstItemDetailInfoAsync?itemId=` + $(this).data("id"), {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                });
                let detail = await res.json();
                detail = detail.result;
                if (!detail) { modalBody.innerHTML = origHtml; swal("无数据"); return; }

                modalBody.innerHTML = origHtml;

                // 1. 题目 & 答案 & 解析
                if (detail.qstPath) {
                    try {
                        const qstHtml = await (await fetch(`${window.API_BASE_URL}${detail.qstPath}?showAnalysis=true`)).text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(qstHtml, "text/html");
                        // 题干
                        const stem = doc.querySelector('.stem')?.innerHTML || '';
                        if (stem) {
                            $("#mistakeQstBody").html(stem);
                            $("#mistakeQstCard").show();
                        }
                        // 答案
                        const answerEl = doc.querySelector('.answers');
                        if (answerEl) {
                            answerEl.querySelectorAll('h3').forEach(h => h.remove());
                            const answerHTML = answerEl.innerHTML.trim();
                            if (answerHTML) {
                                $("#mistakeAnsBody").html(answerHTML);
                                $("#mistakeAnsCard").show();
                            }
                        }
                        // 解析 & 知识点
                        const analysisEls = doc.querySelectorAll('.analysis');
                        if (analysisEls.length > 0) {
                            let expParts = [];
                            analysisEls.forEach(el => {
                                const clone = el.cloneNode(true);
                                clone.querySelectorAll('h3').forEach(h => h.remove());
                                const html = clone.innerHTML.trim();
                                if (html) expParts.push(html);
                            });
                            if (expParts.length > 0) {
                                $("#mistakeExpBody").html(expParts.join('<hr>'));
                                $("#mistakeExpCard").show();
                            }
                        }
                    } catch (e) { console.warn("获取题目失败:", e); }
                }

                // 2. 笔记（fileList.json → screenshot.png）
                if (detail.note) {
                    try {
                        const fileListUrl = proxyUrl(detail.note);
                        const flResp = await fetch(fileListUrl);
                        if (flResp.ok) {
                            const fileList = await flResp.json();
                            const pngEntry = fileList.find(f => f.url && f.url.toLowerCase().endsWith("screenshot.png"));
                            if (pngEntry) {
                                const pngUrl = proxyUrl(pngEntry.url);
                                const pngResp = await fetch(pngUrl);
                                if (pngResp.ok) {
                                    const pngBlob = await pngResp.blob();
                                    $("#screenshotImg").attr("src", URL.createObjectURL(pngBlob));
                                    $("#mistakeNoteCard").show();
                                }
                            }
                        }
                    } catch (e) { console.warn("获取笔记失败:", e); }
                }

                // 3. 图片笔记
                if (detail.pictureNote && detail.pictureNote.length > 0) {
                    let picHtml = '<div class="row g-2">';
                    detail.pictureNote.forEach(url => {
                        picHtml += `<div class="col-6 col-md-4"><img src="${proxyUrl(url)}" class="img-fluid rounded border" style="cursor:pointer;" onclick="window.open('${proxyUrl(url)}')" loading="lazy"></div>`;
                    });
                    picHtml += '</div>';
                    $("#mistakePicBody").html(picHtml);
                    $("#mistakePicCard").show();
                }

                // 如果没有任何内容展示
                if (!$("#mistakeQstCard").is(":visible") && !$("#mistakeAnsCard").is(":visible") && !$("#mistakeExpCard").is(":visible") && !$("#mistakeNoteCard").is(":visible") && !$("#mistakePicCard").is(":visible")) {
                    swal("无详情内容");
                }

            } catch (err) {
                console.error(err);
                swal("出现错误");
            }
        });

        $(mistake_list).append(tb);
    }
}
//mistake_query.onclick = mistake_query;

var downloading = 0,
    ques_focus,
    isiOS = !!navigator.userAgent.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/);
(function () {
    var file_count = 1;
    upload_button.onclick = () => {
        var files = upload_file.files;
        for (var i = 0; i < files.length; ++i) {
            var tb = $(`<tr>
                <th scope="row">${file_count++}</th>
                <td>${files[i].name}</td>
                <td>${files[i].size} Byte</td>
                <td class="status">Uploading</td>
              </tr>`)
            $(upload_msg).append(tb);
            upload(files[i], tb.children(".status"));
        }
    }

    function upload(file, msg) {
        var form = new FormData();
        form.append("file", file);
        var x = new XMLHttpRequest();
        x.open("post", location.origin + "/upload", true);
        x.setRequestHeader("name", encodeURIComponent(localStorage.getItem("realName")));
        x.setRequestHeader("token", localStorage.getItem("token"));
        x.setRequestHeader("userid", localStorage.getItem("id"))
        x.send(form);
        x.onreadystatechange = () => {
            if (x.readyState == 4)
                if (x.status == 200)
                    $(msg).text(x.response);
                else $(msg).text("Unknown Error");
        };
    }
})


// 学校选择切换
function onSchoolChange() {
    const schoolSelect = document.getElementById("school_select");
    const schoolCodeGroup = document.getElementById("school_code_group");
    if (schoolSelect.value === "other") {
        schoolCodeGroup.style.display = "block";
    } else {
        schoolCodeGroup.style.display = "none";
    }
}

// 登录
login_btn.onclick = async () => {
    // 清除 localStorage 中的 API URL
    localStorage.removeItem("apiBaseUrl");
    localStorage.removeItem("apiBaseOrigin");

    $("#login_btn").prop("disabled", true);
    $("#login_btn").text("登录中");

    let message;
    let accountVal = account.value;
    let passwordVal = password.value;
    let schoolSelect = document.getElementById("school_select").value;
    let schoolCode = document.getElementById("school_code").value.trim();
    let currentApiBaseUrl = window.API_BASE_URL;
    let schoolName = "省锡中";

    // 处理其它学校
    if (schoolSelect === "other") {
        if (!schoolCode) {
            swal("请输入学校代码");
            $("#login_btn").prop("disabled", false);
            $("#login_btn").text("登录");
            return;
        }

        $("#login_btn").text("获取学校信息...");

        try {
            const resp = await fetch(`https://hagateway.zykj.org/api/discovery/${schoolCode}`);
            if (!resp.ok) throw new Error("学校代码无效");

            const schoolInfo = await resp.json();
            schoolName = schoolInfo.name;
            if (schoolInfo.server=="http://sxzsyxx.api.zykj.org") schoolInfo.server = "https://zyapi-sxzsyxx.loshop.com.cn";
            if (schoolInfo.server=="http://bjbsz.api2.zykj.org") schoolInfo.server = "https://zyapi-bjbsz.loshop.com.cn";

            // 检查 server 是否为 https
            if (!schoolInfo.server.startsWith("https://")) {
                swal("学校服务器环境不支持自适应登录，请联系作者");
                $("#login_btn").prop("disabled", false);
                $("#login_btn").text("登录");
                return;
            }

            currentApiBaseUrl = schoolInfo.server;
            // 更新标题显示
            $("#welc").html(`自适应登录 - ${schoolName}`);
        } catch (e) {
            swal("学校代码无效或网络错误");
            $("#login_btn").prop("disabled", false);
            $("#login_btn").text("登录");
            return;
        }
    } else {
        // 省锡中不清空标题
    }

    // 登录获取 token
    let data = await fetch(`${currentApiBaseUrl}/api/TokenAuth/Login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            userName: accountVal,
            password: passwordVal,
            clientType: 1
        })
    }).then(r => r.json());

    if (!data.result) {
        message = data.error.message;

        $("#login_btn").prop("disabled", false);
        $("#login_btn").text("登录");

        $("#welc").html(`自适应登录 - ${schoolName}<br><small class="text-danger">${message}</small>`);
    } else {
        let token = data.result.accessToken;
        let refreshToken = data.result.refreshToken;
        let expireTime = Date.now() + data.result.expireInSeconds * 1000; // accessToken 过期时间
        let refreshExpireTime = Date.now() + data.result.refreshExpireInSeconds * 1000; // refreshToken 过期时间

        // 获取用户信息
        let info = await fetch(`${currentApiBaseUrl}/api/services/app/User/GetInfoAsync`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            }
        }).then(r => r.json());

        info = info.result;
        info["token"] = token;

        if (!info.photo)
            info.photo = "https://s4.anilist.co/file/anilistcdn/user/avatar/large/default.png";

        for (let i in info) localStorage.setItem(i, info[i]);

        // 保存 token 信息到 localStorage
        localStorage.setItem("token", token);
        localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("tokenExpire", expireTime);
        localStorage.setItem("refreshTokenExpire", refreshExpireTime);
        localStorage.setItem("apiBaseUrl", currentApiBaseUrl);
        localStorage.setItem("apiBaseOrigin", currentApiBaseUrl); // 保存原始地址用于判断 special 路径

        // 更新全局变量
        window.API_BASE_URL = currentApiBaseUrl;
        window.API_BASE_BASE_URL = currentApiBaseUrl; // 用于判断是否使用 special 路径
        window.proxyBaseUrl = currentApiBaseUrl.replace("//", "//picAgent.");

        // 只有省锡中（非自适应）才判断教师账号
        if (schoolSelect !== "other" && accountVal[0] !== "2") {
            swal({
                title: '提示',
                text: '你的账号为非学生账号，功能受限(没适配)，仅可查看随身答和下载应用'
            });
        }

        $("#login_btn").prop("disabled", false);
        $("#login_btn").text("重新登录");

        message = `你好！<img src="${localStorage.getItem("photo")}" style="height:calc(1.425rem + 2.5vw);margin-right:2%;margin-bottom:0.5vh;">${localStorage.getItem("realName")}`;
        $("#logoutc").show();
        $("#loginc").hide();
        // 启动 token 自动刷新
        startTokenRefresh();

        $("#welc2").html(message);
    }

    $(".ball").fadeOut(500);
}
async function logout() {
    $('#loginc').show();
    $('#logoutc').hide();
    clearInterval(window.tokenRefresh);
    localStorage.setItem("token", "");
    localStorage.setItem("refreshToken", "");
    localStorage.setItem("tokenExpire", "");
    localStorage.setItem("refreshTokenExpire", "");
}
function startTokenRefresh() {
    window.tokenRefresh = setInterval(async () => {
        let tokenExpire = parseInt(localStorage.getItem("tokenExpire") || 0);
        let refreshTokenExpire = parseInt(localStorage.getItem("refreshTokenExpire") || 0);
        let now = Date.now();

        // 如果 accessToken 已过期但 refreshToken 还有效
        if (tokenExpire - now <= 10000 && now < refreshTokenExpire) {
            try {
                let refreshToken = localStorage.getItem("refreshToken");
                let apiBaseUrl = localStorage.getItem("apiBaseUrl") || "https://zyapi.loshop.com.cn";
                let data = await fetch(`${apiBaseUrl}/api/TokenAuth/RefreshToken`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "refreshtoken": `${refreshToken}`, // refreshToken 放在请求头
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    }
                }).then(r => r.json());

                if (data.result) {
                    let newToken = data.result.accessToken;
                    let newRefreshToken = data.result.refreshToken;
                    let newExpire = Date.now() + data.result.expireInSeconds * 1000;
                    let newRefreshExpire = Date.now() + data.result.refreshExpireInSeconds * 1000;

                    localStorage.setItem("token", newToken);
                    localStorage.setItem("refreshToken", newRefreshToken);
                    localStorage.setItem("tokenExpire", newExpire);
                    localStorage.setItem("refreshTokenExpire", newRefreshExpire);

                    console.log("Token 已刷新:", newToken);
                    var iframe = document.getElementById("zxzl_iframe");
                    iframe.src = `https://zyapi.loshop.com.cn/navPage.html?apiHost=${apiBaseUrl}&apiToken=` + localStorage.getItem("token") + "#\/list?messageType=pager";

                }
            } catch (e) {
                console.error("刷新 token 失败:", e);
            }
        }
    }, 1000); // 每 1 秒检查一次
}
let noteGetAllRunning = false;
let currentPage = 1;      // 当前页码
let pageSize = 20;        // 每页显示数量
let allNotes = [];        // 存储解密后的所有笔记

async function noteGetAll(page = 1) {
    if (noteGetAllRunning) return;
    noteGetAllRunning = true;

    try {
        $(".ball").fadeIn(100);
        $('#note_search').fadeOut(100);
        $("#noteList2").html(""); // 清空

        // 第一次加载才请求 API
        if (allNotes.length === 0) {
            let response = await fetch(`${window.API_BASE_URL}/CloudNotes/api/Notes/GetAll`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                }
            });

            if (response.status == 401) {
                swal("身份失效，请重新登录");
                return;
            }

            let data = await response.json();
            data = JSON.parse(aesDecrypt(data.data));
            let list = data.noteList;

            // 只保留 type = 1 或 12
            allNotes = list.filter(item => item.type == 1 || item.type == 12);
            allNotes = shellsort(allNotes); // 按字母排序
        }

        currentPage = page;
        const start = (currentPage - 1) * pageSize;
        const end = start + pageSize;
        const pageNotes = allNotes.slice(start, end);

        pageNotes.forEach((item, i) => {
            const safeName = (item.fileName || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
            const template = `
                <a onclick="if(downloading)swal('你已经在下载一个文件，耐心等待哦');else noteDownload('${item.fileId}','${item.fileName}')" 
                   class="list-group-item list-group-item-action py-3 lh-tight a-note" 
                   aria-current="true" 
                   style="background:rgba(255,255,255,0) !important;">
                    <div class="d-flex w-100 align-items-center justify-content-between">
                        <strong class="note-name mb-1">${item.fileName}</strong>
                        <div class="d-flex align-items-center gap-2">
                            <span style="cursor:pointer;font-size:1.1rem;opacity:0.5;" title="分享" onclick="event.stopPropagation();event.preventDefault();openShareModal('note','${item.fileId}','${safeName}')">📤</span>
                            <small>${item.updateTime}</small>
                        </div>
                    </div>
                </a>`;
            $("#noteList2").append(template);
        });

        renderPagination1();
    } catch (err) {
        console.error("noteGetAll 执行出错:", err);
    } finally {
        $(".ball").fadeOut(100);
        $("#ball_T").text("请稍候");
        noteGetAllRunning = false;
    }
}

// 渲染分页控件
// 渲染分页控件（输入框 onchange 跳页）
function renderPagination1() {
    const totalPages = Math.ceil(allNotes.length / pageSize);
    if (totalPages <= 1) return;

    let html = `
    <div class="mt-3 d-flex justify-content-center align-items-center gap-3 flex-wrap">
        <button class="btn btn-sm btn-outline-primary" 
                ${currentPage === 1 ? 'disabled' : ''} 
                onclick="noteGetAll(${currentPage - 1})">
            上一页
        </button>

        <div class="d-flex align-items-center gap-1">
            <input type="number" id="pageInput" min="1" max="${totalPages}" value="${currentPage}" 
                   class="form-control form-control-sm text-center" 
                   style="width: 60px;" 
                   onchange="goToPage()">
            <span>/ ${totalPages}</span>
        </div>

        <button class="btn btn-sm btn-outline-primary" 
                ${currentPage === totalPages ? 'disabled' : ''} 
                onclick="noteGetAll(${currentPage + 1})">
            下一页
        </button>
    </div>
    `;

    $("#noteList2").append(html);
}

// 处理页码跳转
function goToPage() {
    const input = document.getElementById('pageInput');
    let page = parseInt(input.value);
    const totalPages = Math.ceil(allNotes.length / pageSize);

    if (isNaN(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    noteGetAll(page);
}





async function noteDownload(fileId, name) {
    if (this.downloading) return;
    this.downloading = 1;

    let response = await fetch(getCloudNoteApiPathR("GetByFileId", aesEncrypt("fileId=" + fileId)), {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
    })
    if (response.status == 401) {
        swal("身份失效，请重新登录");
        this.downloading = 0;
        return;
    }
    let data = await response.json();
    let list = JSON.parse(aesDecrypt(data.data)).resourceList;

    // 按页分组
    let pageMap = {};
    for (let i = 0; i < list.length; i++) {
        let item = list[i];
        let page = item.pageIndex + 1;
        let ext = item.ossImageUrl.split('.').pop();
        let isThumbnail = item.resourceType == 2;
        if (!pageMap[page]) pageMap[page] = { originals: [] };
        if (isThumbnail) {
            pageMap[page].thumbnail = {
                url: item.ossImageUrl.startsWith('http')
                    ? proxyUrl(item.ossImageUrl)
                    : proxyUrl("http://friday-note.oss-cn-hangzhou.aliyuncs.com/" + item.ossImageUrl),
                imgSrc: item.ossImageUrl.startsWith('http')
                    ? proxyImgSrc(item.ossImageUrl)
                    : proxyImgSrc("http://friday-note.oss-cn-hangzhou.aliyuncs.com/" + item.ossImageUrl),
                ext
            };
        } else {
            pageMap[page].originals.push({
                url: item.ossImageUrl.startsWith('http')
                    ? proxyUrl(item.ossImageUrl)
                    : proxyUrl("http://friday-note.oss-cn-hangzhou.aliyuncs.com/" + item.ossImageUrl),
                imgSrc: item.ossImageUrl.startsWith('http')
                    ? proxyImgSrc(item.ossImageUrl)
                    : proxyImgSrc("http://friday-note.oss-cn-hangzhou.aliyuncs.com/" + item.ossImageUrl),
                ext
            });
        }
    }

    // 构建模态框
    if (!document.getElementById('notePreviewModal')) {
        let modalHtml = `
        <div class="modal fade" id="notePreviewModal" tabindex="-1" aria-labelledby="notePreviewModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-xl modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="notePreviewModalLabel">预览</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="关闭"></button>
                    </div>
                    <div class="modal-body" id="notePreviewBody" style="min-height:60vh;position:relative;">
                        <div id="notePreviewLoading" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);display:none;">
                            <div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div>
                        </div>
                    </div>
                    <div class="modal-footer d-flex flex-wrap justify-content-between align-items-center" style="gap: 10px;">
                    
        
    <div>
    <button type="button" id="prevPageBtn" class="btn btn-secondary me-2">上一页</button>
        <span id="notePreviewPageInfo" style="margin:0 1em;"></span>
        <button type="button" id="nextPageBtn" class="btn btn-secondary">下一页</button>
    </div>
    <div class="d-flex align-items-center">
        
    <button type="button" class="btn btn-success me-2" id="exportPdfBtn">导出为PDF</button>
        <button type="button" class="btn btn-info me-2" onclick="noteDownload2('${fileId}', '${name}')" data-bs-dismiss="modal">下载笔记</button>
        <button type="button" class="btn btn-warning" data-bs-dismiss="modal" onclick="$('#notePreviewModal').remove();">关闭</button>
    </div>
</div>
                </div>
            </div>
        </div>`;
        $('body').append(modalHtml);
        $('#exportPdfBtn').off('click').on('click', async function () {
            const { jsPDF } = window.jspdf;
            let pdf = new jsPDF('p', 'pt', 'a4');

            // 创建进度条UI
            if (!document.getElementById("pdfExportProgress")) {
                $("body").append(`
            <div id="pdfExportProgress" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                 background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.2);z-index:9999;width:300px;">
                <div style="margin-bottom:10px;">正在导出 PDF...</div>
                <div class="progress" style="height:20px;">
                    <div id="pdfProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" 
                        role="progressbar" style="width:0%">0%</div>
                </div>
            </div>
        `);
            } else {
                $("#pdfProgressBar").css("width", "0%").text("0%");
                $("#pdfExportProgress").show();
            }

            for (let i = 0; i < pages.length; i++) {
                let pageNum = pages[i];
                let pageData = pageMap[pageNum];
                if (!pageData.thumbnail) continue;

                // 拉取图片
                let imgUrl = pageData.thumbnail.url;
                let img = await loadImageAsDataURL(imgUrl);

                // 计算缩放
                let pageWidth = pdf.internal.pageSize.getWidth();
                let pageHeight = pdf.internal.pageSize.getHeight();
                let imgObj = new Image();
                imgObj.src = img;
                await new Promise(r => { imgObj.onload = r; });

                let ratio = Math.min(pageWidth / imgObj.width, pageHeight / imgObj.height);
                let imgWidth = imgObj.width * ratio;
                let imgHeight = imgObj.height * ratio;
                let x = (pageWidth - imgWidth) / 2;
                let y = (pageHeight - imgHeight) / 2;

                if (i > 0) pdf.addPage();
                pdf.addImage(img, 'JPEG', x, y, imgWidth, imgHeight);

                // 页脚
                pdf.setFontSize(8);
                pdf.setTextColor(100);
                let footerText = "https://zytb.loshop.com.cn";
                let textWidth = pdf.getTextWidth(footerText);
                pdf.text(footerText, pageWidth - textWidth - 20, pageHeight - 20);

                // 更新进度
                let percent = Math.round(((i + 1) / pages.length) * 100);
                $("#pdfProgressBar").css("width", percent + "%").text(percent + "%");
            }

            // 完成
            $("#pdfExportProgress").fadeOut(500, function () { $(this).hide(); });
            pdf.save(name + '.pdf');
        });


        // 工具函数：把图片转成 DataURL
        async function loadImageAsDataURL(url) {
            const res = await fetch(url);
            const blob = await res.blob();
            return new Promise(resolve => {
                let reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        }
    } else {
        $('#exportPdfBtn').off('click').on('click', async function () {
            const { jsPDF } = window.jspdf;
            let pdf = new jsPDF('p', 'pt', 'a4');

            // 创建进度条UI
            if (!document.getElementById("pdfExportProgress")) {
                $("body").append(`
            <div id="pdfExportProgress" style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);
                 background:#fff;padding:20px;border-radius:8px;box-shadow:0 2px 10px rgba(0,0,0,0.2);z-index:9999;width:300px;">
                <div style="margin-bottom:10px;">正在导出 PDF...</div>
                <div class="progress" style="height:20px;">
                    <div id="pdfProgressBar" class="progress-bar progress-bar-striped progress-bar-animated" 
                        role="progressbar" style="width:0%">0%</div>
                </div>
            </div>
        `);
            } else {
                $("#pdfProgressBar").css("width", "0%").text("0%");
                $("#pdfExportProgress").show();
            }

            for (let i = 0; i < pages.length; i++) {
                let pageNum = pages[i];
                let pageData = pageMap[pageNum];
                if (!pageData.thumbnail) continue;

                // 拉取图片
                let imgUrl = pageData.thumbnail.url;
                let img = await loadImageAsDataURL(imgUrl);

                // 计算缩放
                let pageWidth = pdf.internal.pageSize.getWidth();
                let pageHeight = pdf.internal.pageSize.getHeight();
                let imgObj = new Image();
                imgObj.src = img;
                await new Promise(r => { imgObj.onload = r; });

                let ratio = Math.min(pageWidth / imgObj.width, pageHeight / imgObj.height);
                let imgWidth = imgObj.width * ratio;
                let imgHeight = imgObj.height * ratio;
                let x = (pageWidth - imgWidth) / 2;
                let y = (pageHeight - imgHeight) / 2;

                if (i > 0) pdf.addPage();
                pdf.addImage(img, 'JPEG', x, y, imgWidth, imgHeight);

                // 页脚
                pdf.setFontSize(8);
                pdf.setTextColor(100);
                let footerText = "https://gl.zytb.loshop.com.cn";
                let textWidth = pdf.getTextWidth(footerText);
                pdf.text(footerText, pageWidth - textWidth - 20, pageHeight - 20);

                // 更新进度
                let percent = Math.round(((i + 1) / pages.length) * 100);
                $("#pdfProgressBar").css("width", percent + "%").text(percent + "%");
            }

            // 完成
            $("#pdfExportProgress").fadeOut(500, function () { $(this).hide(); });
            pdf.save(name + '.pdf');
        });


        // 工具函数：把图片转成 DataURL
        async function loadImageAsDataURL(url) {
            const res = await fetch(url);
            const blob = await res.blob();
            return new Promise(resolve => {
                let reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        }
    }

    // 页码数组
    let pages = Object.keys(pageMap).sort((a, b) => a - b);
    let currentPage = 0;

    async function renderPage(idx) {
        $('#notePreviewLoading').show();
        $('#notePreviewBody').find('.note-page-content').remove();

        let pageNum = pages[idx];
        let pageData = pageMap[pageNum];
        let html = '<div class="note-page-content" style="position:relative;display:none;">';

        // 总览图
        if (pageData.thumbnail) {
            html += `<div style="width:100%;text-align:center;margin-bottom:20px;position:relative;">
                        <img id="thumbImg" src="" alt="页面总览" style="max-width:80%;max-height:350px;object-fit:contain;box-shadow:0 2px 8px #ccc;border-radius:8px;">
                    </div>`;
        }
        // 原图水平滚动
        if (pageData.originals.length > 0) {
            html += `<div style="width:100%;overflow-x:auto;white-space:nowrap;padding:10px 0 0 0;">
                        <div id="originalsRow" style="display:inline-flex;gap:16px;">`;
            for (let j = 0; j < pageData.originals.length; j++) {
                html += `<div class="orig-img-wrap" style="display:inline-block;position:relative;">
                            <img id="origImg${j}" src="" alt="原图${j + 1}" style="height:120px;max-width:180px;object-fit:contain;border-radius:6px;box-shadow:0 1px 4px #bbb;">
                            <div id="origImgLoading${j}" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);">
                                <div class="spinner-border spinner-border-sm text-secondary" role="status"></div>
                            </div>
                        </div>`;
            }
            html += `</div></div>`;
        }
        html += '</div>';

        $('#notePreviewBody').append(html);

        // 懒加载逻辑
        let loadedCount = 0;
        let totalToLoad = (pageData.thumbnail ? 1 : 0) + pageData.originals.length;

        // 所有图片未加载完成时，隐藏图片区
        $('.note-page-content').hide();

        function hideLoading() {
            loadedCount++;
            if (loadedCount >= totalToLoad) {
                $('#notePreviewLoading').hide();
                $('.note-page-content').show();
            }
        }

        // 总览加载
        if (pageData.thumbnail) {
            let thumbImg = new Image();
            thumbImg.onload = function () {
                $('#thumbImg').attr('src', thumbImg.src).show();
                hideLoading();
            };
            thumbImg.onerror = function () {
                $('#thumbImg').hide();
                hideLoading();
            };
            thumbImg.src = pageData.thumbnail.imgSrc || pageData.thumbnail.url;
        }
        // 原图加载
        for (let j = 0; j < pageData.originals.length; j++) {
            let origImg = new Image();
            origImg.onload = function () {
                $('#origImg' + j).attr('src', origImg.src).show();
                $('#origImgLoading' + j).hide();
                hideLoading();
            };
            origImg.onerror = function () {
                $('#origImg' + j).hide();
                $('#origImgLoading' + j).hide();
                hideLoading();
            };
            origImg.src = pageData.originals[j].imgSrc || pageData.originals[j].url;
        }
        if (totalToLoad === 0) {
            $('#notePreviewLoading').hide();
            $('.note-page-content').show();
        }

        $('#notePreviewPageInfo').text(`第 ${pageNum} 页 / 共 ${pages.length} 页`);
        $('#prevPageBtn').prop('disabled', idx === 0);
        $('#nextPageBtn').prop('disabled', idx === pages.length - 1);
    }

    $('#prevPageBtn').off('click').on('click', function () {
        if (currentPage > 0) {
            currentPage--;
            renderPage(currentPage);
        }
    });
    $('#nextPageBtn').off('click').on('click', function () {
        if (currentPage < pages.length - 1) {
            currentPage++;
            renderPage(currentPage);
        }
    });

    // 初始化显示第一页
    currentPage = 0;
    renderPage(currentPage);

    $('#notePreviewModal').modal('show');
    this.downloading = 0;
}

async function noteDownload2(fileId, name) {
    $("#notePreviewModal").remove();
    if (this.downloading) return;
    this.downloading = 1;

    let response = await fetch(`${window.API_BASE_URL}/special/GetByFileId?${aesEncrypt("fileId=" + fileId)}`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
    })
    if (response.status == 401) {
        swal("身份失效，请重新登录");
        return;
    }
    let data = await response.json();
    let zip = new JSZip();
    let list = JSON.parse(aesDecrypt(data.data)).resourceList;
    let count = [];


    $(".ball").fadeIn(100);
    $("#ball_T").text("请稍候");

    ind = 0;

    for (i in list) {
        ind += 1;
        let ossUrl = list[i].ossImageUrl;
        let url = ossUrl.startsWith('http')
            ? proxyUrl(ossUrl)
            : proxyUrl("http://friday-note.oss-cn-hangzhou.aliyuncs.com/" + ossUrl);

        $("#ball_T").text(`正在获取 ${parseInt(ind / list.length * 100)}%`);
        if (url.match(/\.(jpg|jpeg|png|webp)$/)) {
            let image = await fetch(url)
                .then(response => response.blob())
            if (!count[list[i].pageIndex])
                count[list[i].pageIndex] = 1;
            zip.file(`${list[i].pageIndex + 1}-${list[i].resourceType == 2 ? "thumbnail" : count[list[i].pageIndex]++}.jpg`, image);
        }
    }

    zip.generateAsync({
        type: "blob"
    }).then(function (content) {

        $("#ball_T").html(`获取完毕，下载启动<br/><button type="button" class="btn btn-warning" data-bs-dismiss="modal">关闭</button>`);

        download(URL.createObjectURL(content), name + '.zip')
        this.downloading = 0;
        $("#ball_T").text("请稍候");
        $(".ball").fadeOut(100);
    });
}

function download(url, name) {
    downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = name;
    downloadLink.target = "_blank";
    downloadLink.click();
}

function shellsort(data) {
    var len = data.length,
        gap, i, j, temp;
    for (gap = Math.floor(len / 2); gap > 0; gap = Math.floor(gap / 2))
        for (i = gap; i < len; i++)
            for (j = i - gap; j >= 0 && data[j].updateTime < data[j + gap].updateTime; j -= gap)
                temp = data[j], data[j] = data[j + gap], data[j + gap] = temp;
    return data;
}

async function quoraInit() {
    let data = await fetch(`${window.API_BASE_URL}/api/services/app/Quora/GetCatalogs`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
    }).then(response => response.json());
    data = data.result;
    $('#ques_topic').html("");
    for (i in data) {
        const isFirst = i == 0;
        $(ques_topic).append(`<button class="btn btn-sm ques-topic-tab ${isFirst ? 'btn-primary active' : 'btn-outline-secondary'}" data-topic="${data[i].id}" onclick="quesTopicSelect(this)">${data[i].name}</button>`)
    }
    ques_query();
}

async function mistakeInit() {
    let data = await fetch(`${window.API_BASE_URL}/api/services/app/MistakeBook/GetMyMistakeBooksAsync`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
    }).then(response => response.json());
    data = data.result;
    $(mistake_subject).html(``);
    for (i in data) {
        $(mistake_subject).append(`<option value="${data[i].id}">${data[i].topic.content}</option>`)
    }
    mistake_query();
}


zxzl_login.onclick = async () => {
    window.open(`https://zyapi.loshop.com.cn/navPage.html?apiHost=${window.API_BASE_URL}&apiToken=` + localStorage.getItem("token") + "#\/list?messageType=pager");
}

function zxzl_set_url() {

    var iframe = document.getElementById("zxzl_iframe");
    iframe.src = `https://zyapi.loshop.com.cn/navPage.html?apiHost=${window.API_BASE_URL}&apiToken=` + localStorage.getItem("token") + "#\/list?messageType=pager";

}

ck_login = document.getElementById("ck_login");
ck_login.onclick = async () => {
    window.open("ezyRawContent.html?apiHost=https:\/\/zyapi.loshop.com.cn&apiToken=" + localStorage.getItem("token") + "#/index/courseChoosing/StudentsCoursesList");
}

function ck_set_url() {
    var iframe = document.getElementById("ck_iframe");
    iframe.src = "ezyRawContent.html?apiHost=https:\/\/zyapi.loshop.com.cn&apiToken=" + localStorage.getItem("token") + "#/index/courseChoosing/StudentsCoursesList";

}


var note_link = "http:\/\/ezy-sxz.oss-cn-hangzhou.aliyuncs.com\/1\/appstore\/云笔记_master_20240513.01_1938_1.9.38.apk";
var test_link = "http:\/\/ezy-sxz.oss-cn-hangzhou.aliyuncs.com\/1\/appstore\/新测评_master_20240304.01_release_215_2.1.5.apk";
var learn_link = "http:\/\/ezy-sxz.oss-cn-hangzhou.aliyuncs.com\/1\/appstore\/云笔记_master_20240513.01_1938_1.9.38.apk";
var user_link = "http:\/\/ezy-sxz.oss-cn-hangzhou.aliyuncs.com\/1\/appstore\/用户中心_master_20240426.01_release_40_2.0.15.apk";
var mistake_link = "http:\/\/ezy-sxz.oss-cn-hangzhou.aliyuncs.com\/1\/appstore\/错题本_master_20240326.01_57_1.0.57.apk";
var web_link = "http:\/\/ezy-sxz.oss-cn-hangzhou.aliyuncs.com\/1\/appstore\/浏览器_master_20240221.01_1211_1.2.11.apk";
var chat_link = "http:\/\/ezy-sxz.oss-cn-hangzhou.aliyuncs.com\/1\/appstore\/随身答(学生版)_master_20240326.01_release_11_1.0.11.apk";

function reload_note_link() {
    $.ajax({
        url: 'https:\/\/zyapi.loshop.com.cn\/api\/services\/app\/AppStore\/CheckUpdateAsync?packageName=com.friday.cloudsnote&version=11&appType=0',
        type: 'get',
        // 设置的是请求参数
        data: {
            packageName: "com.friday.cloudsnote",
            version: 11,
            appType: 0
        },
        dataType: 'json', // 用于设置响应体的类型 注意 跟 data 参数没关系！！！
        success: function (res) {
            // 一旦设置的 dataType 选项，就不再关心 服务端 响应的 Content-Type 了
            // 客户端会主观认为服务端返回的就是 JSON 格式的字符串
            console.log(res.result.fileUrl);
            note_link = res.result.fileUrl;
        }
    });

}

function download_note() {
    // 创建下载进度模态框
    if (!document.getElementById('noteDownloadModal')) {
        let modalHtml = `
        <div class="modal fade show" id="noteDownloadModal" tabindex="-1" style="display:block;background:rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">下载进度</h5>
                    </div>
                    <div class="modal-body">
                        <div id="noteDownloadProgress">正在准备下载...</div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('noteDownloadModal').remove()">关闭</button>
                    </div>
                </div>
            </div>
        </div>`;
        let div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div);
    } else {
        document.getElementById('noteDownloadProgress').innerText = "正在准备下载...";
        document.getElementById('noteDownloadModal').style.display = "block";
    }

    // 下载文件并展示进度
    let url = proxyUrl(note_link);
    let filename = note_link.split('/').pop();

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("下载失败");
            const contentLength = response.headers.get('Content-Length');
            if (!contentLength) {
                document.getElementById('noteDownloadProgress').innerText = "正在下载...";
            }
            const total = contentLength ? parseInt(contentLength) : 0;
            let loaded = 0;
            const reader = response.body.getReader();
            let chunks = [];
            function read() {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        // 下载完成
                        let blob = new Blob(chunks);
                        let objectUrl = URL.createObjectURL(blob);
                        let a = document.createElement('a');
                        a.href = objectUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        document.getElementById('noteDownloadProgress').innerText = "下载完成";
                        setTimeout(() => {
                            let modal = document.getElementById('noteDownloadModal');
                            if (modal) modal.remove();
                            URL.revokeObjectURL(objectUrl);
                        }, 1500);
                        return;
                    }
                    chunks.push(value);
                    loaded += value.length;
                    if (total) {
                        let percent = Math.floor(loaded / total * 100);
                        document.getElementById('noteDownloadProgress').innerText = `下载进度：${percent}%`;
                    } else {
                        document.getElementById('noteDownloadProgress').innerText = `已下载 ${loaded} 字节...`;
                    }
                    return read();
                });
            }
            return read();
        })
        .catch(e => {
            document.getElementById('noteDownloadProgress').innerText = "下载失败：" + e.message;
        });
}

function reload_test_link() {
    $.ajax({
        url: 'https:\/\/zyapi.loshop.com.cn\/api\/services\/app\/AppStore\/CheckUpdateAsync?packageName=com.zykj.evaluation&version=11&appType=0',
        type: 'get',
        // 设置的是请求参数
        data: {
            packageName: "com.zykj.evaluation",
            version: 11,
            appType: 0
        },
        dataType: 'json', // 用于设置响应体的类型 注意 跟 data 参数没关系！！！
        success: function (res) {
            // 一旦设置的 dataType 选项，就不再关心 服务端 响应的 Content-Type 了
            // 客户端会主观认为服务端返回的就是 JSON 格式的字符串
            console.log(res.result.fileUrl);
            test_link = res.result.fileUrl;
        }
    });

}


function download_test() {
    // 创建下载进度模态框
    if (!document.getElementById('noteDownloadModal')) {
        let modalHtml = `
        <div class="modal fade show" id="noteDownloadModal" tabindex="-1" style="display:block;background:rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">下载进度</h5>
                    </div>
                    <div class="modal-body">
                        <div id="noteDownloadProgress">正在准备下载...</div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('noteDownloadModal').remove()">关闭</button>
                    </div>
                </div>
            </div>
        </div>`;
        let div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div);
    } else {
        document.getElementById('noteDownloadProgress').innerText = "正在准备下载...";
        document.getElementById('noteDownloadModal').style.display = "block";
    }

    // 下载文件并展示进度
    let url = proxyUrl(test_link);
    let filename = test_link.split('/').pop();

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("下载失败");
            const contentLength = response.headers.get('Content-Length');
            if (!contentLength) {
                document.getElementById('noteDownloadProgress').innerText = "正在下载...";
            }
            const total = contentLength ? parseInt(contentLength) : 0;
            let loaded = 0;
            const reader = response.body.getReader();
            let chunks = [];
            function read() {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        // 下载完成
                        let blob = new Blob(chunks);
                        let objectUrl = URL.createObjectURL(blob);
                        let a = document.createElement('a');
                        a.href = objectUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        document.getElementById('noteDownloadProgress').innerText = "下载完成";
                        setTimeout(() => {
                            let modal = document.getElementById('noteDownloadModal');
                            if (modal) modal.remove();
                            URL.revokeObjectURL(objectUrl);
                        }, 1500);
                        return;
                    }
                    chunks.push(value);
                    loaded += value.length;
                    if (total) {
                        let percent = Math.floor(loaded / total * 100);
                        document.getElementById('noteDownloadProgress').innerText = `下载进度：${percent}%`;
                    } else {
                        document.getElementById('noteDownloadProgress').innerText = `已下载 ${loaded} 字节...`;
                    }
                    return read();
                });
            }
            return read();
        })
        .catch(e => {
            document.getElementById('noteDownloadProgress').innerText = "下载失败：" + e.message;
        });
}

function reload_learn_link() {
    $.ajax({
        url: 'https:\/\/zyapi.loshop.com.cn\/api\/services\/app\/AppStore\/CheckUpdateAsync?packageName=com.zhongyukejiao.learningexpert&version=11&appType=0',
        type: 'get',
        // 设置的是请求参数
        data: {
            packageName: "com.zhongyukejiao.learningexpert",
            version: 11,
            appType: 0
        },
        dataType: 'json', // 用于设置响应体的类型 注意 跟 data 参数没关系！！！
        success: function (res) {
            // 一旦设置的 dataType 选项，就不再关心 服务端 响应的 Content-Type 了
            // 客户端会主观认为服务端返回的就是 JSON 格式的字符串
            console.log(res.result.fileUrl);
            learn_link = res.result.fileUrl;
        }
    });

}

function download_learn() {

    // 创建下载进度模态框
    if (!document.getElementById('noteDownloadModal')) {
        let modalHtml = `
        <div class="modal fade show" id="noteDownloadModal" tabindex="-1" style="display:block;background:rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">下载进度</h5>
                    </div>
                    <div class="modal-body">
                        <div id="noteDownloadProgress">正在准备下载...</div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('noteDownloadModal').remove()">关闭</button>
                    </div>
                </div>
            </div>
        </div>`;
        let div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div);
    } else {
        document.getElementById('noteDownloadProgress').innerText = "正在准备下载...";
        document.getElementById('noteDownloadModal').style.display = "block";
    }

    // 下载文件并展示进度
    let url = proxyUrl(learn_link);
    let filename = learn_link.split('/').pop();

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("下载失败");
            const contentLength = response.headers.get('Content-Length');
            if (!contentLength) {
                document.getElementById('noteDownloadProgress').innerText = "正在下载...";
            }
            const total = contentLength ? parseInt(contentLength) : 0;
            let loaded = 0;
            const reader = response.body.getReader();
            let chunks = [];
            function read() {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        // 下载完成
                        let blob = new Blob(chunks);
                        let objectUrl = URL.createObjectURL(blob);
                        let a = document.createElement('a');
                        a.href = objectUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        document.getElementById('noteDownloadProgress').innerText = "下载完成";
                        setTimeout(() => {
                            let modal = document.getElementById('noteDownloadModal');
                            if (modal) modal.remove();
                            URL.revokeObjectURL(objectUrl);
                        }, 1500);
                        return;
                    }
                    chunks.push(value);
                    loaded += value.length;
                    if (total) {
                        let percent = Math.floor(loaded / total * 100);
                        document.getElementById('noteDownloadProgress').innerText = `下载进度：${percent}%`;
                    } else {
                        document.getElementById('noteDownloadProgress').innerText = `已下载 ${loaded} 字节...`;
                    }
                    return read();
                });
            }
            return read();
        })
        .catch(e => {
            document.getElementById('noteDownloadProgress').innerText = "下载失败：" + e.message;
        });

}

function reload_user_link() {
    $.ajax({
        url: 'https:\/\/zyapi.loshop.com.cn\/api\/services\/app\/AppStore\/CheckUpdateAsync?packageName=com.zykj.manage&version=11&appType=0',
        type: 'get',
        // 设置的是请求参数
        data: {
            packageName: "com.zykj.manage",
            version: 11,
            appType: 0
        },
        dataType: 'json', // 用于设置响应体的类型 注意 跟 data 参数没关系！！！
        success: function (res) {
            // 一旦设置的 dataType 选项，就不再关心 服务端 响应的 Content-Type 了
            // 客户端会主观认为服务端返回的就是 JSON 格式的字符串
            console.log(res.result.fileUrl);
            user_link = res.result.fileUrl;
        }
    });

}

function download_user() {

    // 创建下载进度模态框
    if (!document.getElementById('noteDownloadModal')) {
        let modalHtml = `
        <div class="modal fade show" id="noteDownloadModal" tabindex="-1" style="display:block;background:rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">下载进度</h5>
                    </div>
                    <div class="modal-body">
                        <div id="noteDownloadProgress">正在准备下载...</div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('noteDownloadModal').remove()">关闭</button>
                    </div>
                </div>
            </div>
        </div>`;
        let div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div);
    } else {
        document.getElementById('noteDownloadProgress').innerText = "正在准备下载...";
        document.getElementById('noteDownloadModal').style.display = "block";
    }

    // 下载文件并展示进度
    let url = proxyUrl(user_link);
    let filename = user_link.split('/').pop();

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("下载失败");
            const contentLength = response.headers.get('Content-Length');
            if (!contentLength) {
                document.getElementById('noteDownloadProgress').innerText = "正在下载...";
            }
            const total = contentLength ? parseInt(contentLength) : 0;
            let loaded = 0;
            const reader = response.body.getReader();
            let chunks = [];
            function read() {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        // 下载完成
                        let blob = new Blob(chunks);
                        let objectUrl = URL.createObjectURL(blob);
                        let a = document.createElement('a');
                        a.href = objectUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        document.getElementById('noteDownloadProgress').innerText = "下载完成";
                        setTimeout(() => {
                            let modal = document.getElementById('noteDownloadModal');
                            if (modal) modal.remove();
                            URL.revokeObjectURL(objectUrl);
                        }, 1500);
                        return;
                    }
                    chunks.push(value);
                    loaded += value.length;
                    if (total) {
                        let percent = Math.floor(loaded / total * 100);
                        document.getElementById('noteDownloadProgress').innerText = `下载进度：${percent}%`;
                    } else {
                        document.getElementById('noteDownloadProgress').innerText = `已下载 ${loaded} 字节...`;
                    }
                    return read();
                });
            }
            return read();
        })
        .catch(e => {
            document.getElementById('noteDownloadProgress').innerText = "下载失败：" + e.message;
        });
}

function reload_mistake_link() {
    $.ajax({
        url: 'https:\/\/zyapi.loshop.com.cn\/api\/services\/app\/AppStore\/CheckUpdateAsync?packageName=com.zykj.mistake&version=11&appType=0',
        type: 'get',
        // 设置的是请求参数
        data: {
            packageName: "com.zykj.mistake",
            version: 11,
            appType: 0
        },
        dataType: 'json', // 用于设置响应体的类型 注意 跟 data 参数没关系！！！
        success: function (res) {
            // 一旦设置的 dataType 选项，就不再关心 服务端 响应的 Content-Type 了
            // 客户端会主观认为服务端返回的就是 JSON 格式的字符串
            console.log(res.result.fileUrl);
            mistake_link = res.result.fileUrl;
        }
    });

}

function download_mistake() {

    // 创建下载进度模态框
    if (!document.getElementById('noteDownloadModal')) {
        let modalHtml = `
        <div class="modal fade show" id="noteDownloadModal" tabindex="-1" style="display:block;background:rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">下载进度</h5>
                    </div>
                    <div class="modal-body">
                        <div id="noteDownloadProgress">正在准备下载...</div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('noteDownloadModal').remove()">关闭</button>
                    </div>
                </div>
            </div>
        </div>`;
        let div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div);
    } else {
        document.getElementById('noteDownloadProgress').innerText = "正在准备下载...";
        document.getElementById('noteDownloadModal').style.display = "block";
    }

    // 下载文件并展示进度
    let url = proxyUrl(mistake_link);
    let filename = mistake_link.split('/').pop();

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("下载失败");
            const contentLength = response.headers.get('Content-Length');
            if (!contentLength) {
                document.getElementById('noteDownloadProgress').innerText = "正在下载...";
            }
            const total = contentLength ? parseInt(contentLength) : 0;
            let loaded = 0;
            const reader = response.body.getReader();
            let chunks = [];
            function read() {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        // 下载完成
                        let blob = new Blob(chunks);
                        let objectUrl = URL.createObjectURL(blob);
                        let a = document.createElement('a');
                        a.href = objectUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        document.getElementById('noteDownloadProgress').innerText = "下载完成";
                        setTimeout(() => {
                            let modal = document.getElementById('noteDownloadModal');
                            if (modal) modal.remove();
                            URL.revokeObjectURL(objectUrl);
                        }, 1500);
                        return;
                    }
                    chunks.push(value);
                    loaded += value.length;
                    if (total) {
                        let percent = Math.floor(loaded / total * 100);
                        document.getElementById('noteDownloadProgress').innerText = `下载进度：${percent}%`;
                    } else {
                        document.getElementById('noteDownloadProgress').innerText = `已下载 ${loaded} 字节...`;
                    }
                    return read();
                });
            }
            return read();
        })
        .catch(e => {
            document.getElementById('noteDownloadProgress').innerText = "下载失败：" + e.message;
        });
}

function reload_web_link() {
    $.ajax({
        url: 'https:\/\/zyapi.loshop.com.cn\/api\/services\/app\/AppStore\/CheckUpdateAsync?packageName=com.zykj.subscriber&version=11&appType=0',
        type: 'get',
        // 设置的是请求参数
        data: {
            packageName: "com.zykj.subscriber",
            version: 11,
            appType: 0
        },
        dataType: 'json', // 用于设置响应体的类型 注意 跟 data 参数没关系！！！
        success: function (res) {
            // 一旦设置的 dataType 选项，就不再关心 服务端 响应的 Content-Type 了
            // 客户端会主观认为服务端返回的就是 JSON 格式的字符串
            console.log(res.result.fileUrl);
            web_link = res.result.fileUrl;
        }
    });

}

function download_web() {

    // 创建下载进度模态框
    if (!document.getElementById('noteDownloadModal')) {
        let modalHtml = `
        <div class="modal fade show" id="noteDownloadModal" tabindex="-1" style="display:block;background:rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">下载进度</h5>
                    </div>
                    <div class="modal-body">
                        <div id="noteDownloadProgress">正在准备下载...</div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('noteDownloadModal').remove()">关闭</button>
                    </div>
                </div>
            </div>
        </div>`;
        let div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div);
    } else {
        document.getElementById('noteDownloadProgress').innerText = "正在准备下载...";
        document.getElementById('noteDownloadModal').style.display = "block";
    }

    // 下载文件并展示进度
    let url = proxyUrl(web_link);
    let filename = web_link.split('/').pop();

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("下载失败");
            const contentLength = response.headers.get('Content-Length');
            if (!contentLength) {
                document.getElementById('noteDownloadProgress').innerText = "正在下载...";
            }
            const total = contentLength ? parseInt(contentLength) : 0;
            let loaded = 0;
            const reader = response.body.getReader();
            let chunks = [];
            function read() {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        // 下载完成
                        let blob = new Blob(chunks);
                        let objectUrl = URL.createObjectURL(blob);
                        let a = document.createElement('a');
                        a.href = objectUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        document.getElementById('noteDownloadProgress').innerText = "下载完成";
                        setTimeout(() => {
                            let modal = document.getElementById('noteDownloadModal');
                            if (modal) modal.remove();
                            URL.revokeObjectURL(objectUrl);
                        }, 1500);
                        return;
                    }
                    chunks.push(value);
                    loaded += value.length;
                    if (total) {
                        let percent = Math.floor(loaded / total * 100);
                        document.getElementById('noteDownloadProgress').innerText = `下载进度：${percent}%`;
                    } else {
                        document.getElementById('noteDownloadProgress').innerText = `已下载 ${loaded} 字节...`;
                    }
                    return read();
                });
            }
            return read();
        })
        .catch(e => {
            document.getElementById('noteDownloadProgress').innerText = "下载失败：" + e.message;
        });
}

function reload_chat_link() {
    $.ajax({
        url: 'https:\/\/zyapi.loshop.com.cn\/api\/services\/app\/AppStore\/CheckUpdateAsync?packageName=com.zykj.student.dialogue&version=11&appType=0',
        type: 'get',
        // 设置的是请求参数
        data: {
            packageName: "com.zykj.student.dialogue",
            version: 11,
            appType: 0
        },
        dataType: 'json', // 用于设置响应体的类型 注意 跟 data 参数没关系！！！
        success: function (res) {
            // 一旦设置的 dataType 选项，就不再关心 服务端 响应的 Content-Type 了
            // 客户端会主观认为服务端返回的就是 JSON 格式的字符串
            console.log(res.result.fileUrl);
            chat_link = res.result.fileUrl;
        }
    });

}

function download_chat() {

    // 创建下载进度模态框
    if (!document.getElementById('noteDownloadModal')) {
        let modalHtml = `
        <div class="modal fade show" id="noteDownloadModal" tabindex="-1" style="display:block;background:rgba(0,0,0,0.5);" aria-modal="true" role="dialog">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">下载进度</h5>
                    </div>
                    <div class="modal-body">
                        <div id="noteDownloadProgress">正在准备下载...</div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" onclick="document.getElementById('noteDownloadModal').remove()">关闭</button>
                    </div>
                </div>
            </div>
        </div>`;
        let div = document.createElement('div');
        div.innerHTML = modalHtml;
        document.body.appendChild(div);
    } else {
        document.getElementById('noteDownloadProgress').innerText = "正在准备下载...";
        document.getElementById('noteDownloadModal').style.display = "block";
    }

    // 下载文件并展示进度
    let url = proxyUrl(chat_link);
    let filename = chat_link.split('/').pop();

    fetch(url)
        .then(response => {
            if (!response.ok) throw new Error("下载失败");
            const contentLength = response.headers.get('Content-Length');
            if (!contentLength) {
                document.getElementById('noteDownloadProgress').innerText = "正在下载...";
            }
            const total = contentLength ? parseInt(contentLength) : 0;
            let loaded = 0;
            const reader = response.body.getReader();
            let chunks = [];
            function read() {
                return reader.read().then(({ done, value }) => {
                    if (done) {
                        // 下载完成
                        let blob = new Blob(chunks);
                        let objectUrl = URL.createObjectURL(blob);
                        let a = document.createElement('a');
                        a.href = objectUrl;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        document.getElementById('noteDownloadProgress').innerText = "下载完成";
                        setTimeout(() => {
                            let modal = document.getElementById('noteDownloadModal');
                            if (modal) modal.remove();
                            URL.revokeObjectURL(objectUrl);
                        }, 1500);
                        return;
                    }
                    chunks.push(value);
                    loaded += value.length;
                    if (total) {
                        let percent = Math.floor(loaded / total * 100);
                        document.getElementById('noteDownloadProgress').innerText = `下载进度：${percent}%`;
                    } else {
                        document.getElementById('noteDownloadProgress').innerText = `已下载 ${loaded} 字节...`;
                    }
                    return read();
                });
            }
            return read();
        })
        .catch(e => {
            document.getElementById('noteDownloadProgress').innerText = "下载失败：" + e.message;
        });
}



async function reload_all() {
    reload_test_link();
    reload_chat_link();
    reload_learn_link();
    reload_web_link();
    reload_mistake_link();
    reload_note_link();
    reload_user_link();
}

function reload_token() {
    $("#show_token").attr("value", localStorage.getItem("token"));
}

function show_class_table() {
    window.open(proxyUrl("http:\/\/sxz.school.zykj.org/navPage.html?apiHost=https:\/\/zyapi.loshop.com.cn&apiToken=" + localStorage.getItem("token") + "#\/class"));
}

function show_online_test() {
    window.open("https:\/\/m.dongni100.com\/system\/login?redirectUrl=%2F");
}

function copy_token() {
    const inputElement = document.querySelector('#show_token');
    inputElement.select();
    document.execCommand('copy');
}

function change_object() {
    var leng = 1;
    var changed = 0;
    while (leng > 0) {
        var ob = document.getElementsByTagName("object");
        leng = ob.length;
        for (i = 0; i < ob.length; i++) {
            var name = ob[i].name;
            var link = proxyUrl(ob[i].data);
            var div = document.getElementById('show');
            //div.innerHTML += '<video src="' + link + '" type="video/mp4"  width="100%" controls="controls" loop="-1">';
            var new_tag_p = document.createElement("p");
            new_tag_p.innerHTML += '附件：' + name + '&emsp;<a teype="button"  class="down" onclick="down_file(this)" type="' + link + '">点击下载</a>' + '&emsp;<a teype="button"  class="down" onclick="set_object(this)" type="' + link + '">在线查看</a>';
            //div.innerHTML += '<p>' + name + '&emsp;<a teype="button"  class="down" onclick="set_object(this)" type="' + link + '">点击</a>';
            div.insertBefore(new_tag_p, ob[i]);
            ob[i].remove();
            changed += 1;
            console.log(name);
            console.log(link);
        }
    }
    return changed;
}

function change_video() {
    var ob = document.getElementsByTagName("video");
    var changed = 0;
    for (i = 0; i < ob.length; i++) {
        if (ob[i].hasAttribute('controls')) {
            console.log("Pass");
        } else {
            var name = ob[i].src;
            var link = proxyUrl(ob[i].src);
            var div = document.getElementById('show');
            //div.innerHTML += '<video src="' + link + '" type="video/mp4"  width="100%" controls="controls" loop="-1">';
            var new_tag_p = document.createElement("p");
            new_tag_p.innerHTML += '附件：' + name + '&emsp;<a teype="button"  class="down" onclick="down_file(this)" type="' + link + '">点击下载</a>' + '&emsp;<a teype="button"  class="down" onclick="set_object(this)" type="' + link + '">在线查看</a>';
            //div.innerHTML += '<p>' + name + '&emsp;<a teype="button"  class="down" onclick="set_object(this)" type="' + link + '">点击</a>';
            div.insertBefore(new_tag_p, ob[i]);
            ob[i].remove();
            changed += 1;
            console.log(name);
            console.log(link);
        }

    }
    return changed;
}

function change_div() {
    var ob = document.getElementsByTagName("div");
    var changed = 0;
    for (i = 0; i < ob.length; i++) {
        if (ob[i].hasAttribute("data-type")) {
            if (ob[i].getAttribute("data-type") == "ppt") {
                var name = ob[i].getAttribute("data-name");
                var link = ob[i].getAttribute("data-url");
                var div = document.getElementById('show');
                //div.innerHTML += '<video src="' + link + '" type="video/mp4"  width="100%" controls="controls" loop="-1">';
                var new_tag_p = document.createElement("p");
                new_tag_p.innerHTML += '附件：' + name + '&emsp;<a teype="button"  class="down" onclick="down_file(this)" type="' + proxyUrl(link) + '">点击下载</a>' + '&emsp;<a teype="button"  class="down" onclick="set_ppt(this)" type="' + link + '">在线查看</a>';
                //div.innerHTML += '<p>' + name + '&emsp;<a teype="button"  class="down" onclick="set_object(this)" type="' + link + '">点击</a>';
                div.insertBefore(new_tag_p, ob[i]);
                ob[i].remove();
                changed += 1;
                //div.innerHTML += '<a teype="button"  class="down" onclick="down_file(this)" type="'+link+'">点击下载</a>'
                console.log(name);
                console.log(link);
            }
            if (ob[i].getAttribute("data-type") == "pdf") {
                var name = ob[i].getAttribute("data-name");
                var link = proxyUrl(ob[i].getAttribute("data-url"));
                var div = document.getElementById('show');
                //div.innerHTML += '<video src="' + link + '" type="video/mp4"  width="100%" controls="controls" loop="-1">';
                var new_tag_p = document.createElement("p");
                new_tag_p.innerHTML += '附件：' + name + '&emsp;<a teype="button"  class="down" onclick="down_file(this)" type="' + link + '">点击下载</a>' + '&emsp;<a teype="button"  class="down" onclick="set_pdf(this)" type="' + link + '">在线查看</a>';
                //div.innerHTML += '<p>' + name + '&emsp;<a teype="button"  class="down" onclick="set_object(this)" type="' + link + '">点击</a>';
                div.insertBefore(new_tag_p, ob[i]);
                ob[i].remove();
                changed += 1;
                //div.innerHTML += '<a teype="button"  class="down" onclick="down_file(this)" type="'+link+'">点击下载</a>'
                console.log(name);
                console.log(link);
            }
            if (ob[i].getAttribute("data-type") == "image-block") {
                console.log("sdsafd");
                ob[i].querySelector('img').setAttribute('width', '100%');
                ob[i].setAttribute('data-type', 'image-block-changed');
                ob[i].querySelector('img').src = proxyImgSrc(ob[i].querySelector('img').src);
                changed += 1;
                console.log(name);
                console.log(link);
            }

        }
        if (ob[i].hasAttribute("data-id")) {
            var name = ob[i].getAttribute("data-title");
            //div.innerHTML += '<a teype="button"  class="down" onclick="down_file(this)" type="'+link+'">点击下载</a>'
            var div = document.getElementById('show');
            //div.innerHTML += '<video src="' + link + '" type="video/mp4"  width="100%" controls="controls" loop="-1">';
            var new_tag_p = document.createElement("p");
            new_tag_p.setAttribute("class", "milky");
            new_tag_p.innerHTML += '无法查看习题：' + name;
            //div.innerHTML += '<p>' + name + '&emsp;<a teype="button"  class="down" onclick="set_object(this)" type="' + link + '">点击</a>';
            div.insertBefore(new_tag_p, ob[i]);
            ob[i].remove();
            changed += 1;
            console.log(name);
            console.log(link);
        }
    }
    return changed;
}

function sleep(time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

async function change_all() {
    $(".ball").fadeIn(500);
    //change_object();
    while (change_object() != 0) {
        console.log("ag");
    }
    await sleep(100);
    //change_video();
    while (change_video() != 0) {
        console.log("ag");
    }
    await sleep(100);
    //for (i = 1; i < 20; i++) {
    //    change_div();
    //    await sleep(50);
    //}//无动画效果の滚动到顶部 也可解决ios调用键盘之后的空白问题
    while (change_div() != 0) {
        console.log("ag");
    }
    window.scroll(0, 0);
    //有动画效果の滚动到顶部
    $("html,body").animate({
        scrollTop: 0
    }, 500);
    await sleep(50);
    //无动画效果の滚动到顶部 也可解决ios调用键盘之后的空白问题
    window.scroll(0, 0);
    //有动画效果の滚动到顶部
    $("html,body").animate({
        scrollTop: 0
    }, 500);
    $(".ball").fadeOut(500);

}

var page_json = "";
var page_name = "";
let allCourses = [];
let filteredCourses = [];

async function show_lesson() {
    allCourses = [];
    let page = 1;

    while (true) {
        try {
            const res = await $.ajax({
                url: `${window.API_BASE_URL}/SelfStudy/api/Learn/LearningCourses?page=${page}`,
                type: "get",
                dataType: "json",
                beforeSend: function (request) {
                    request.setRequestHeader("Content-Type", "application/json");
                    request.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
                }
            });

            if (res.data && res.data.length > 0) {
                allCourses = allCourses.concat(res.data);
                page++; // 请求下一页
            } else {
                break; // 数据为空，停止分页
            }
        } catch (err) {
            console.error("课程请求失败:", err);
            $("#courseGrid").html("<p class='text-danger'>加载失败，请重试。</p>");
            return;
        }
    }

    filteredCourses = allCourses;
    renderCourseCards();
}

// 渲染课程卡片
function renderCourseCards() {
    const grid = $("#courseGrid");
    grid.empty();

    if (!filteredCourses || filteredCourses.length === 0) {
        grid.html("<p class='text-muted'>暂无课程。</p>");
        return;
    }

    filteredCourses.forEach((item) => {
        const isDisabled = item.status === 0;
        let coverUrl = "";
        if (window.proxyBaseUrl) {
            coverUrl = proxyImgSrc(item.cover);
        } else {
            coverUrl = "https://zyapi.loshop.com.cn/picAgent/" + item.cover;
        }
        const progress = item.progress || 0;
        const teacher = item.userName || "未知教师";
        const subject = item.subjectName || "未知学科";

        const cardHtml = `
        <div class="col-12 col-md-6 col-lg-4">
            <div class="card shadow-sm ${isDisabled ? "opacity-50" : "hover-shadow"}" 
                style="cursor:${isDisabled ? "not-allowed" : "pointer"};"
                onclick="${isDisabled ? "" : `selectCourse(${item.id}, '${item.title.replace(/'/g, "\\'")}')`}">
                <img src="${coverUrl}" class="card-img-top" alt="封面" style="object-fit:cover; height:180px;">
                <div class="card-body">
                    <h5 class="card-title text-truncate">${item.title}${isDisabled ? "（已下架）" : ""}</h5>
                    <p class="card-text mb-1"><strong>学科：</strong>${subject}</p>
                    <p class="card-text mb-1"><strong>教师：</strong>${teacher}</p>
                    <p class="card-text mb-0"><strong>进度：</strong>${progress}%</p>
                </div>
            </div>
        </div>`;
        grid.append(cardHtml);
    });
}

// 搜索过滤
function filterCourses() {
    const keyword = $("#courseSearch").val().toLowerCase();
    filteredCourses = allCourses.filter(c => c.title.toLowerCase().includes(keyword));
    renderCourseCards();
}


function selectCourse(id, title) {
    $("#course_input").val(title);
    $("#id_input").val(id);
    $("#courseModal").modal("hide");
    window._currentShare = { type: 'course', id: id, title: title };
    $('#courseShareBtn').show();
    // 加载课程详情
    show_class();
}

function show_class() {
    const courseId = $("#id_input").val();
    if (!courseId) return;

    $.ajax({
        url: `${window.API_BASE_URL}/SelfStudy/api/Learn/CourseDetail?id=` + courseId,
        type: "get",
        dataType: "json",
        beforeSend: function (request) {
            request.setRequestHeader("Content-Type", "application/json");
            request.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
        },
        success: function (res) {
            const container = $("#cid_card");
            container.empty();

            const catalogs = res.data.catalogs;
            if (!catalogs || catalogs.length === 0) {
                container.append(`<div class="text-muted">该课程暂无章节</div>`);
                $("#cid_input").val("");
                return;
            }

            function renderChapter(chapters, parent) {
                chapters.forEach(c => {
                    const div = $("<div>").addClass("chapter-item");
                    let prefix;

                    if (c.isLeaf) {
                        prefix = ''; // 叶子章节用原点
                    } else {
                        prefix = '<span class="triangle">●</span>'; // 文件夹用三角
                        div.addClass("folder");
                    }

                    div.append(`<span class="title">${prefix} ${c.title}</span>`);

                    if (c.isLeaf) {
                        div.css("cursor", "pointer");
                        div.on("click", function (e) {
                            e.stopPropagation(); // 阻止事件冒泡到父节点
                            $("#cid_card .chapter-item").removeClass("selected");
                            $(this).addClass("selected");
                            $("#cid_input").val(c.id);
                            window._currentShare = { type: 'chapter', id: $("#id_input").val(), chapterId: c.id, title: c.title };
                            $('#courseShareBtn').show();
                            show_page();
                        });
                    } else {
                        div.css("cursor", "default");

                        // 可折叠子节点
                        if (c.children && c.children.length > 0) {
                            const childContainer = $("<div>").addClass("chapter-children");
                            div.append(childContainer);

                            div.on("click", function (e) {
                                e.stopPropagation(); // 阻止事件冒泡
                                const expanded = div.hasClass("expanded");
                                div.toggleClass("expanded");
                                childContainer.slideToggle(150);
                            });

                            renderChapter(c.children, childContainer);
                        }
                    }


                    parent.append(div);
                });
            }

            renderChapter(catalogs, container);
        },
        error: function () {
            const container = $("#cid_card");
            container.empty();
            container.append(`<div class="text-danger">章节加载失败，请重试</div>`);
            $("#cid_input").val("");
        }
    });
}






function set_ids() {
    $("#cid_input").val($("#cid_c").val());
    show_page();
}

function show_page() {
    $.ajax({
        url:
            `${window.API_BASE_URL}/SelfStudy/api/learn/readContent?catalogId=` +
            $("#cid_input").val() +
            "&courseId=" +
            $("#id_input").val(),
        type: "get",
        dataType: "json",
        beforeSend: function (request) {
            request.setRequestHeader("Content-Type", "application/json");
            request.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
        },
        success: function (res) {
            page_json = JSON.stringify(res.data.content);
            page_name = $("#course_input").val();
            const div = document.getElementById("show");
            div.replaceChildren();
            div.innerHTML += res.data.content;
            change_all();
        },
    });
}

function down_file(data) {
    let url = data.type;
    if (url && typeof url === 'string' && url.startsWith('http://')) {
        url = proxyUrl(url);
    }
    window.open(url);
    console.log(data.type);
}

function output_file(data) {
    // 要保存的字符串
    const stringData = data;
    // dada 表示要转换的字符串数据，type 表示要转换的数据格式
    const blob = new Blob([stringData], {
        type: "text/plain;charset=utf-8"
    })
    // 根据 blob生成 url链接
    const objectURL = URL.createObjectURL(blob)

    // 创建一个 a 标签Tag
    const aTag = document.createElement('a')
    // 设置文件的下载地址
    aTag.href = objectURL
    // 设置保存后的文件名称
    aTag.download = page_name + "_raw.rcf";
    // 给 a 标签添加点击事件
    aTag.click()
    // 释放一个之前已经存在的、通过调用 URL.createObjectURL() 创建的 URL 对象。
    // 当你结束使用某个 URL 对象之后，应该通过调用这个方法来让浏览器知道不用在内存中继续保留对这个文件的引用了。
    URL.revokeObjectURL(objectURL)
}

function down_adv() {
    output_file(page_json);
}

function back_to_lesson() {
    $('#lessonModal').modal('hide');
}

$('#lessonModal').modal('hide');

function go_to_picture() {
    $('#lessonModal').modal('show');
}

function set_object(data) {
    console.log(data);

    const src = data.type;

    // 清空原来的内容
    $("#show_re").find("*").remove();

    // 创建一个用于 DPlayer 的容器
    $('#show_re').append('<div id="dplayer_container"></div>');

    // 初始化 DPlayer
    const dp = new DPlayer({
        container: document.getElementById('dplayer_container'),
        autoplay: true,
        video: {
            url: src,       // 视频地址
            type: 'auto',   // 自动识别视频类型
            pic: '',        // 可选封面
        },
        loop: true,        // 循环播放
        preload: 'auto',   // 自动预加载，边下边播
    });

    go_to_picture();

    // 滚动到顶部，带动画效果
    $("html,body").animate({ scrollTop: 0 }, 500);
}


function set_ppt(data) {
    console.log(data)
    link = data.type;
    ////div.innerHTML += '<iframe src="https://view.officeapps.live.com/op/embed.aspx?src=' + link + '" width="100%" height="600"></iframe>';
    $("#show_re").find("*").remove();
    $('#show_re').append('<iframe src="https://view.officeapps.live.com/op/embed.aspx?src=' + link + '" width="100%" height="600"></iframe>');
    go_to_picture();
    window.scroll(0, 0);
    //有动画效果の滚动到顶部
    $("html,body").animate({
        scrollTop: 0
    }, 500);
}

//
function set_pdf(data) {
    console.log(data)
    link = data.type;
    //div.innerHTML += '<embed src="' + link + '" width="100%" height="1000" type="application/pdf">';
    $("#show_re").find("*").remove();

    $('#show_re').append('<iframe src="./web/viewer.html?file=' + link + '" width="100%" height="600"></iframe>');
    go_to_picture();
    window.scroll(0, 0);
    //有动画效果の滚动到顶部
    $("html,body").animate({
        scrollTop: 0
    }, 500);
}

//===============================================


// 生成 nonce
function generateNonce() {
    return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

// MD5
function md5(str) {
    return CryptoJS.MD5(str).toString().toUpperCase();
}

// 获取用户ID
async function getUserId() {
    const token = localStorage.getItem("token");
    if (!token) throw new Error("localStorage 中未找到 token");

    const url = `${window.API_BASE_URL}/api/services/app/User/GetInfoAsync`;
    const headers = {
        "Accept": "application/json, text/plain, */*",
        "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
        "Authorization": `Bearer ${token}`
    };

    const resp = await fetch(url, { method: "GET", headers });
    if (!resp.ok) throw new Error("请求用户信息失败: " + resp.status);

    const data = await resp.json();
    if (data.result && data.result.id) return String(data.result.id);
    throw new Error("无法获取用户ID: " + JSON.stringify(data));
}

// 更新 URL 预览
function updateUrlPreview() {
    const prefix = window.ossBaseUrl || "https://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/";
    const fc = document.getElementById("selectFc").value;
    const userId = document.getElementById("urlUserId").textContent;
    const nonce = document.getElementById("inputNonce").value || "自动生成";
    const fileName = document.getElementById("inputFileName").value || "文件名.ext";
    document.getElementById("urlPreview").textContent = `${prefix}${fc}${userId}${nonce}/${fileName}`;
}

// 上传文件
async function uploadFile(file, userId, fc, nonceInput, fileNameInput) {
    const V_MAP = {
        note_v2: 1, eval_v2: 2, quora_v2: 3, mistake_v2: 4,
        study_v2: 5, column_v2: 6, paper_v2: 7, revise_v2: 8,
        selection_v2: 9, manage_v2: 19
    };
    const G_MAP = { res: 1 };
    const fr = "res", ft = 2, fe = "", fo = "0";

    const nonce = nonceInput.trim() || generateNonce();
    const remoteFileName = fileNameInput.trim() || file.name;
    const ts = Date.now();
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");

    const raw_str = `${userId}+${fc}+${fr}+${ft}+${fe}+${fo}+${nonce}+${ts}`;
    const sign = md5(raw_str);

    const token = localStorage.getItem("token");
    const json_data = { fc: V_MAP[fc], fr: G_MAP[fr], ft, fe, fo, nonce, ts, sign };

    const resp = await fetch(`${window.API_BASE_URL}/api/services/app/ObjectStorage/GenerateTokenV2Async`, {
        method: "POST",
        headers: { "Accept": "application/json", "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(json_data)
    });

    const data = await resp.json();
    if (!data.result) throw new Error("获取 token 失败: " + JSON.stringify(data));
    const result = data.result;

    const client = new OSS({
        region: result.region || "oss-cn-hangzhou",
        accessKeyId: result.accessKeyId,
        accessKeySecret: result.accessKeySecret,
        stsToken: result.securityToken,
        bucket: result.bucket
    });

    const remote_file = `${fc}/${fr}/${userId}/${dateStr}/${nonce}/${remoteFileName}`;
    await client.put(remote_file, file);

    const endpoint = (result.endpoint || `https://${result.bucket}.oss-cn-hangzhou.aliyuncs.com`);
    return (endpoint.replace(/\/+$/, '') + '/' + remote_file);
}

// 页面加载时获取用户ID并更新前缀
async function loadRoot() {
    try {
        const userId = await getUserId();
        window.currentUserId = userId;
        document.getElementById("urlUserId").textContent = "/res/" + userId + "/";

        // 通过 API 获取 OSS bucket/region，构建根 URL
        await fetchOssBaseUrl(userId);
        document.getElementById("ossPrefix").textContent = window.ossBaseUrl;

        // 监听变化更新预览
        document.getElementById("inputNonce").addEventListener("input", updateUrlPreview);
        document.getElementById("inputFileName").addEventListener("input", updateUrlPreview);
        document.getElementById("selectFc").addEventListener("change", updateUrlPreview);

        updateUrlPreview();
    } catch (e) {
        console.error(e);
        document.getElementById("urlUserId").textContent = "无法获取用户ID";
        document.getElementById("ossPrefix").textContent = "获取失败";
    }
};

// 调用 GenerateTokenV2Async 获取 bucket/region 并缓存根 URL
async function fetchOssBaseUrl(userId) {
    if (window.ossBaseUrl) return;
    const token = localStorage.getItem("token");
    if (!token) throw new Error("未登录");
    const nonce = generateNonce();
    const ts = Date.now();
    const raw_str = `${userId}+note_v2+res+1++0+${nonce}+${ts}`;
    const sign = md5(raw_str);
    const resp = await fetch(`${window.API_BASE_URL}/api/services/app/ObjectStorage/GenerateTokenV2Async`, {
        method: "POST",
        headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ fc: 1, fr: 1, ft: 2, fe: "", fo: "0", nonce, ts, sign })
    });
    const data = await resp.json();
    if (!data.result) throw new Error("获取 OSS 配置失败");
    const r = data.result;
    const region = r.region || "oss-cn-hangzhou";
    const bucket = r.bucket || "ezy-sxz";
    window.ossBaseUrl = `https://${bucket}.${region}.aliyuncs.com/`;
}

// 上传按钮事件
async function uploadFileBtn() {
    const file = document.getElementById("fileInput").files[0];
    const fc = document.getElementById("selectFc").value;
    const nonce = document.getElementById("inputNonce").value;
    const fileName = document.getElementById("inputFileName").value;

    if (!file) return swal("请选择文件");
    if (!window.currentUserId) return swal("未获取用户ID，无法上传");

    const resultEl = document.getElementById("uploadResult");
    resultEl.textContent = "上传中...";
    try {
        const fullUrl = await uploadFile(file, window.currentUserId, fc, nonce, fileName);
        resultEl.innerHTML = `上传成功: <a href="${fullUrl}" target="_blank">${fullUrl}</a>`;
    } catch (e) {
        console.error(e);
        resultEl.textContent = "上传失败: " + e.message;
    }
};


// ============ 状态 ============


// ============ 获取笔记列表 ============
// 判断是否使用省锡中 special 路径
// special 路径只存在于 zyapi.loshop.com.cn（省锡中代理服务器）
function useSpecialPath() {
    const baseUrl = window.API_BASE_BASE_URL || window.API_BASE_URL;
    // special 路径只支持省锡中（通过 zyapi.loshop.com.cn 访问）
    return baseUrl && baseUrl.includes("zyapi.loshop.com.cn");
}

// 获取云笔记 API 路径（自适应：省锡中使用 special 代理，其他学校使用原路径）Resources
function getCloudNoteApiPath(endpoint, encryptedParams) {
    const specialUrl = `${window.API_BASE_URL}/special/${endpoint}?${encryptedParams}`;
    const directUrl = `${window.API_BASE_URL}/CloudNotes/api/Notes/${endpoint}?${encryptedParams}`;
    return useSpecialPath() ? specialUrl : directUrl;
}
function getCloudNoteApiPathR(endpoint, encryptedParams) {
    const specialUrl = `${window.API_BASE_URL}/special/${endpoint}?${encryptedParams}`;
    const directUrl = `${window.API_BASE_URL}/CloudNotes/api/Resources/${endpoint}?${encryptedParams}`;
    return useSpecialPath() ? specialUrl : directUrl;
}

async function loadNotes(parentId = "0") {
    const params = `parentid=${parentId}&isNoteNode=true`;
    const encryptedParams = aesEncrypt(params);
    const apiUrl = getCloudNoteApiPath("GetByParentId", encryptedParams);

    try {
        const res = await fetch(apiUrl, {
            headers: {
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });
        const json = await res.json();
        if (json.code !== 0) {
            console.error("获取笔记失败", json.msg);
            return;
        }

        const dataStr = aesDecrypt(json.data);
        const data = JSON.parse(dataStr);
        renderNotes(data.noteList);
    } catch (err) {
        console.error("请求或解密出错", err);
    }
}

// ============ 渲染笔记列表 ============
// ============ 渲染笔记列表 ============
function renderNotes(notes) {
    const container = document.getElementById("noteList");
    container.innerHTML = ""; // 清空

    if (!notes || notes.length === 0) {
        container.innerHTML = `<div class="text-center text-muted py-4">（此文件夹为空）</div>`;
        return;
    }

    // ✅ 文件夹优先 + 名字排序
    notes.sort((a, b) => {
        if (a.type === 0 && b.type !== 0) return -1;
        if (a.type !== 0 && b.type === 0) return 1;
        return a.fileName.localeCompare(b.fileName, "zh-Hans-CN");
    });

    notes.forEach(note => {
        const isFolder = note.type === 0;
        const iconPath = isFolder ? "/folder.svg" : "/note.svg";

        const item = document.createElement("a");
        item.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
        item.href = "javascript:void(0)";

        if (isFolder) {
            item.onclick = () => enterFolder(note.fileId, note.fileName);
        } else {
            item.onclick = () => noteDownload(note.fileId, note.fileName);
        }

        const safeName = (note.fileName || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        item.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${iconPath}" alt="" style="width:20px;height:20px;margin-right:8px;">
                <div>
                    <strong>${note.fileName}</strong><br>
                    <small class="text-muted">创建时间: ${note.createTime}</small>
                </div>
            </div>
            <div class="d-flex align-items-center gap-2">
                ${isFolder ? '' : `<span style="cursor:pointer;font-size:1.1rem;opacity:0.5;" title="分享" onclick="event.stopPropagation();event.preventDefault();openShareModal('note','${note.fileId}','${safeName}')">📤</span>`}
                <span class="badge bg-${isFolder ? 'secondary' : 'primary'} rounded-pill">
                    ${isFolder ? '文件夹' : '笔记'}
                </span>
            </div>
        `;

        container.appendChild(item);
    });
}

// ============ 进入文件夹 ============
function enterFolder(folderId, folderName) {
    breadcrumbStack.push({ id: folderId, name: folderName });
    updateBreadcrumb();
    loadNotes(folderId);
}

// ============ 更新面包屑 ============
function updateBreadcrumb() {
    const nav = document.getElementById("breadcrumbNav");
    nav.innerHTML = "";

    breadcrumbStack.forEach((item, index) => {
        const li = document.createElement("li");
        li.className = `breadcrumb-item ${index === breadcrumbStack.length - 1 ? 'active' : ''}`;
        li.textContent = item.name;
        li.style.cursor = "pointer";
        li.dataset.id = item.id;

        if (index !== breadcrumbStack.length - 1) {
            li.addEventListener("click", () => {
                breadcrumbStack = breadcrumbStack.slice(0, index + 1);
                updateBreadcrumb();
                loadNotes(item.id);
            });
        }

        nav.appendChild(li);
    });
}




async function fetchExams(page = 1) {
    const token = localStorage.getItem("token");
    if (!token) return alert("未找到 token，请先登录");

    currentExamPage = page;
    const skipCount = (currentExamPage - 1) * examPageSize;

    const res = await fetch(`${window.API_BASE_URL}/api/services/app/Task/GetStudentTaskListAsync`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json; charset=UTF-8'
        },
        body: JSON.stringify({
            maxResultCount: examPageSize,
            skipCount: skipCount,
            taskListType: 0
        })
    });
    const data = await res.json();
    const exams = data.result.items || [];
    totalExamCount = data.result.totalCount || 0;

    renderExamPage(exams);
    renderExamPagination();
}

function renderExamPage(exams) {
    const examList = document.getElementById('examList');
    examList.innerHTML = '';

    if (!exams.length) {
        examList.innerHTML = `<div class="text-center text-muted py-3">暂无作业任务</div>`;
        return;
    }

    exams.forEach(e => {
        const btn = document.createElement('button');
        btn.type = "button";
        btn.className = "list-group-item list-group-item-action d-flex justify-content-between align-items-center";
        btn.setAttribute("data-bs-toggle", "modal");
        btn.setAttribute("data-bs-target", "#examModal");
        btn.innerHTML = `<span>${e.examName}</span>`;
        btn.onclick = () => showExamQuestions(e.examName, e.examTaskId);
        if (e.examState == 2) { btn.classList.add('disabled'); }
        examList.appendChild(btn);
    });
}

function renderExamPagination() {
    const pagination = document.getElementById('examPagination');
    const totalPages = Math.ceil(totalExamCount / examPageSize);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    pagination.innerHTML = `
                <button class="btn btn-sm btn-outline-primary" ${currentExamPage === 1 ? 'disabled' : ''} onclick="fetchExams(${currentExamPage - 1})">上一页</button>
                <div class="d-flex align-items-center gap-1">
                    <input type="number" id="examPageInput" min="1" max="${totalPages}" value="${currentExamPage}" 
                           class="form-control form-control-sm text-center" style="width:60px;" onchange="goToExamPage(${totalPages})">
                    <span>/ ${totalPages}</span>
                </div>
                <button class="btn btn-sm btn-outline-primary" ${currentExamPage === totalPages ? 'disabled' : ''} onclick="fetchExams(${currentExamPage + 1})">下一页</button>
            `;
}

function goToExamPage(totalPages) {
    let page = parseInt(document.getElementById('examPageInput').value);
    if (isNaN(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    fetchExams(page);
}

async function showExamQuestions(examName, examId) {
    const token = localStorage.getItem("token");
    const modalLabel = document.getElementById('examModalLabel');
    const modalBody = document.getElementById('examModalBody');

    modalLabel.textContent = `${examName}`;
    window._currentShare = { type: 'evaluation', id: examId, title: examName };
    $('#examShareBtn').show();
    modalBody.innerHTML = `<div class="text-center py-3 text-muted"><div class="spinner-border text-primary" role="status"></div><div class="mt-2">加载中...</div></div>`;

    const exam = await fetchExamTask(token, examId);
    const questions = [];
    let idx = 1;

    for (const group of exam.result.groups || []) {
        for (const q of group.questions) {
            let content = await fetchQstAnswerView(q.id);

            // 删除 toolBar
            const parser = new DOMParser();
            const doc = parser.parseFromString(content, "text/html");
            doc.querySelectorAll('.toolBar').forEach(el => el.remove());

            // 题干
            const stem = doc.querySelector('.stem')?.innerHTML || '';

            // 答案
            const answerEl = doc.querySelector('.answers');
            let answerHTML = '';
            if (answerEl) {
                answerEl.querySelectorAll('h3').forEach(h => h.remove());
                answerHTML = answerEl.innerHTML.trim();
            }

            // 解析 & 知识点
            const analysisEls = doc.querySelectorAll('.analysis');
            let explanationHTML = '', knowledgeHTML = '';
            if (analysisEls.length > 0) {
                const first = analysisEls[0];
                first.querySelectorAll('h3').forEach(h => h.remove());
                explanationHTML = first.innerHTML.trim();
                if (analysisEls[1]) {
                    const second = analysisEls[1];
                    second.querySelectorAll('h3').forEach(h => h.remove());
                    knowledgeHTML = second.innerHTML.trim();
                }
            }

            questions.push({ number: idx, stem, answer: answerHTML, explanation: explanationHTML, knowledge: knowledgeHTML });
            idx++;
        }
    }

    if (!questions.length) {
        modalBody.innerHTML = `<div class="text-center text-muted py-3">没有题目</div>`;
        return;
    }

    let html = '<div class="container-fluid">';
    questions.forEach(q => {
        html += `
                    <div class="card mb-3">
                        <div class="card-header fw-bold">题目 ${q.number}</div>
                        <div class="card-body">
                            <div class="mb-2"><strong>题干:</strong><br>${q.stem}</div>
                            <div class="mb-2"><strong>答案:</strong><br>${q.answer}</div>
                            <div class="mb-2"><strong>解析:</strong><br>${q.explanation}</div>
                            <div class="mb-2"><strong>知识点:</strong><br>${q.knowledge}</div>
                        </div>
                    </div>
                `;
    });
    html += '</div>';
    modalBody.innerHTML = html;
}

async function fetchExamTask(token, examId) {
    const res = await fetch(`${window.API_BASE_URL}/api/services/app/Task/GetExamTaskAsync?id=${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

async function fetchQstAnswerView(qstId) {
    const res = await fetch(`${window.API_BASE_URL}/Question/View/${qstId}?showAnalysis=true`);
    return await res.text();
}



// 调用云笔记搜索 API（自适应）
async function searchNotes(page = 1) {
    if (searchNotesRunning) return;
    searchNotesRunning = true;
    searchKeyword = document.getElementById("note_search_input").value.trim();
    if (!searchKeyword) return alert("请输入搜索关键词");

    $("#noteSearchList").html("");
    $("#searchPagination").html("");

    try {
        // 构造完整 query 字符串
        const query = `fileName=${searchKeyword}`;
        const encryptedQuery = aesEncrypt(query);

        // 自适应：省锡中使用 special 代理，其他学校使用原路径
        const url = getCloudNoteApiPath("Search", encryptedQuery);

        const response = await fetch(url, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${localStorage.getItem("token")}`
            }
        });

        if (response.status === 401) {
            swal("身份失效，请重新登录");
            return;
        }

        let data = await response.json();
        data = JSON.parse(aesDecrypt(data.data));
        let list = data.noteList || [];

        // 只保留 type = 1 或 12
        searchResults = list.filter(item => item.type == 1 || item.type == 12);
        searchResults = shellsort(searchResults); // 按字母排序
        searchCurrentPage = page;

        renderSearchResults();
    } catch (err) {
        console.error("searchNotes 出错:", err);
    } finally {
        searchNotesRunning = false;
    }
}

function renderSearchResults() {
    const $list = $("#noteSearchList");
    if ($list.length === 0) {
        console.warn("#noteSearchList 不存在");
        return;
    }

    const start = (searchCurrentPage - 1) * searchPageSize;
    const end = start + searchPageSize;
    const pageNotes = searchResults.slice(start, end);

    console.log("pageNotes:", pageNotes);

    $list.html(""); // 先清空

    if (pageNotes.length === 0) {
        $list.html('<div class="text-center p-3">没有找到笔记</div>');
        $("#searchPagination").html("");
        return;
    }

    pageNotes.forEach(item => {
        const safeName = (item.fileName || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
        const template = `
        <a onclick="if(downloading)swal('你已经在下载一个文件，耐心等待哦');else noteDownload('${item.fileId}','${item.fileName}')"
           class="list-group-item list-group-item-action py-3 lh-tight a-note"
           aria-current="true" 
           style="background:rgba(255,255,255,0) !important;">
            <div class="d-flex w-100 align-items-center justify-content-between">
                <strong class="note-name mb-1">${item.fileName}</strong>
                <div class="d-flex align-items-center gap-2">
                    <span style="cursor:pointer;font-size:1.1rem;opacity:0.5;" title="分享" onclick="event.stopPropagation();event.preventDefault();openShareModal('note','${item.fileId}','${safeName}')">📤</span>
                    <small>${item.updateTime}</small>
                </div>
            </div>
        </a>`;
        $list.append(template);
    });

    renderSearchPagination();
}


function renderSearchPagination() {
    const totalPages = Math.ceil(searchResults.length / searchPageSize);
    if (totalPages <= 1) return;

    let html = `
    <div class="mt-3 d-flex justify-content-center align-items-center gap-3 flex-wrap">
        <button class="btn btn-sm btn-outline-primary"
                ${searchCurrentPage === 1 ? 'disabled' : ''}
                onclick="searchNotes(${searchCurrentPage - 1})">
            上一页
        </button>

        <div class="d-flex align-items-center gap-1">
            <input type="number" id="searchPageInput" min="1" max="${totalPages}" value="${searchCurrentPage}"
                   class="form-control form-control-sm text-center"
                   style="width: 60px;"
                   onchange="goToSearchPage()">
            <span>/ ${totalPages}</span>
        </div>

        <button class="btn btn-sm btn-outline-primary"
                ${searchCurrentPage === totalPages ? 'disabled' : ''}
                onclick="searchNotes(${searchCurrentPage + 1})">
            下一页
        </button>
    </div>`;

    $("#searchPagination").html(html);
}

function goToSearchPage() {
    let page = parseInt(document.getElementById('searchPageInput').value);
    const totalPages = Math.ceil(searchResults.length / searchPageSize);
    if (isNaN(page) || page < 1) page = 1;
    if (page > totalPages) page = totalPages;
    searchNotes(page);
}
function renderChangelog(data) {
    const $accordion = $("#accordionExample");
    $accordion.html(""); // 清空原有内容

    // 可选：按日期倒序排列
    data.sort((a, b) => new Date(b.date) - new Date(a.date));

    data.forEach((entry, index) => {
        const collapseId = "collapse" + index;
        const headingId = "heading" + index;

        const itemsHtml = entry.items.map(item => `<li>${item}</li>`).join("");

        const accordionItem = `
        <div class="accordion-item">
            <h2 class="accordion-header" id="${headingId}">
                <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse"
                    data-bs-target="#${collapseId}" aria-expanded="false" aria-controls="${collapseId}">
                    ${entry.date}
                </button>
            </h2>
            <div id="${collapseId}" class="accordion-collapse collapse" aria-labelledby="${headingId}"
                 data-bs-parent="#accordionExample">
                <div class="accordion-body">
                    <ul>
                        ${itemsHtml}
                    </ul>
                </div>
            </div>
        </div>`;

        $accordion.append(accordionItem);
    });
}

async function loadChangelog() {
    try {
        const res = await fetch("update.json");
        if (!res.ok) throw new Error("无法获取更新日志");
        const data = await res.json();
        renderChangelog(data);
    } catch (err) {
        console.error("加载更新日志失败:", err);
        $("#accordionExample").html('<div class="text-center text-muted py-3">无法加载更新日志</div>');
    }
}
// 返回顶部按钮

// ==================== 分享功能函数 ====================

// 当前正在创建的分享参数
var _shareData = {};

function openShareModal(resourceType, resourceId, title, chapterId) {
    _shareData = { resourceType, resourceId, title, chapterId };
    $('#shareResType').val(resourceType === 'evaluation' ? '新测评' :
        resourceType === 'quora' ? '随身答' :
        resourceType === 'course' ? '课程' :
        resourceType === 'chapter' ? '章节' :
        resourceType === 'note' ? '笔记' : resourceType);
    $('#shareTitle').val(title || '');
    $('#sharePwd').val('');
    $('#shareExpiry').val('0');
    $('#shareMaxViews').val('0');
    $('#shareResultBox').hide();
    $('#shareCreateBtn').prop('disabled', false).text('生成分享链接');
    $('#shareCreateModal').modal('show');
}

async function createShare() {
    const btn = $('#shareCreateBtn');
    btn.prop('disabled', true).text('生成中...');
    $('#shareResultBox').hide();

    try {
        const resp = await fetch(`${window.SHARE_SERVER}/api/share/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                api_base: window.API_BASE_URL,
                token: localStorage.getItem('token'),
                resource_type: _shareData.resourceType,
                resource_id: _shareData.resourceId,
                chapter_id: _shareData.chapterId || '',
                title: $('#shareTitle').val() || _shareData.title,
                password: $('#sharePwd').val(),
                expires_hours: parseInt($('#shareExpiry').val()) || 0,
                max_views: parseInt($('#shareMaxViews').val()) || 0,
            })
        });
        const data = await resp.json();
        if (!data.success) { swal('创建失败: ' + data.error); btn.prop('disabled', false).text('生成分享链接'); return; }

        // 分享链接统一指向 index.html
        const link = `${location.origin}${location.pathname.replace(/\/[^/]*$/, '/index.html')}#share=${data.share_id}`;
        $('#shareLinkInput').val(link);
        $('#shareResultBox').show();
        btn.text('已生成');
    } catch (e) {
        console.error(e);
        swal('无法连接分享服务器 (' + window.SHARE_SERVER + ')');
        btn.prop('disabled', false).text('生成分享链接');
    }
}

function copyShareLink() {
    const input = $('#shareLinkInput');
    input.select();
    document.execCommand('copy');
    swal({ title: '已复制', text: '分享链接已复制到剪贴板', timer: 1500 });
}

async function loadSharedContent(shareId) {
    try {
        // 先获取分享信息
        const infoResp = await fetch(`${window.SHARE_SERVER}/api/share/${shareId}/info`);
        const info = await infoResp.json();
        if (!info.success) { swal('分享不存在或已过期: ' + info.error); return; }

        // 如果需要密码
        let password = '';
        if (info.has_password) {
            password = prompt('此分享需要密码，请输入:') || '';
            if (!password) return;
        }

        // 获取内容
        const resp = await fetch(`${window.SHARE_SERVER}/api/share/${shareId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        const data = await resp.json();
        if (!data.success) { swal('获取分享失败: ' + data.error); return; }

        // 显示内容
        showSharedContent(data.content);
    } catch (e) {
        console.error('加载分享失败:', e);
        swal('无法连接到分享服务器 (' + window.SHARE_SERVER + ')');
    }
}

// 显示分享内容（复用错题弹窗结构）
async function showSharedContent(content) {
    const meta = content._meta || {};
    var _rendered = false;  // 标志：是否已有分支成功渲染（避免 :visible 被父级 modal 隐藏误判）
    // 复用 #screenshotModal
    $("#screenshotImg").attr("src", "");
    $("#mistakeQstCard").hide(); $("#mistakeQstBody").html("");
    $("#mistakeAnsCard").hide(); $("#mistakeAnsBody").html("");
    $("#mistakeExpCard").hide(); $("#mistakeExpBody").html("");
    $("#mistakeNoteCard").hide();
    $("#mistakePicCard").hide(); $("#mistakePicBody").html("");
    $(".modal-title").text(meta.title || '分享内容');

    // 题干
    if (content.stem) {
        $("#mistakeQstBody").html(content.stem);
        $("#mistakeQstCard").show();
        _rendered = true;
    }
    // 答案
    if (content.answers) {
        $("#mistakeAnsBody").html(content.answers);
        $("#mistakeAnsCard").show();
        _rendered = true;
    }
    // 解析
    if (content.analysis && content.analysis.length > 0) {
        $("#mistakeExpBody").html(content.analysis.join('<hr>'));
        $("#mistakeExpCard").show();
        _rendered = true;
    }
    // 笔记截图（server 端已解压 zip 存为 base64 data URL）
    if (content.note_screenshot) {
        $("#screenshotImg").attr("src", content.note_screenshot);
        $("#mistakeNoteCard").show();
        _rendered = true;
    }
    // 图片笔记
    if (content.pictureNote && content.pictureNote.length > 0) {
        let picHtml = '<div class="row g-2">';
        content.pictureNote.forEach(url => {
            picHtml += `<div class="col-6 col-md-4"><img src="${url}" class="img-fluid rounded border" style="cursor:pointer;" onclick="window.open('${url}')" loading="lazy"></div>`;
        });
        picHtml += '</div>';
        $("#mistakePicBody").html(picHtml);
        $("#mistakePicCard").show();
        _rendered = true;
    }
    // 新测评（多题目）
    if (meta.resource_type === 'evaluation' && content.questionUrls && content.questionUrls.length > 0) {
        if (content.examName) $(".modal-title").text(content.examName);
        $("#mistakeQstBody").html('<div class="text-center py-3 text-muted"><div class="spinner-border text-primary" role="status"></div><div class="mt-2">加载题目中...</div></div>');
        $("#mistakeQstCard").show();
        $("#mistakeQstCard .card-header").text('新测评');
        $("#screenshotModal").modal("show");
        loadEvaluationQuestions(content.questionUrls);
        return;  // 异步渲染完成后会填充内容
    }
    // 随身答对话
    if (meta.resource_type === 'quora' && content.items) {
        let msgsHtml = '<div style="max-height:500px;overflow:auto;">';
        (content.items || []).forEach(m => {
            const bg = (m.senderType === 1 || m.role === 'user') ? 'bg-primary text-white' : 'bg-light';
            msgsHtml += `<div class="mb-2"><div class="d-inline-block ${bg} rounded-3 px-3 py-2">${m.content || m.text || ''}</div></div>`;
        });
        msgsHtml += '</div>';
        $("#mistakeQstBody").html(msgsHtml);
        $("#mistakeQstCard").show();
        _rendered = true;
    }
    // 云笔记 / 笔记文件夹（复制 noteDownload 的渲染逻辑）
    if ((meta.resource_type === 'note' || meta.resource_type === 'note_folder') && content.resourceList && content.resourceList.length > 0) {
        if (content.fileName) $(".modal-title").text(content.fileName);
        window._shareNotePages = buildShareNotePages(content.resourceList);
        window._shareNoteIdx = 0;
        $("#mistakeQstCard .card-header").text('云笔记');
        $("#mistakeQstCard").show();
        renderShareNotePage();
        return;  // 跳过末尾 .modal("show")，由 renderShareNotePage 控制显示
    }
    // 课程/章节（完全复制 show_page + change_all 渲染逻辑）
    if (meta.resource_type === 'course' || meta.resource_type === 'chapter') {
        var courseTitle = content.title || meta.title || '';
        var courseBodyHtml = '';
        if (courseTitle) courseBodyHtml += '<h5>' + courseTitle + '</h5>';
        if (content.description) courseBodyHtml += '<p class="text-muted">' + content.description + '</p>';
        if (content.content) courseBodyHtml += '<div id="shareCourseContent">' + content.content + '</div>';
        if (courseBodyHtml) {
            $("#mistakeQstBody").html(courseBodyHtml);
            $("#mistakeQstCard").show();
            $("#mistakeQstCard .card-header").text('课程内容');
            _rendered = true;
            setTimeout(function() { applyShareCourseTransforms(); }, 50);
        }
    }
    // 兜底：只有前面没有任何分支命中时才显示 JSON
    if (!_rendered) {
        $("#mistakeQstBody").html('<pre class="json-view">' + JSON.stringify(content, null, 2) + '</pre>');
        $("#mistakeQstCard").show();
    }

    $("#screenshotModal").modal("show");
}

async function loadEvaluationQuestions(urls) {
    try {
        const promises = urls.map(async (url) => {
            const resp = await fetch(url);
            const html = await resp.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, "text/html");
            doc.querySelectorAll('.toolBar').forEach(el => el.remove());
            const stem = doc.querySelector('.stem')?.innerHTML || '';
            const answerEl = doc.querySelector('.answers');
            let answerHTML = '';
            if (answerEl) {
                answerEl.querySelectorAll('h3').forEach(h => h.remove());
                answerHTML = answerEl.innerHTML.trim();
            }
            const analysisEls = doc.querySelectorAll('.analysis');
            let explanationHTML = '', knowledgeHTML = '';
            if (analysisEls.length > 0) {
                const first = analysisEls[0];
                first.querySelectorAll('h3').forEach(h => h.remove());
                explanationHTML = first.innerHTML.trim();
                if (analysisEls[1]) {
                    const second = analysisEls[1];
                    second.querySelectorAll('h3').forEach(h => h.remove());
                    knowledgeHTML = second.innerHTML.trim();
                }
            }
            return { stem, answerHTML, explanationHTML, knowledgeHTML };
        });
        const questions = await Promise.all(promises);
        let qHtml = '<div class="container-fluid">';
        questions.forEach((q, idx) => {
            qHtml += `<div class="card mb-3"><div class="card-header fw-bold">题目 ${idx + 1}</div><div class="card-body">`;
            if (q.stem) qHtml += `<div class="mb-2"><strong>题干:</strong><br>${q.stem}</div>`;
            if (q.answerHTML) qHtml += `<div class="mb-2"><strong>答案:</strong><br>${q.answerHTML}</div>`;
            if (q.explanationHTML) qHtml += `<div class="mb-2"><strong>解析:</strong><br>${q.explanationHTML}</div>`;
            if (q.knowledgeHTML) qHtml += `<div class="mb-2"><strong>知识点:</strong><br>${q.knowledgeHTML}</div>`;
            qHtml += '</div></div>';
        });
        qHtml += '</div>';
        $("#mistakeQstBody").html(qHtml);
    } catch (e) {
        console.error(e);
        $("#mistakeQstBody").html('<div class="alert alert-danger">加载题目失败: ' + e.message + '</div>');
    }
}

// ---- 分享笔记分页渲染（复制 noteDownload 逻辑） ----
function buildShareNotePages(resourceList) {
    const pageMap = {};
    const IMG_RE = /\.(jpg|jpeg|png|webp|gif|bmp|svg)$/i;
    for (let i = 0; i < resourceList.length; i++) {
        const item = resourceList[i];
        const ossUrl = item.ossImageUrl || item.url || '';
        if (!ossUrl || !IMG_RE.test(ossUrl)) continue;  // 非图片跳过
        const page = (item.pageIndex || 0) + 1;
        if (!pageMap[page]) pageMap[page] = { originals: [] };
        const fullUrl = ossUrl.startsWith('http')
            ? (window.proxyUrl ? window.proxyUrl(ossUrl) : ossUrl)
            : (window.proxyUrl ? window.proxyUrl('http://friday-note.oss-cn-hangzhou.aliyuncs.com/' + ossUrl) : 'http://friday-note.oss-cn-hangzhou.aliyuncs.com/' + ossUrl);
        const imgSrc = ossUrl.startsWith('http')
            ? (window.proxyImgSrc ? window.proxyImgSrc(ossUrl) : ossUrl)
            : (window.proxyImgSrc ? window.proxyImgSrc('http://friday-note.oss-cn-hangzhou.aliyuncs.com/' + ossUrl) : 'http://friday-note.oss-cn-hangzhou.aliyuncs.com/' + ossUrl);
        if (item.resourceType == 2) {
            pageMap[page].thumbnail = { url: fullUrl, imgSrc: imgSrc };
        } else {
            pageMap[page].originals.push({ url: fullUrl, imgSrc: imgSrc, ext: ossUrl.split('.').pop() });
        }
    }
    const pages = Object.keys(pageMap).sort((a, b) => a - b);
    return pages.map(p => pageMap[p]);
}

function renderShareNotePage() {
    const pages = window._shareNotePages || [];
    const idx = window._shareNoteIdx || 0;
    if (pages.length === 0) {
        $("#mistakeQstBody").html('<p class="text-muted text-center py-4">无页面内容</p>');
        $("#screenshotModal").modal("show");
        return;
    }
    const page = pages[idx];
    const pageNum = idx + 1;
    let html = `<div class="d-flex justify-content-between align-items-center mb-3">
        <button class="btn btn-sm btn-outline-primary" ${idx === 0 ? 'disabled' : ''} onclick="window._shareNoteIdx--;renderShareNotePage();">上一页</button>
        <span class="text-muted">第 ${pageNum} / ${pages.length} 页</span>
        <button class="btn btn-sm btn-outline-primary" ${idx === pages.length - 1 ? 'disabled' : ''} onclick="window._shareNoteIdx++;renderShareNotePage();">下一页</button>
    </div>`;

    // 缩略图
    if (page.thumbnail) {
        html += `<div class="text-center mb-3">
            <img src="${page.thumbnail.imgSrc || page.thumbnail.url}" class="img-fluid rounded" style="max-width:80%;max-height:350px;object-fit:contain;box-shadow:0 2px 8px #ccc;" alt="页面总览">
        </div>`;
    }
    // 原图
    if (page.originals && page.originals.length > 0) {
        html += '<div class="d-flex flex-wrap justify-content-center gap-3">';
        page.originals.forEach((orig, j) => {
            html += `<img src="${orig.imgSrc || orig.url}" class="img-fluid rounded" style="max-height:200px;object-fit:contain;box-shadow:0 1px 4px #bbb;cursor:pointer;" onclick="window.open('${orig.url}')" loading="lazy" alt="原图${j + 1}">`;
        });
        html += '</div>';
    }

    $("#mistakeQstBody").html(html);
    $("#screenshotModal").modal("show");
}

// ---- 分享课程/章节 DOM 变换（复制 change_all 逻辑） ----
function applyShareCourseTransforms() {
    var container = document.getElementById('shareCourseContent');
    if (!container) return;
    changeShareObjects(container);
    changeShareVideos(container);
    changeShareDivs(container);
}

function changeShareObjects(container) {
    var objs = container.getElementsByTagName('object');
    while (objs.length > 0) {
        var obj = objs[0];
        var name = obj.name || '';
        var link = obj.data || '';
        var p = document.createElement('p');
        p.innerHTML = '附件：' + name + ' <a href="' + link + '" target="_blank">点击下载</a>';
        obj.parentNode.insertBefore(p, obj);
        obj.remove();
    }
}

function changeShareVideos(container) {
    var vids = container.getElementsByTagName('video');
    for (var i = vids.length - 1; i >= 0; i--) {
        var vid = vids[i];
        if (!vid.hasAttribute('controls')) {
            var link = vid.src || '';
            var p = document.createElement('p');
            p.innerHTML = '视频附件：<a href="' + link + '" target="_blank">点击下载</a>';
            vid.parentNode.insertBefore(p, vid);
            vid.remove();
        }
    }
}

function changeShareDivs(container) {
    var divs = container.getElementsByTagName('div');
    for (var i = divs.length - 1; i >= 0; i--) {
        var d = divs[i];
        if (d.hasAttribute('data-type')) {
            var type = d.getAttribute('data-type');
            if (type === 'ppt' || type === 'pdf') {
                var name = d.getAttribute('data-name') || '';
                var link = d.getAttribute('data-url') || '';
                var p = document.createElement('p');
                p.innerHTML = '附件：' + name + ' <a href="' + link + '" target="_blank">点击下载</a>';
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
    var imgs = container.getElementsByTagName('img');
    for (var j = 0; j < imgs.length; j++) {
        if (!imgs[j].hasAttribute('width')) imgs[j].style.maxWidth = '100%';
    }
}






