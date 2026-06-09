/**
 * PDF上传云笔记功能模块
 * 严格按照 core.py 的 uploadNote 逻辑实现
 */

// ==================== 全局状态 ====================
let pdfImages = [];           // 存储PDF转换后的图片（blob数组）
let currentPdfFile = null;    // 当前选择的PDF文件
let templateFilesCache = null; // 缓存模板文件

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', function() {
    const pdfjs = window.pdfjsLib || window.pdfjs;
    if (typeof pdfjs !== 'undefined') {
        pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    } else {
        console.warn('PDF.js 未加载');
    }
});

// ==================== 基础工具函数 ====================

function generateCustomFileId(prefix, length) {
    prefix = prefix || 'h';
    length = length || 32;
    const hexChars = '0123456789abcdef';
    const extraChars = 'ghijklmnopqrstuvwxyz';
    const allChars = hexChars + extraChars;
    while (true) {
        let body = '';
        for (let i = 0; i < length; i++) {
            body += allChars.charAt(Math.floor(Math.random() * allChars.length));
        }
        if (/[g-z]/.test(body)) {
            return prefix + body;
        }
    }
}

function generatePageHash() {
    // Python: int(time.time() * 1000) = 毫秒时间戳
    // JS: Date.now() 已返回毫秒，无需再乘1000
    return String(Date.now() + Math.floor(Math.random() * 1000));
}

// ==================== codeUtils.encode() JS实现 ====================

function generateAesKey() {
    var e = ":F0wKU!Qg3}UkbW+w[:9|D3-5h=:T;7t#_GZ4#G;~ZNSq{8;}QIP>'{q.lje";
    var t = new Date();
    var n = t.getFullYear();
    var r = t.getMonth() + 1;
    var o = t.getDate();
    var i = 33 + o * r * 33;
    var a = String.fromCharCode(i % 94 + 33);
    var s = e[o + r];
    var c = n * r * o % e.length;
    var f = (e.substring(c) + e.substring(0, c)).substring(0, 14);
    return a + f + s;
}

function codeUtilsEncode(dataStr) {
    var key = CryptoJS.enc.Utf8.parse(generateAesKey());
    return CryptoJS.AES.encrypt(dataStr, key, {
        mode: CryptoJS.mode.ECB,
        padding: CryptoJS.pad.Pkcs7
    }).toString();
}

// ==================== 模板文件加载（用fetch）====================

async function loadTemplateFiles() {
    if (templateFilesCache) return templateFilesCache;

    var base = 'example/';
    var files = [
        'page_router.bin',
        'a888b5fb-e65d-4611-a3af-1f80a0fb6ced/059848e4-1971-47fb-9e47-517266cdef05_matrix.bin',
        'a888b5fb-e65d-4611-a3af-1f80a0fb6ced/a2b4fb47-3623-45be-9fe9-57fc62e66651_file.bin',
        'a888b5fb-e65d-4611-a3af-1f80a0fb6ced/e339e39b-64d9-4de0-bfaa-dace2a3f8e7d_command.bin',
        'a888b5fb-e65d-4611-a3af-1f80a0fb6ced/header.bin',
        'a888b5fb-e65d-4611-a3af-1f80a0fb6ced/router.bin',
        'a888b5fb-e65d-4611-a3af-1f80a0fb6ced/screenshot.png',
        'a888b5fb-e65d-4611-a3af-1f80a0fb6ced/snapshot.bin'
    ];

    templateFilesCache = {};
    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var resp = await fetch(base + f);
        if (!resp.ok) throw new Error('加载模板文件失败: ' + f);
        templateFilesCache[f] = await resp.blob();
    }
    return templateFilesCache;
}

// ==================== OSS上传（调用index.js的uploadFile）====================

async function uploadToOss(blob, userId, nonce, filename) {
    if (typeof uploadFile !== 'function') {
        throw new Error('uploadFile 函数不可用，请确保已登录');
    }
    // uploadFile(file/blob, userId, fc, nonceInput, fileNameInput)
    return await uploadFile(blob, userId, 'note_v2', nonce, filename);
}

// ==================== PDF转图片（使用服务端 pdf2img）====================

async function convertPdfToImages(pdfFile, onProgress) {
    // 方案：直接上传 PDF 到 pdf2img.zyai.cc，获取转换后的图片 URL 列表
    var formData = new FormData();
    formData.append('file', pdfFile, pdfFile.name);

    if (onProgress) {
        onProgress(0.1, 0, 1);
    }

    var resp = await fetch('https://pdf2img.zyai.cc/upload', {
        method: 'POST',
        body: formData
    });

    if (!resp.ok) {
        throw new Error('PDF转图片失败: HTTP ' + resp.status);
    }

    var result = await resp.json();
    // 返回格式: { imgPaths: ["url1", "url2", ...] }
    if (!result.imgPaths || !Array.isArray(result.imgPaths)) {
        throw new Error('PDF转图片返回格式错误: ' + JSON.stringify(result));
    }

    var imgPaths = result.imgPaths;
    var images = [];

    for (var i = 0; i < imgPaths.length; i++) {
        if (onProgress) {
            onProgress((i + 1) / imgPaths.length * 0.9, i + 1, imgPaths.length);
        }

        // 使用 index.js 的 proxyImgSrc 处理图片代理
        var imgUrl = imgPaths[i];
        if (typeof window.proxyImgSrc === 'function') {
            imgUrl = window.proxyImgSrc(imgPaths[i]);
        }
        var imgResp = await fetch(imgUrl);
        if (!imgResp.ok) {
            throw new Error('下载第 ' + (i + 1) + ' 页图片失败: ' + imgResp.status);
        }
        var blob = await imgResp.blob();

        // 转为 webp（如果原图不是 webp）
        if (blob.type !== 'image/webp') {
            blob = await convertBlobToWebp(blob);
        }

        images.push({
            pageNum: i + 1,
            blob: blob,
            url: imgPaths[i]
        });
    }

    if (onProgress) {
        onProgress(1.0, imgPaths.length, imgPaths.length);
    }

    return images;
}

/**
 * 将图片 blob 转为 webp 格式
 */
async function convertBlobToWebp(blob) {
    return new Promise(function(resolve, reject) {
        var img = new Image();
        var url = URL.createObjectURL(blob);

        img.onload = function() {
            var canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            var ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);

            canvas.toBlob(function(webpBlob) {
                URL.revokeObjectURL(url);
                if (webpBlob && webpBlob.type === 'image/webp') {
                    resolve(webpBlob);
                } else {
                    // webp 不支持，返回原图
                    resolve(blob);
                }
            }, 'image/webp', 0.85);
        };

        img.onerror = function() {
            URL.revokeObjectURL(url);
            reject(new Error('图片解码失败'));
        };

        img.src = url;
    });
}

// ==================== MD5计算 ====================

async function blobToMd5(blob) {
    var buffer = await blob.arrayBuffer();
    var wordArray = CryptoJS.lib.WordArray.create(buffer);
    return CryptoJS.MD5(wordArray).toString().toUpperCase();
}

// ==================== 文件选择处理 ====================

async function handlePdfSelect(event) {
    var file = event.target.files[0];
    if (!file) return;
    if (!file.type.includes('pdf') && !file.name.toLowerCase().endsWith('.pdf')) {
        swal('请选择PDF文件');
        return;
    }
    if (file.size > 50 * 1024 * 1024) {
        swal('PDF文件不能超过50MB');
        return;
    }
    currentPdfFile = file;
    var nameInput = document.getElementById('pdfNoteName');
    if (nameInput && !nameInput.value) {
        nameInput.value = file.name.replace(/\.pdf$/i, '');
    }
    var fileInfo = document.getElementById('pdfFileInfo');
    if (fileInfo) {
        fileInfo.innerHTML = '<div class="alert alert-info mt-2"><strong>已选择：</strong>' + file.name + '<br><strong>大小：</strong>' + formatFileSize(file.size) + '</div>';
    }
}

// ==================== Token验证 ====================

function isTokenValid() {
    var token = localStorage.getItem('token');
    if (!token) return false;
    try {
        var payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp && payload.exp > (Date.now() / 1000 + 300);
    } catch (e) { return false; }
}

async function getUserId() {
    var token = localStorage.getItem('token');
    try {
        var payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub || payload.nameid || payload.userId || '';
    } catch (e) { return ''; }
}

// ==================== 主流程 ====================

async function uploadPdfAsNote() {
    if (!currentPdfFile) { swal('请先选择PDF文件'); return; }

    var noteName = document.getElementById('pdfNoteName').value.trim();
    if (!noteName) { swal('请输入笔记名称'); return; }

    var token = localStorage.getItem('token');
    if (!token) { swal('请先登录'); return; }
    if (!isTokenValid()) { swal('登录已过期，请重新登录'); return; }

    try {
        // 步骤1：加载模板文件
        updatePdfProgress(5, '正在加载模板文件...');
        var templates = await loadTemplateFiles();

        // 步骤2：PDF转图片
        updatePdfProgress(15, '正在转换PDF...');
        pdfImages = await convertPdfToImages(currentPdfFile, function(p, c, t) {
            updatePdfProgress(15 + p * 30, '转换PDF：第 ' + c + '/' + t + ' 页');
        });

        var userId = await getUserId();
        var customFileId = generateCustomFileId();
        var todayStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        var timestamp = new Date().toLocaleString('zh-CN', {
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        }).replace(/\//g, '-').replace(/ /g, ' ');

        // 步骤3：上传模板文件到OSS
        updatePdfProgress(50, '正在上传模板文件...');
        var ossPageHash = generatePageHash();
        var uuid = 'a888b5fb-e65d-4611-a3af-1f80a0fb6ced';

        // 上传 page_router.bin
        await uploadToOss(templates['page_router.bin'], userId, customFileId, ossPageHash + '/page_router.bin');

        // 上传UUID目录下的模板文件
        var templateKeys = Object.keys(templates);
        for (var k = 0; k < templateKeys.length; k++) {
            var f = templateKeys[k];
            if (f.includes('/')) {
                await uploadToOss(templates[f], userId, customFileId, ossPageHash + '/' + f);
            }
        }

        // 步骤4：上传每页图片并构建 resourceList
        updatePdfProgress(65, '正在上传图片...');
        var resourceList = [];
        // ossBase 不包含 ossPageHash，模板文件和图片文件的路径不同
        var ossBase = 'http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/' + userId + '/' + todayStr + '/' + customFileId;

        for (var pageIndex = 0; pageIndex < pdfImages.length; pageIndex++) {
            var pageHash = generatePageHash();
            var pageBase = '/storage/emulated/0/Android/data/com.friday.cloudsnote/userNote/' + userId + '/note/' + customFileId + '/' + pageHash;

            // 上传当前页图片（webp格式，文件名固定）
            var imgFilename = pageHash + '/B466246B6F67160E63431159941CD9A9screenCaptureb59d24b6-00fa-4f53-bc4f-1df255a5101a.webp';
            // 先把jpg转webp（用canvas重新绘制）
            var imgBlob = pdfImages[pageIndex].blob;
            // 直接计算md5
            var imgMd5 = await blobToMd5(imgBlob);
            await uploadToOss(imgBlob, userId, customFileId, imgFilename);

            // 添加9个资源条目（与 core.py 完全一致）
            // baseOss 用于模板文件（包含 ossPageHash）
            var baseOss = ossBase + '/' + ossPageHash;

            resourceList.push({
                id: pageBase + '/page_router.bin',
                fileId: customFileId,
                pageName: pageBase,
                pageIndex: pageIndex,
                md5: 'C6FFAEB070ADBEC6B886BE63587CB0F8',
                resourceType: 1,
                ossImageUrl: ossBase + '/' + ossPageHash + '/page_router.bin',
                createTimeStamp: timestamp,
                updateTimeStamp: timestamp,
                toBeUploaded: false,
                wasDeleted: false
            });

            resourceList.push({
                id: pageBase + '/' + uuid + '/059848e4-1971-47fb-9e47-517266cdef05_matrix.bin',
                fileId: customFileId,
                pageName: pageBase,
                pageIndex: pageIndex,
                md5: '5D03C5A75809ED20D24C18388BB8AB63',
                resourceType: 1,
                ossImageUrl: baseOss + '/' + uuid + '/059848e4-1971-47fb-9e47-517266cdef05_matrix.bin',
                createTimeStamp: timestamp,
                updateTimeStamp: timestamp,
                toBeUploaded: false,
                wasDeleted: false
            });

            resourceList.push({
                id: pageBase + '/' + uuid + '/a2b4fb47-3623-45be-9fe9-57fc62e66651_file.bin',
                fileId: customFileId,
                pageName: pageBase,
                pageIndex: pageIndex,
                md5: '5924B6262213683E6A4A2AFD3E4A270B',
                resourceType: 1,
                ossImageUrl: baseOss + '/' + uuid + '/a2b4fb47-3623-45be-9fe9-57fc62e66651_file.bin',
                createTimeStamp: timestamp,
                updateTimeStamp: timestamp,
                toBeUploaded: false,
                wasDeleted: false
            });

            resourceList.push({
                id: pageBase + '/' + uuid + '/e339e39b-64d9-4de0-bfaa-dace2a3f8e7d_command.bin',
                fileId: customFileId,
                pageName: pageBase,
                pageIndex: pageIndex,
                md5: 'FEC4C90827E797E54126BB996BF0AF05',
                resourceType: 1,
                ossImageUrl: baseOss + '/' + uuid + '/e339e39b-64d9-4de0-bfaa-dace2a3f8e7d_command.bin',
                createTimeStamp: timestamp,
                updateTimeStamp: timestamp,
                toBeUploaded: false,
                wasDeleted: false
            });

            resourceList.push({
                id: pageBase + '/' + uuid + '/header.bin',
                fileId: customFileId,
                pageName: pageBase,
                pageIndex: pageIndex,
                md5: 'A929A287A521818CA4E56A9E643866AE',
                resourceType: 1,
                ossImageUrl: baseOss + '/' + uuid + '/header.bin',
                createTimeStamp: timestamp,
                updateTimeStamp: timestamp,
                toBeUploaded: false,
                wasDeleted: false
            });

            resourceList.push({
                id: pageBase + '/' + uuid + '/router.bin',
                fileId: customFileId,
                pageName: pageBase,
                pageIndex: pageIndex,
                md5: '053971527BD9F3D4E3F9B2A1A4D2023F',
                resourceType: 1,
                ossImageUrl: baseOss + '/' + uuid + '/router.bin',
                createTimeStamp: timestamp,
                updateTimeStamp: timestamp,
                toBeUploaded: false,
                wasDeleted: false
            });

            resourceList.push({
                id: pageBase + '/' + uuid + '/screenshot.png',
                fileId: customFileId,
                pageName: pageBase,
                pageIndex: pageIndex,
                md5: '538BC7AC54289E9EAA758C50A006AE59',
                resourceType: 2,
                ossImageUrl: baseOss + '/' + uuid + '/screenshot.png',
                createTimeStamp: timestamp,
                updateTimeStamp: timestamp,
                toBeUploaded: false,
                wasDeleted: false
            });

            resourceList.push({
                id: pageBase + '/' + uuid + '/snapshot.bin',
                fileId: customFileId,
                pageName: pageBase,
                pageIndex: pageIndex,
                md5: '9A26C2CA8A7C8731602497EA578C994F',
                resourceType: 1,
                ossImageUrl: baseOss + '/' + uuid + '/snapshot.bin',
                createTimeStamp: timestamp,
                updateTimeStamp: timestamp,
                toBeUploaded: false,
                wasDeleted: false
            });

            // 图片资源（与 core.py 完全一致）
            // resourceType 必须是 pageIndex，md5 是固定值
            resourceList.push({
                id: pageBase + '/res/image/B466246B6F67160E63431159941CD9A9screenCaptureb59d24b6-00fa-4f53-bc4f-1df255a5101a.webp',
                fileId: customFileId,
                pageName: pageBase,
                pageIndex: pageIndex,
                md5: '4126E637D965204140D4982A1B847283',
                resourceType: pageIndex,
                ossImageUrl: ossBase + '/' + pageHash + '/B466246B6F67160E63431159941CD9A9screenCaptureb59d24b6-00fa-4f53-bc4f-1df255a5101a.webp',
                createTimeStamp: timestamp,
                updateTimeStamp: timestamp,
                toBeUploaded: false,
                wasDeleted: false
            });

            updatePdfProgress(65 + (pageIndex + 1) / pdfImages.length * 25,
                '已上传第 ' + (pageIndex + 1) + '/' + pdfImages.length + ' 页');
        }

        // 步骤5：保存资源
        updatePdfProgress(92, '正在保存资源...');
        await saveResourceList(userId, resourceList);

        // 步骤6：保存笔记
        updatePdfProgress(97, '正在保存笔记...');
        await saveNote(userId, customFileId, noteName, todayStr);

        updatePdfProgress(100, '上传完成！');
        swal('成功', '笔记"' + noteName + '"已保存，共 ' + pdfImages.length + ' 页', 'success');

    } catch (error) {
        console.error(error);
        updatePdfProgress(0, '失败：' + error.message);
        swal('失败', error.message, 'error');
    }
}

// ==================== 保存资源/笔记 ====================

async function saveResourceList(userId, resourceList) {
    var token = localStorage.getItem('token');
    // 与 api.py addOrUpdateResource 一致：直接加密数组
    var plainData = JSON.stringify(resourceList);
    var data = codeUtilsEncode(plainData);

    var resp = await fetch(window.API_BASE_URL + '/CloudNotes/api/Resources/AddOrUpdate', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json; charset=UTF-8',
            'Connection': 'Keep-Alive'
        },
        body: data
    });
    var result = await resp.json();
    if (result.code !== 0) throw new Error('保存资源失败: ' + JSON.stringify(result));
    return result;
}

async function saveNote(userId, customFileId, fileName, todayStr) {
    var token = localStorage.getItem('token');
    var fileUrl = 'http://ezy-sxz.oss-cn-hangzhou.aliyuncs.com/note_v2/res/' + userId + '/' + todayStr + '/' + customFileId + '/';
    var plainData = JSON.stringify({
        fileId: customFileId,
        fileName: fileName,
        parentId: '0',
        type: '12',
        fileUrl: fileUrl
    });
    var data = codeUtilsEncode(plainData);

    var resp = await fetch(window.API_BASE_URL + '/CloudNotes/api/Notes/AddOrUpdate', {
        method: 'POST',
        headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json; charset=UTF-8',
            'Connection': 'Keep-Alive'
        },
        body: data
    });
    var result = await resp.json();
    if (result.code !== 0) throw new Error('保存笔记失败: ' + JSON.stringify(result));
    return result;
}

// ==================== 工具函数 ====================

function updatePdfProgress(percent, text) {
    var bar = document.getElementById('pdfProgress');
    var txt = document.getElementById('pdfProgressText');
    if (bar) {
        bar.style.width = percent + '%';
        bar.className = percent < 100
            ? 'progress-bar progress-bar-striped progress-bar-animated'
            : 'progress-bar bg-success';
    }
    if (txt) txt.textContent = text || (percent + '%');
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1048576).toFixed(2) + ' MB';
}

// ==================== 预览 ====================

async function previewPdfImages() {
    var container = document.getElementById('pdfPreviewContainer');
    if (!container || pdfImages.length === 0) return;
    container.innerHTML = '';
    var count = Math.min(5, pdfImages.length);
    for (var i = 0; i < count; i++) {
        var url = URL.createObjectURL(pdfImages[i].blob);
        var img = document.createElement('img');
        img.src = url;
        img.className = 'img-fluid mb-2';
        img.style.maxHeight = '200px';
        img.alt = '第' + (i + 1) + '页';
        var div = document.createElement('div');
        div.className = 'text-center mb-2';
        div.innerHTML = '<small>第' + (i + 1) + '页</small><br>';
        div.appendChild(img);
        container.appendChild(div);
    }
    if (pdfImages.length > 5) {
        var p = document.createElement('p');
        p.className = 'text-muted';
        p.textContent = '...还有' + (pdfImages.length - 5) + '页';
        container.appendChild(p);
    }
}

// ==================== 下载 ====================

function downloadPdfImages() {
    if (pdfImages.length === 0) { swal('没有可下载的文件'); return; }
    if (typeof JSZip === 'undefined') { swal('JSZip未加载'); return; }
    var zip = new JSZip();
    for (var i = 0; i < pdfImages.length; i++) {
        var fname = 'page_' + String(i + 1).padStart(3, '0') + '.jpg';
        zip.file(fname, pdfImages[i].blob);
    }
    zip.generateAsync({ type: 'blob' }).then(function(blob) {
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = (document.getElementById('pdfNoteName').value.trim() || 'pdf_note') + '.zip';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    });
}
