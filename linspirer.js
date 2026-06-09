// ==================== 领创 (Linspirer) 功能模块 ====================
// 独立于中育功能，仅共享用户名

(() => {

// ==================== 常量配置 ====================
const LINSPIRER_KEY = CryptoJS.enc.Utf8.parse("1191ADF18489D8DA");
const LINSPIRER_IV = CryptoJS.enc.Utf8.parse("5E9B755A8B674394");
const LINSPIRER_API_BASE = "https://zytb-linspirer-api.loshop.com.cn";
const LINSPIRER_API = LINSPIRER_API_BASE + "/public-interface.php";
const CLIENT_VERSION = "zhongyukejiao_hem_6.10.004.6";
const FIXED_UUID = "40E06F51-30D0-D6AD-7F7D-008AD0ADC570";

// 当前会话状态
let linspirerState = {
    swdid: "",
    account: "",
    model: "",
    studentId: null,
    apps: [],
    loggedIn: false,
};

// ==================== AES-CBC 加解密 ====================
function linspirerEncrypt(text) {
    const encrypted = CryptoJS.AES.encrypt(text, LINSPIRER_KEY, {
        iv: LINSPIRER_IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return encrypted.toString();
}

function linspirerDecrypt(b64text) {
    const decrypted = CryptoJS.AES.decrypt(b64text, LINSPIRER_KEY, {
        iv: LINSPIRER_IV,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
    });
    return decrypted.toString(CryptoJS.enc.Utf8);
}

// ==================== API 调用 ====================
async function linspirerCall(method, paramsObj) {
    const paramsJson = JSON.stringify(paramsObj);
    const envelope = {
        id: 1,
        "!version": 6,
        jsonrpc: "2.0",
        is_encrypt: true,
        client_version: CLIENT_VERSION,
        method: method,
        params: linspirerEncrypt(paramsJson)
    };

    const resp = await fetch(LINSPIRER_API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envelope)
    });

    if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    const respText = await resp.text();
    console.log("[Linspirer] 原始响应:", respText);
    let result;
    try {
        const decrypted = linspirerDecrypt(respText.trim());
        console.log("[Linspirer] 解密后:", decrypted);
        result = JSON.parse(decrypted);
    } catch {
        console.log("[Linspirer] 明文响应:", respText);
        result = JSON.parse(respText);
    }

    if (result.code !== 0) {
        throw new Error(result.msg || result.message || JSON.stringify(result));
    }

    return result;
}

// ==================== 业务接口 ====================

// 绑定设备
async function linspirerBindDevice(swdid, account, model) {
    const deviceInfo = {
        brand: "",
        deviceid: "",
        email: account,
        isrooted: false,
        model: model,
        romavailablesize: 0,
        romtotalsize: 0,
        romversion: "",
        simserialnumber: "unknown",
        swdid: swdid,
        systemversion: "",
        token: "",
        wifimacaddress: ""
    };
    return await linspirerCall("com.linspirer.device.setdevice", deviceInfo);
}

// 获取所有应用
async function linspirerGetAllApps(swdid, account, model) {
    const inner = {
        swdid: swdid,
        email: account,
        model: model,
        launcher_version: CLIENT_VERSION
    };
    const result = await linspirerCall("com.linspirer.tactics.gettactics", inner);
    const data = result.data || {};

    const apps1 = (data.app_tactics && data.app_tactics.applist) || [];
    const apps2 = data.interest_applist || [];

    // 添加来源标识
    apps1.forEach(a => a._source = "策略应用");
    apps2.forEach(a => a._source = "兴趣应用");

    return [...apps1, ...apps2];
}

// 获取应用详情
async function linspirerGetAppDetail(swdid, account, model, appid) {
    const inner = {
        swdid: swdid,
        email: account,
        model: model,
        launcher_version: CLIENT_VERSION,
        appid: appid
    };
    return await linspirerCall("com.linspirer.app.getdetail", inner);
}

// 获取用户信息（用于密码计算）
async function linspirerGetUserInfo(swdid, account, model) {
    const inner = {
        swdid: swdid,
        email: account,
        model: model,
        launcher_version: CLIENT_VERSION
    };
    const result = await linspirerCall("com.linspirer.user.getuserinfo", inner);
    return result.data;
}

// ==================== 密码计算 ====================
async function linspirerCalcPassword(swdid, account, model) {
    if (!swdid || swdid === "unknown") {
        return "unknown";
    }

    // 获取 student_id
    let studentId = linspirerState.studentId;
    if (!studentId) {
        try {
            const userInfo = await linspirerGetUserInfo(swdid, account, model);
            studentId = String(userInfo.id);
            linspirerState.studentId = studentId;
        } catch (e) {
            // 如果获取失败，尝试不用 studentId 计算
            studentId = null;
        }
    }

    return adminCode(swdid, studentId);
}

function adminCode(deviceId, studentId) {
    if (!deviceId || deviceId === "unknown") return "unknown";

    // yyyyMMdd
    const now = new Date();
    const dateStr = now.getFullYear() +
        String(now.getMonth() + 1).padStart(2, '0') +
        String(now.getDate()).padStart(2, '0');

    // seed = date + deviceId + fixedUUID + studentId
    let seed = dateStr + deviceId + FIXED_UUID;
    if (studentId) {
        seed += studentId;
    }

    // MD5
    const md5Hex = CryptoJS.MD5(seed).toString();

    // last 8 hex → decimal
    const last8Hex = md5Hex.slice(-8);
    let decStr = String(parseInt(last8Hex, 16));

    // last 8 decimal digits
    if (decStr.length > 8) {
        decStr = decStr.slice(-8);
    }

    // first 6 digits
    return decStr.length >= 6 ? decStr.slice(0, 6) : "unknown";
}

// 不联网的密码计算（需要预先获取 studentId）
function linspirerCalcPasswordOffline(swdid) {
    return adminCode(swdid, linspirerState.studentId);
}

// ==================== UI 函数 ====================

// Tab 初始化入口
window.linspirerInit = function () {
    // 自动填充用户名（从中育登录信息）
    const zyUserName = localStorage.getItem("userName") || "";
    const zyRealName = localStorage.getItem("realName") || "";

    if (zyUserName) {
        document.getElementById("linspirer_account").value = zyUserName;
    }
    if (zyRealName) {
        document.getElementById("linspirer_welcome").textContent = "当前中育用户: " + zyRealName;
        document.getElementById("linspirer_welcome").style.display = "";
    }

    // 恢复上次的 session
    const savedSwdid = localStorage.getItem("linspirer_swdid") || "";
    const savedModel = localStorage.getItem("linspirer_model") || "";
    if (savedSwdid) document.getElementById("linspirer_swdid").value = savedSwdid;
    if (savedModel) document.getElementById("linspirer_model").value = savedModel;
    if (!zyUserName && savedSwdid) {
        document.getElementById("linspirer_account").value = localStorage.getItem("linspirer_account") || "";
    }

    // 如果之前登录过，尝试恢复
    if (linspirerState.loggedIn && linspirerState.apps.length > 0) {
        renderAppList(linspirerState.apps);
    }
};

// 登录 / 绑定设备
window.linspirerLogin = async function () {
    const swdid = document.getElementById("linspirer_swdid").value.trim();
    const account = document.getElementById("linspirer_account").value.trim();
    const model = document.getElementById("linspirer_model").value.trim();

    if (!swdid || !account || !model) {
        showLinspirerError("请填写设备号、用户名和设备型号");
        return;
    }

    const btn = document.getElementById("linspirerLoginBtn");
    const statusEl = document.getElementById("linspirerStatus");

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 正在绑定...';
    statusEl.innerHTML = "";

    try {
        // 绑定设备
        await linspirerBindDevice(swdid, account, model);
        statusEl.innerHTML = '<span class="text-success">设备绑定成功，正在获取应用列表...</span>';

        // 获取应用列表
        const apps = await linspirerGetAllApps(swdid, account, model);

        // 保存状态
        linspirerState.swdid = swdid;
        linspirerState.account = account;
        linspirerState.model = model;
        linspirerState.apps = apps;
        linspirerState.loggedIn = true;
        linspirerState.studentId = null; // 重置，需要时再获取

        localStorage.setItem("linspirer_swdid", swdid);
        localStorage.setItem("linspirer_account", account);
        localStorage.setItem("linspirer_model", model);

        statusEl.innerHTML = `<span class="text-success">获取成功，共 ${apps.length} 个应用</span>`;
        renderAppList(apps);

    } catch (e) {
        showLinspirerError("操作失败: " + e.message);
        console.error("Linspirer login error:", e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = "登录并获取应用";
    }
};

// 代理图标 URL（cloud.linspirer.com 的静态资源通过 nginx 代理）
function proxyUrl(url) {
    if (!url) return "";
    return url
        .replace("http://cloud.linspirer.com:880", LINSPIRER_API_BASE)
        .replace("https://cloud.linspirer.com:883", LINSPIRER_API_BASE);
}

// 渲染应用列表
function renderAppList(apps) {
    const container = document.getElementById("linspirerAppList");
    if (!container) return;

    if (!apps || apps.length === 0) {
        container.innerHTML = '<div class="text-center text-muted py-4">暂无应用</div>';
        return;
    }

    let html = "";
    apps.forEach((app, index) => {
        const sourceBadge = app._source === "策略应用"
            ? '<span class="badge bg-primary">策略</span>'
            : '<span class="badge bg-warning text-dark">兴趣</span>';

        const appName = app.name || app.appname || "未知应用";
        const appPkg = app.packagename || app.pkg || "";
        const appId = app.id || app.appid || "";

        html += `
        <div class="col-12 col-sm-6 col-lg-4 col-xl-3 mb-3" id="linspirer-card-${index}">
            <div class="card h-100 shadow-sm">
                <div class="card-body d-flex flex-column">
                    <div class="d-flex align-items-center mb-2">
                        <div class="me-2 linspirer-icon-box" style="width:48px;height:48px;background:#f0f0f0;border-radius:10px;display:flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;">
                            <span style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;color:#999;">📱</span>
                        </div>
                        <div class="flex-grow-1" style="min-width:0;">
                            <h6 class="card-title mb-0 text-truncate" title="${appName}">${appName}</h6>
                            ${sourceBadge}
                        </div>
                    </div>
                    ${appPkg ? `<small class="text-muted text-truncate mb-2" title="${appPkg}">${appPkg}</small>` : '<div class="mb-2"></div>'}
                    <div class="mt-auto d-flex gap-1">
                        <button class="btn btn-outline-info btn-sm flex-grow-1" onclick="linspirerViewApp('${appId}')">详情</button>
                        <button class="btn btn-success btn-sm flex-grow-1" onclick="linspirerDownloadApp('${appId}', '${appName.replace(/'/g, "\\'")}')">下载</button>
                    </div>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = `<div class="row g-2">${html}</div>`;
    document.getElementById("linspirerResultArea").style.display = "";

    // 异步加载图标（gettactics 列表不含 iconpath，需要逐个 getdetail）
    loadAppIcons(apps);
}

// 异步逐个获取应用详情以加载图标
async function loadAppIcons(apps) {
    const s = linspirerState;
    for (let i = 0; i < apps.length; i++) {
        const app = apps[i];
        const appId = app.id || app.appid || "";
        if (!appId) continue;

        try {
            const detail = await linspirerGetAppDetail(s.swdid, s.account, s.model, appId);
            const data = detail.data || detail;
            const iconUrl = proxyUrl(data.iconpath || data.icon || "");

            if (iconUrl) {
                const card = document.getElementById(`linspirer-card-${i}`);
                if (card) {
                    const iconBox = card.querySelector(".linspirer-icon-box");
                    if (iconBox) {
                        iconBox.innerHTML = `<img src="${iconUrl}" alt="" style="max-width:100%;max-height:100%;object-fit:contain;"
                            onerror="this.parentElement.innerHTML='<span style=\\'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:20px;color:#999;\\'>📱</span>'">`;
                    }
                }
            }
        } catch (e) {
            console.warn("[Linspirer] 图标加载失败:", app.name, e.message);
        }
    }
}

// 查看应用详情
window.linspirerViewApp = async function (appId) {
    const s = linspirerState;
    if (!s.loggedIn) return;

    const modal = new bootstrap.Modal(document.getElementById("linspirerDetailModal"));
    const body = document.getElementById("linspirerDetailBody");
    body.innerHTML = '<div class="text-center py-4"><div class="spinner-border text-primary"></div><p class="mt-2">加载中...</p></div>';
    modal.show();

    try {
        const detail = await linspirerGetAppDetail(s.swdid, s.account, s.model, appId);
        const data = detail.data || detail;
        const name = data.name || data.appname || "未知";
        const pkg = data.packagename || data.pkg || "";
        const version = data.version || data.appversion || "";
        const desc = data.description || data.desc || "无描述";
        const icon = proxyUrl(data.iconpath || data.icon || data.appicon || "");
        const downloadUrl = data.path ? proxyUrl(data.path + linspirerState.swdid) : "";

        body.innerHTML = `
        <div class="text-center mb-3">
            <img src="${icon}" alt="${name}" style="width:80px;height:80px;object-fit:contain;border-radius:16px;background:#f0f0f0;"
                onerror="this.style.display='none'">
            ${!icon ? '<div style="width:80px;height:80px;display:inline-flex;align-items:center;justify-content:center;font-size:32px;background:#f0f0f0;border-radius:16px;">📱</div>' : ''}
        </div>
        <h5 class="text-center">${name}</h5>
        ${pkg ? `<p class="text-center text-muted small">${pkg}</p>` : ''}
        ${version ? `<p class="text-center"><span class="badge bg-secondary">v${version}</span></p>` : ''}
        <hr>
        <h6>应用描述</h6>
        <p class="text-muted">${desc}</p>
        ${downloadUrl ? `<div class="text-center mt-3"><button class="btn btn-success" onclick="linspirerDownloadApp('${appId}', '${name.replace(/'/g, "\\'")}')">下载APK</button></div>` : '<p class="text-warning text-center">暂无下载链接</p>'}
        `;
    } catch (e) {
        body.innerHTML = `<div class="alert alert-danger">获取详情失败: ${e.message}</div>`;
    }
};

// 下载应用（download.php 会 302 重定向到实际文件）
window.linspirerDownloadApp = async function (appId, appName) {
    const s = linspirerState;
    if (!s.loggedIn) return;

    try {
        const detail = await linspirerGetAppDetail(s.swdid, s.account, s.model, appId);
        const data = detail.data || detail;
        const downloadUrl = data.path ? data.path + s.swdid : "";

        if (!downloadUrl) {
            alert("该应用没有下载链接");
            return;
        }

        const finalUrl = proxyUrl(downloadUrl);
        console.log("[Linspirer] 下载链接:", finalUrl);

        // 弹窗显示 URL 让用户复制（兼容所有端）
        showDownloadUrlModal(appName, finalUrl);
    } catch (e) {
        alert("下载失败: " + e.message);
        console.error("Linspirer download error:", e);
    }
};

// 移动端下载 URL 弹窗
function showDownloadUrlModal(appName, url) {
    const existing = document.getElementById("linspirerDownloadUrlModal");
    if (existing) existing.remove();

    const modal = document.createElement("div");
    modal.id = "linspirerDownloadUrlModal";
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;";
    modal.innerHTML = `
        <div style="background:#fff;border-radius:12px;padding:24px;max-width:90%;width:420px;box-shadow:0 8px 32px rgba(0,0,0,0.3);">
            <h5 style="margin-bottom:4px;">${appName}</h5>
            <p style="color:#666;font-size:13px;margin-bottom:12px;">复制以下链接到浏览器打开下载</p>
            <div style="display:flex;gap:8px;">
                <textarea id="linspirerCopyInput" readonly rows="3"
                    style="flex:1;padding:8px 12px;border:1px solid #ddd;border-radius:6px;font-size:12px;word-break:break-all;resize:none;">${url}</textarea>
                <button id="linspirerCopyBtn"
                    style="padding:8px 16px;background:#0d6efd;color:#fff;border:none;border-radius:6px;white-space:nowrap;font-size:14px;align-self:flex-start;">复制</button>
            </div>
            <button style="margin-top:12px;width:100%;padding:8px;background:#f0f0f0;border:none;border-radius:6px;font-size:14px;"
                onclick="document.getElementById('linspirerDownloadUrlModal').remove()">关闭</button>
            <a href="${url}" download="${appName}.apk" target="_blank"
                style="display:block;margin-top:8px;text-align:center;color:#0d6efd;font-size:13px;text-decoration:none;">直接下载</a>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById("linspirerCopyBtn").onclick = function () {
        const input = document.getElementById("linspirerCopyInput");
        navigator.clipboard.writeText(input.value).then(() => {
            this.textContent = "已复制!";
            this.style.background = "#198754";
        }).catch(() => {
            input.select();
            document.execCommand("copy");
            this.textContent = "已复制!";
            this.style.background = "#198754";
        });
    };

    modal.onclick = function (e) {
        if (e.target === modal) modal.remove();
    };
}

// 密码计算
window.linspirerCalcPwd = async function () {
    const swdid = document.getElementById("linspirer_pwd_swdid").value.trim() || linspirerState.swdid;
    const account = document.getElementById("linspirer_pwd_account").value.trim() || linspirerState.account;
    const model = document.getElementById("linspirer_pwd_model").value.trim() || linspirerState.model;

    const resultEl = document.getElementById("linspirerPwdResult");
    const btn = document.getElementById("linspirerPwdBtn");

    if (!swdid) {
        resultEl.innerHTML = '<span class="text-danger">请先填写设备号</span>';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 计算中...';
    resultEl.innerHTML = "";

    try {
        let password;
        if (account && model) {
            password = await linspirerCalcPassword(swdid, account, model);
        } else {
            // 仅用设备号离线计算（需要之前获取过 studentId）
            password = linspirerCalcPasswordOffline(swdid);
        }

        resultEl.innerHTML = `
        <div class="alert alert-success mb-0">
            <h5 class="mb-1">管理员密码</h5>
            <h2 class="mb-0 font-monospace" style="letter-spacing:4px;">${password}</h2>
            <small class="text-muted">日期: ${new Date().toLocaleDateString()}</small>
        </div>`;
    } catch (e) {
        resultEl.innerHTML = `<div class="alert alert-danger mb-0">计算失败: ${e.message}</div>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = "计算密码";
    }
};

// 快捷计算（使用已登录的设备信息）
window.linspirerQuickCalcPwd = async function () {
    const s = linspirerState;
    if (!s.loggedIn) {
        document.getElementById("linspirerPwdResult").innerHTML = '<span class="text-warning">请先在"应用管理"中登录</span>';
        return;
    }

    const resultEl = document.getElementById("linspirerPwdResult");
    resultEl.innerHTML = '<span class="text-info">计算中...</span>';

    try {
        const password = await linspirerCalcPassword(s.swdid, s.account, s.model);
        resultEl.innerHTML = `
        <div class="alert alert-success mb-0">
            <h5 class="mb-1">管理员密码</h5>
            <h2 class="mb-0 font-monospace" style="letter-spacing:4px;">${password}</h2>
            <small class="text-muted">设备号: ${s.swdid} | 日期: ${new Date().toLocaleDateString()}</small>
        </div>`;
    } catch (e) {
        resultEl.innerHTML = `<div class="alert alert-danger mb-0">计算失败: ${e.message}</div>`;
    }
};

// 显示错误
function showLinspirerError(msg) {
    const statusEl = document.getElementById("linspirerStatus");
    if (statusEl) {
        statusEl.innerHTML = `<span class="text-danger">${msg}</span>`;
    }
}

// ==================== 全局导出 ====================
window.linspirerState = linspirerState;
window.linspirerCalcPasswordOffline = linspirerCalcPasswordOffline;

})();
