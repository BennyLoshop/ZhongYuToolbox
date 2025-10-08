(() => {
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
        var ezyToken = localStorage.getItem("token");
        if (JSON.parse(atob(ezyToken.split(".")[1])).exp < (new Date).getTime() / 1000) {
            $("#welc").html("身份过期，建议重新登录");
            $("#loginc").show();
            $("#logoutc").hide();
        }
        else {
            startTokenRefresh();
            $("#welc2").html(`你好！<img src="${localStorage.getItem("photo")}" style="height:calc(1.425rem + 2.5vw);margin-right:2%;margin-bottom:0.5vh;">${localStorage.getItem("realName")}`);
            $("#logoutc").show();
            $("#loginc").hide();
            $(login_btn).html("重新登录");
        }
    } else {

        $("#loginc").show();
        $("#logoutc").hide();
    }
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
        const url = `https://zyapi.loshop.com.cn/api/services/app/PictureLibrary/GetAllPicturesFromLibrary?SkipCount=${skip}&MaxResultCount=${maxCount}&IsRecycleBin=${isRecycleBin}`;
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
            const imgUrl = window.proxyBaseUrl + item.picture;
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
async function ques_query() {
    quesSkip = 0;
    quesAllLoaded = false;
    $(ques_list).html("");

    const topic = $(ques_topic).val();
    const subject = $(ques_subject).val();

    quesParams = {
        "orderBy": 0,
        "skip": quesSkip,
        "take": quesTake
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

    let resp = await fetch(`https://zyapi.loshop.com.cn/api/services/app/Quora/GetSessions`, {
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
                    <img src="${window.proxyBaseUrl + item.snapshot}" class="card-img-bottom w-100" style="object-fit:cover;">
                </div>
            </div>
        </div>
    `);

        col.find('.ques-card').data("id", item.id);
        col.find('.ques-card').click(() => previewQuestion(item.id));

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
    let resp = await fetch(`https://zyapi.loshop.com.cn/api/services/app/Quora/GetMessages`, {
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
    let s = "";

    data.forEach((d, i) => {
        s += `
        <div class="carousel-item ${i === 0 ? "active" : ""}" data-link="${d.content}">
            <img src="${window.proxyBaseUrl}${d.snapShot}" class="d-block w-100">
            <div style="padding-bottom:0" class="carousel-caption d-none d-md-block">
                <p>第${i + 1}/${data.length}页 发布者： ${d.userName}</p>
            </div>
        </div>`;
    });

    $(ques_preview_body).html(`
        <div id="ques_preview_pic" class="carousel slide carousel-dark" data-bs-interval="false">
            <div class="carousel-inner">${s}</div>
            <button class="carousel-control-prev" type="button" data-bs-target="#ques_preview_pic" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Previous</span>
            </button>
            <button class="carousel-control-next" type="button" data-bs-target="#ques_preview_pic" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Next</span>
            </button>
        </div>`);
    ques_preview.click();
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
    download($('.carousel-item.active')[0].dataset.link, 'test.zip')
};

async function mistake_query() {
    var subject = $(mistake_subject).val();
    let data = await fetch(`https://zyapi.loshop.com.cn/api/services/app/MistakeBook/SearchMistakeQstItemsAsync`, {
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
                // 获取题目详情
                let res = await fetch(`https://zyapi.loshop.com.cn/api/services/app/MistakeBook/GetMistakeQstItemDetailInfoAsync?itemId=` + $(this).data("id"), {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${localStorage.getItem("token")}`
                    },
                });
                let detail = await res.json();
                detail = detail.result;
                if (!detail) return;

                let noteSrc = detail.note;
                if (!noteSrc) {
                    swal("无笔记");
                    return;
                }

                // 🔸 使用 proxyBaseUrl 通过 fetch 下载 zip 文件
                const zipUrl = window.proxyBaseUrl + noteSrc;
                const zipResponse = await fetch(zipUrl);
                if (!zipResponse.ok) {
                    swal("下载失败");
                    return;
                }

                const zipBlob = await zipResponse.blob();

                // 🔸 用 JSZip 解压
                const zip = await JSZip.loadAsync(zipBlob);

                // 🔸 找到 screenshot.png（不确定具体路径，所以遍历）
                let screenshotFile = null;
                zip.forEach((relativePath, zipEntry) => {
                    if (relativePath.toLowerCase().endsWith("screenshot.png")) {
                        screenshotFile = zipEntry;
                    }
                });

                if (!screenshotFile) {
                    swal("未找到 screenshot.png");
                    return;
                }

                // 🔸 转成 base64 data URL
                const screenshotData = await screenshotFile.async("base64");
                const screenshotUrl = "data:image/png;base64," + screenshotData;

                // 🔸 Modal 展示图片
                $("#screenshotImg").attr("src", screenshotUrl);
                $("#screenshotModal").modal("show");

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

login_btn.onclick = async () => {
    $("#login_btn").prop("disabled", true);
    $("#login_btn").text("登录中");

    let message;
    let accountVal = account.value;
    let passwordVal = password.value;

    // 登录获取 token
    let data = await fetch("https://zyapi.loshop.com.cn/api/TokenAuth/Login", {
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

        $("#welc").html(message);
    } else {
        let token = data.result.accessToken;
        let refreshToken = data.result.refreshToken;
        let expireTime = Date.now() + data.result.expireInSeconds * 1000; // accessToken 过期时间
        let refreshExpireTime = Date.now() + data.result.refreshExpireInSeconds * 1000; // refreshToken 过期时间

        // 获取用户信息
        let info = await fetch("https://zyapi.loshop.com.cn/api/services/app/User/GetInfoAsync", {
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

        if (accountVal[0] !== "2") {
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
                let data = await fetch("https://zyapi.loshop.com.cn/api/TokenAuth/RefreshToken", {
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
                    iframe.src = "https://zyapi.loshop.com.cn/navPage.html?apiHost=https://zyapi.loshop.com.cn&apiToken=" + localStorage.getItem("token") + "#\/list?messageType=pager";

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
            let response = await fetch("https://zyapi.loshop.com.cn/CloudNotes/api/Notes/GetAll", {
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
            const template = `
                <a onclick="if(downloading)swal('你已经在下载一个文件，耐心等待哦');else noteDownload('${item.fileId}','${item.fileName}')" 
                   class="list-group-item list-group-item-action py-3 lh-tight a-note" 
                   aria-current="true" 
                   style="background:rgba(255,255,255,0) !important;">
                    <div class="d-flex w-100 align-items-center justify-content-between">
                        <strong class="note-name mb-1">${item.fileName}</strong>
                        <small>${item.updateTime}</small>
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

    let response = await fetch(`https://zyapi.loshop.com.cn/special/GetByFileId?${aesEncrypt("fileId=" + fileId)}`, {
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
                    ? window.proxyBaseUrl + item.ossImageUrl
                    : window.proxyBaseUrl + "http://friday-note.oss-cn-hangzhou.aliyuncs.com/" + item.ossImageUrl,
                ext
            };
        } else {
            pageMap[page].originals.push({
                url: item.ossImageUrl.startsWith('http')
                    ? window.proxyBaseUrl + item.ossImageUrl
                    : window.proxyBaseUrl + "http://friday-note.oss-cn-hangzhou.aliyuncs.com/" + item.ossImageUrl,
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
            thumbImg.src = pageData.thumbnail.url;
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
            origImg.src = pageData.originals[j].url;
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

    let response = await fetch(`https://zyapi.loshop.com.cn/special/GetByFileId?${aesEncrypt("fileId=" + fileId)}`, {
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
            ? window.proxyBaseUrl + ossUrl
            : window.proxyBaseUrl + "http://friday-note.oss-cn-hangzhou.aliyuncs.com/" + ossUrl;

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
    let data = await fetch(`https://zyapi.loshop.com.cn/api/services/app/Quora/GetCatalogs`, {
        method: "GET",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
    }).then(response => response.json());
    data = data.result;
    $('#ques_topic').html("");
    for (i in data) {
        $(ques_topic).append(`<option value="${data[i].id}">${data[i].name}</option>`)
    }
    ques_query();
}

async function mistakeInit() {
    let data = await fetch(`https://zyapi.loshop.com.cn/api/services/app/MistakeBook/GetMyMistakeBooksAsync`, {
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
    window.open("https://zyapi.loshop.com.cn/navPage.html?apiHost=https:\/\/zyapi.loshop.com.cn&apiToken=" + localStorage.getItem("token") + "#\/list?messageType=pager");
}

function zxzl_set_url() {

    var iframe = document.getElementById("zxzl_iframe");
    iframe.src = "https://zyapi.loshop.com.cn/navPage.html?apiHost=https://zyapi.loshop.com.cn&apiToken=" + localStorage.getItem("token") + "#\/list?messageType=pager";

}

ck_login = document.getElementById("ck_login");
ck_login.onclick = async () => {
    window.open(`https://proxy.loshop.com.cn/scramjet/${encodeURIComponent("http://sxz.school.zykj.org/index.html?apiHost=http:\/\/sxz.api.zykj.org&apiToken=" + localStorage.getItem("token") + "#/index/courseChoosing/StudentsCoursesList")}`);
}

function ck_set_url() {
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
    let url = window.proxyBaseUrl + note_link;
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
    let url = window.proxyBaseUrl + test_link;
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
    let url = window.proxyBaseUrl + learn_link;
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
    let url = window.proxyBaseUrl + user_link;
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
    let url = window.proxyBaseUrl + mistake_link;
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
    let url = window.proxyBaseUrl + web_link;
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
    let url = window.proxyBaseUrl + chat_link;
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
    window.open("http:\/\/sxz.school.zykj.org/navPage.html?apiHost=https:\/\/zyapi.loshop.com.cn&apiToken=" + localStorage.getItem("token") + "#\/class");
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
            var link = window.proxyBaseUrl + ob[i].data;
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
            var link = window.proxyBaseUrl + ob[i].src;
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
                new_tag_p.innerHTML += '附件：' + name + '&emsp;<a teype="button"  class="down" onclick="down_file(this)" type="' + window.proxyBaseUrl + link + '">点击下载</a>' + '&emsp;<a teype="button"  class="down" onclick="set_ppt(this)" type="' + link + '">在线查看</a>';
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
                var link = window.proxyBaseUrl + ob[i].getAttribute("data-url");
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
                ob[i].querySelector('img').src = window.proxyBaseUrl + ob[i].querySelector('img').src;
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

function show_page() {
    $.ajax({
        url: 'https:\/\/zyapi.loshop.com.cn\/SelfStudy\/api\/learn\/readContent?catalogId=' + $('#cid_input').val() + '&courseId=' + $('#id_input').val(),
        type: 'get',
        // 设置的是请求参数
        dataType: 'json', // 用于设置响应体的类型 注意 跟 data 参数没关系！！！
        beforeSend: function (request) {
            request.setRequestHeader("Content-Type", "application/json");
            request.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
        },
        success: function (res) {
            // 一旦设置的 dataType 选项，就不再关心 服务端 响应的 Content-Type 了
            // 客户端会主观认为服务端返回的就是 JSON 格式的字符串
            page_json = JSON.stringify(res.data.content);
            page_name = $("#cid_c").find("option:selected").text();
            //console.log(res.data.content);
            var div = document.getElementById('show');
            div.replaceChildren();
            div.innerHTML += res.data.content
            change_all();
        }
    });
}

function show_lesson() {
    let allData = [];

    function fetchPage(page) {
        $.ajax({
            url: 'https://zyapi.loshop.com.cn/SelfStudy/api/Learn/LearningCourses?page=' + page,
            type: 'get',
            dataType: 'json',
            beforeSend: function (request) {
                request.setRequestHeader("Content-Type", "application/json");
                request.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
            },
            success: function (res) {
                if (res.data && res.data.length > 0) {
                    // 累加数据
                    allData = allData.concat(res.data);
                    // 继续请求下一页
                    fetchPage(page + 1);
                } else {
                    // 没有数据了，渲染
                    console.log("所有页数据：", allData);

                    $("#id_c").empty();
                    for (let i = 0; i < allData.length; i++) {
                        $('#id_c').append(
                            '<option value="' + allData[i].id + '">' + allData[i].title + '</option>'
                        );
                    }
                    show_class();
                }
            },
            error: function (xhr, status, error) {
                console.error("请求失败:", error);
            }
        });
    }

    // 从第一页开始
    fetchPage(1);
}


//$('#id_c').val()
function show_class() {
    $.ajax({
        url: 'https:\/\/zyapi.loshop.com.cn\/SelfStudy\/api\/Learn\/CourseDetail?id=' + $('#id_c').val(),
        type: 'get',
        // 设置的是请求参数
        dataType: 'json', // 用于设置响应体的类型 注意 跟 data 参数没关系！！！
        beforeSend: function (request) {
            request.setRequestHeader("Content-Type", "application/json");
            request.setRequestHeader("Authorization", "Bearer " + localStorage.getItem("token"));
        },
        success: function (res) {
            // 一旦设置的 dataType 选项，就不再关心 服务端 响应的 Content-Type 了
            // 客户端会主观认为服务端返回的就是 JSON 格式的字符串
            //console.log(res.data.catalogs);
            $("#cid_c").find("option").remove();
            for (i = 0; i < res.data.catalogs.length; i++) {
                console.log(res.data.catalogs[i]);
                if (res.data.catalogs[i].isLeaf) {
                    console.log('<option value="' + res.data.catalogs[i].id + '">' + res.data.catalogs[i].title + '</option>');
                    $('#cid_c').append('<option value="' + res.data.catalogs[i].id + '">' + res.data.catalogs[i].title + '</option>');
                } else {
                    for (j = 0; j < res.data.catalogs[i].children.length; j++) {
                        console.log('<option value="' + res.data.catalogs[i].children[j].id + '">' + res.data.catalogs[i].children[j].title + '</option>');
                        $('#cid_c').append('<option value="' + res.data.catalogs[i].children[j].id + '">' + res.data.catalogs[i].children[j].title + '</option>');
                    }
                }
            }
            set_ids();
        }
    });

}

function set_ids() {
    $("#id_input").attr("value", $('#id_c').val());
    $("#cid_input").attr("value", $('#cid_c').val());
    show_page();
}

function down_file(data) {
    window.open(data.type);
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

    const url = "https://zyapi.loshop.com.cn/api/services/app/User/GetInfoAsync";
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
    const prefix = `https://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/`;
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

    const resp = await fetch("https://zyapi.loshop.com.cn/api/services/app/ObjectStorage/GenerateTokenV2Async", {
        method: "POST",
        headers: { "Accept": "application/json", "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(json_data)
    });

    const data = await resp.json();
    if (!data.result) throw new Error("获取 token 失败: " + JSON.stringify(data));
    const result = data.result;

    const client = new OSS({
        region: "oss-cn-hangzhou",
        accessKeyId: result.accessKeyId,
        accessKeySecret: result.accessKeySecret,
        stsToken: result.securityToken,
        bucket: result.bucket
    });

    const remote_file = `${fc}/${fr}/${userId}/${dateStr}/${nonce}/${remoteFileName}`;
    await client.put(remote_file, file);

    return `https://${result.bucket}.oss-cn-hangzhou.aliyuncs.com/${remote_file}`;
}

// 页面加载时获取用户ID并更新前缀
async function loadRoot() {
    try {
        const userId = await getUserId();
        window.currentUserId = userId;
        document.getElementById("urlUserId").textContent = "/res/" + userId + "/";

        // 监听变化更新预览
        document.getElementById("inputNonce").addEventListener("input", updateUrlPreview);
        document.getElementById("inputFileName").addEventListener("input", updateUrlPreview);
        document.getElementById("selectFc").addEventListener("change", updateUrlPreview);

        updateUrlPreview();
    } catch (e) {
        console.error(e);
        document.getElementById("urlUserId").textContent = "无法获取用户ID";
    }
};

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
async function loadNotes(parentId = "0") {
    const params = `parentid=${parentId}&isNoteNode=true`;
    const encryptedParams = aesEncrypt(params);
    const apiUrl = `https://zyapi.loshop.com.cn/special/GetByParentId?${encryptedParams}`;

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

        item.innerHTML = `
            <div class="d-flex align-items-center">
                <img src="${iconPath}" alt="" style="width:20px;height:20px;margin-right:8px;">
                <div>
                    <strong>${note.fileName}</strong><br>
                    <small class="text-muted">创建时间: ${note.createTime}</small>
                </div>
            </div>
            <span class="badge bg-${isFolder ? 'secondary' : 'primary'} rounded-pill">
                ${isFolder ? '文件夹' : '笔记'}
            </span>
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

    const res = await fetch('https://zyapi.loshop.com.cn/api/services/app/Task/GetStudentTaskListAsync', {
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
    const res = await fetch(`https://zyapi.loshop.com.cn/api/services/app/Task/GetExamTaskAsync?id=${examId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

async function fetchQstAnswerView(qstId) {
    const res = await fetch(`https://zyapi.loshop.com.cn/Question/View/${qstId}?showAnalysis=true`);
    return await res.text();
}



// 调用 /special/Search API 搜索
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

        // 直接把加密字符串放在 ? 后面
        const url = `https://zyapi.loshop.com.cn/special/Search?${encryptedQuery}`;

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
        const template = `
        <a onclick="if(downloading)swal('你已经在下载一个文件，耐心等待哦');else noteDownload('${item.fileId}','${item.fileName}')"
           class="list-group-item list-group-item-action py-3 lh-tight a-note"
           aria-current="true" 
           style="background:rgba(255,255,255,0) !important;">
            <div class="d-flex w-100 align-items-center justify-content-between">
                <strong class="note-name mb-1">${item.fileName}</strong>
                <small>${item.updateTime}</small>
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



