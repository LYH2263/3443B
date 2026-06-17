function renderNavbar(activePage = '') {
    const user = getUser();
    const logged = isLoggedIn();

    let userSection = '';
    if (logged && user) {
        const avatarContent = user.avatar
            ? `<img src="${getImageUrl(user.avatar)}" alt="">`
            : escapeHtml((user.nickname || user.username || '').charAt(0).toUpperCase());
        userSection = `
            <div class="home-nav-user" onclick="toggleUserDropdown(event)">
                <div class="home-nav-avatar">${avatarContent}</div>
                <span style="font-size:14px;color:var(--gray-700)" id="nav-nickname">${escapeHtml(user.nickname || user.username)}</span>
                <div class="home-nav-dropdown" id="user-dropdown">
                    ${user.role === 'admin' ? `<a href="#/admin">&#9881; 管理后台</a>` : ''}
                    <a href="#/profile">&#128100; 个人中心</a>
                    <div class="dropdown-divider"></div>
                    <button onclick="logout()">&#128682; 退出登录</button>
                </div>
            </div>
        `;
    } else {
        userSection = `
            <a href="#/login" class="btn btn-outline btn-sm">登录</a>
            <a href="#/register" class="btn btn-primary btn-sm">注册</a>
        `;
    }

    return `
        <nav class="home-nav">
            <div class="home-nav-inner">
                <a href="#/" class="home-nav-logo">
                    <div class="home-nav-logo-icon">${getLogoSvg()}</div>
                    FlipBook
                </a>
                <div class="home-nav-links">
                    ${userSection}
                </div>
            </div>
        </nav>
    `;
}

function toggleUserDropdown(event) {
    event.stopPropagation();
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

document.addEventListener('click', () => {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) dropdown.classList.remove('show');
});

function logout() {
    removeToken();
    showToast('已退出登录', 'success');
    window.location.hash = '#/login';
}

function renderFooter() {
    return `
        <footer class="home-footer">
            <p>&copy; ${new Date().getFullYear()} FlipBook 翻页画册管理系统 · All Rights Reserved</p>
        </footer>
    `;
}

function renderLoading() {
    return '<div class="loading"><div class="spinner"></div></div>';
}

function renderEmpty(message = '暂无数据', icon = '&#128218;') {
    return `
        <div class="empty-state">
            <div class="empty-state-icon">${icon}</div>
            <h3>${message}</h3>
            <p>请稍后再来查看</p>
        </div>
    `;
}

function createUploadArea(id, accept = 'image/*', multiple = false) {
    const isAudio = accept.includes('audio');
    const icon = isAudio ? '&#127925;' : '&#128247;';
    const title = isAudio ? '点击或拖拽上传音频' : '点击或拖拽上传图片';
    const desc = isAudio ? '支持 MP3、WAV、OGG、M4A、AAC 格式，最大 50MB' : '支持 JPG、PNG、GIF、WebP 格式，最大 10MB';
    
    return `
        <div class="upload-area" id="upload-area-${id}"
            ondragover="event.preventDefault();this.classList.add('dragover')"
            ondragleave="this.classList.remove('dragover')"
            ondrop="handleDrop(event,'${id}')"
            onclick="document.getElementById('file-input-${id}').click()">
            <div class="upload-area-icon">${icon}</div>
            <h4>${title}</h4>
            <p>${desc}</p>
            <input type="file" id="file-input-${id}" accept="${accept}" ${multiple ? 'multiple' : ''}
                style="display:none" onchange="handleFileSelect(event,'${id}')">
        </div>
        <div class="upload-preview" id="upload-preview-${id}"></div>
    `;
}

async function handleFileSelect(event, id) {
    const files = event.target.files;
    if (!files.length) return;
    await uploadFiles(files, id);
}

async function handleDrop(event, id) {
    event.preventDefault();
    event.currentTarget.classList.remove('dragover');
    const files = event.dataTransfer.files;
    if (!files.length) return;
    await uploadFiles(files, id);
}

async function uploadFiles(files, id) {
    const uploadArea = document.getElementById(`upload-area-${id}`);
    const isAudio = id === 'bgm' || id.startsWith('narration');
    const icon = isAudio ? '&#127925;' : '&#128247;';
    const title = isAudio ? '点击或拖拽上传音频' : '点击或拖拽上传图片';
    const desc = isAudio ? '支持 MP3、WAV、OGG、M4A、AAC 格式，最大 50MB' : '支持 JPG、PNG、GIF、WebP 格式，最大 10MB';
    
    if (uploadArea) {
        uploadArea.innerHTML = '<div class="loading"><div class="spinner"></div></div><p style="margin-top:8px;font-size:13px;color:var(--gray-500)">上传中...</p>';
    }

    try {
        const type = id === 'avatar' ? 'avatars' :
                     id === 'logo' ? 'logos' :
                     id === 'background' || id === 'bg-lib' ? 'backgrounds' :
                     id === 'cover' || id === 'ab-cover-a' || id === 'ab-cover-b' ? 'albums' :
                     id === 'page' || id === 'pages' ? 'pages' :
                     id === 'bgm' ? 'bgm' :
                     id.startsWith('narration') ? 'narration' : 'albums';

        const results = [];
        for (const file of files) {
            const res = isAudio 
                ? await api.upload.audio(file, type)
                : await api.upload.image(file, type);
            if (res.data) results.push(res.data);
        }

        if (window['onUploadComplete_' + id]) {
            window['onUploadComplete_' + id](results);
        }
    } catch (e) {
        // error already shown by apiRequest
    }

    if (uploadArea) {
        uploadArea.innerHTML = `
            <div class="upload-area-icon">${icon}</div>
            <h4>${title}</h4>
            <p>${desc}</p>
        `;
    }
}

let _pdfExportProgressInterval = null;

function renderPdfExportModal() {
    return `
        <div class="pdf-export-overlay" id="pdf-export-overlay" role="dialog" aria-modal="true" onclick="closePdfExportModal()">
            <div class="pdf-export-modal" onclick="event.stopPropagation()">
                <div class="pdf-export-header">
                    <h3 id="pdf-export-title">&#128196; 导出 PDF</h3>
                    <button class="pdf-export-close" onclick="closePdfExportModal()" aria-label="关闭">&times;</button>
                </div>
                <div class="pdf-export-body" id="pdf-export-body">
                    <div class="pdf-export-config" id="pdf-export-config">
                        <div class="form-group">
                            <label class="form-label">页面尺寸</label>
                            <select class="form-select" id="pdf-page-size">
                                <option value="a4_portrait">A4 纵向 (210×297mm)</option>
                                <option value="a4_landscape">A4 横向 (297×210mm)</option>
                                <option value="original">原图比例</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="pdf-show-header" checked> 显示页眉（画册标题）
                            </label>
                        </div>
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="pdf-show-footer" checked> 显示页脚（页码）
                            </label>
                        </div>
                    </div>
                    <div class="pdf-export-progress" id="pdf-export-progress" style="display:none">
                        <div class="pdf-progress-header">
                            <div class="pdf-progress-title" id="pdf-progress-title">正在生成 PDF...</div>
                            <div class="pdf-progress-percent" id="pdf-progress-percent">0%</div>
                        </div>
                        <div class="pdf-progress-bar">
                            <div class="pdf-progress-fill" id="pdf-progress-fill" style="width:0%"></div>
                        </div>
                        <div class="pdf-progress-info" id="pdf-progress-info">准备中...</div>
                    </div>
                    <div class="pdf-export-result" id="pdf-export-result" style="display:none">
                        <div class="pdf-result-icon" id="pdf-result-icon">&#10004;</div>
                        <div class="pdf-result-title" id="pdf-result-title">导出成功</div>
                        <div class="pdf-result-info" id="pdf-result-info"></div>
                        <div class="pdf-result-actions" id="pdf-result-actions"></div>
                    </div>
                </div>
                <div class="pdf-export-footer" id="pdf-export-footer">
                    <button class="btn btn-secondary" onclick="closePdfExportModal()">取消</button>
                    <button class="btn btn-primary" id="pdf-export-start-btn" onclick="startPdfExport()">
                        &#128196; 开始导出
                    </button>
                </div>
            </div>
        </div>
    `;
}

function openPdfExportModal(albumId, albumTitle) {
    window._currentPdfAlbumId = albumId;
    window._currentPdfAlbumTitle = albumTitle;

    const container = document.getElementById('modal-container');
    if (!container) return;

    container.innerHTML = renderPdfExportModal();

    setTimeout(() => {
        const overlay = document.getElementById('pdf-export-overlay');
        if (overlay) overlay.classList.add('show');
    }, 50);
}

function closePdfExportModal() {
    if (_pdfExportProgressInterval) {
        clearInterval(_pdfExportProgressInterval);
        _pdfExportProgressInterval = null;
    }

    const overlay = document.getElementById('pdf-export-overlay');
    if (!overlay) return;

    overlay.classList.remove('show');
    setTimeout(() => {
        const container = document.getElementById('modal-container');
        if (container && container.querySelector('#pdf-export-overlay')) {
            container.innerHTML = '';
        }
    }, 200);
}

async function startPdfExport() {
    const albumId = window._currentPdfAlbumId;
    if (!albumId) return;

    const pageSize = document.getElementById('pdf-page-size').value;
    const showHeader = document.getElementById('pdf-show-header').checked;
    const showFooter = document.getElementById('pdf-show-footer').checked;

    document.getElementById('pdf-export-config').style.display = 'none';
    document.getElementById('pdf-export-progress').style.display = 'block';
    document.getElementById('pdf-export-footer').style.display = 'none';

    try {
        const res = await api.pdf.export({
            album_id: albumId,
            page_size: pageSize,
            show_header: showHeader,
            show_footer: showFooter
        });

        const task = res.data.task;
        startPdfProgressPolling(task.id);

    } catch (e) {
        showPdfExportError(e.message || '导出失败');
    }
}

function startPdfProgressPolling(taskId) {
    if (_pdfExportProgressInterval) {
        clearInterval(_pdfExportProgressInterval);
    }

    let pollCount = 0;
    const maxPolls = 600;

    const poll = async () => {
        try {
            const res = await api.pdf.progress(taskId);
            const task = res.data;

            updatePdfExportProgress(task);

            if (task.status === 'completed') {
                clearInterval(_pdfExportProgressInterval);
                _pdfExportProgressInterval = null;
                showPdfExportSuccess(task);
            } else if (task.status === 'failed' || task.status === 'timeout') {
                clearInterval(_pdfExportProgressInterval);
                _pdfExportProgressInterval = null;
                showPdfExportError(task.error_message || '导出失败', task.can_retry, taskId);
            }

            pollCount++;
            if (pollCount >= maxPolls) {
                clearInterval(_pdfExportProgressInterval);
                _pdfExportProgressInterval = null;
                showPdfExportError('导出超时，请稍后重试');
            }

        } catch (e) {
            clearInterval(_pdfExportProgressInterval);
            _pdfExportProgressInterval = null;
            showPdfExportError(e.message || '查询进度失败');
        }
    };

    poll();
    _pdfExportProgressInterval = setInterval(poll, 2000);
}

function updatePdfExportProgress(task) {
    const statusText = {
        pending: '等待处理...',
        processing: '正在生成 PDF...',
        completed: '导出完成',
        failed: '导出失败',
        timeout: '导出超时'
    };

    document.getElementById('pdf-progress-percent').textContent = `${task.progress}%`;
    document.getElementById('pdf-progress-fill').style.width = `${task.progress}%`;

    const info = task.total_pages > 0
        ? `${statusText[task.status]} 已处理 ${task.processed_pages} / ${task.total_pages} 页`
        : statusText[task.status];
    document.getElementById('pdf-progress-info').textContent = info;
}

function showPdfExportSuccess(task) {
    document.getElementById('pdf-export-progress').style.display = 'none';
    document.getElementById('pdf-export-result').style.display = 'block';

    document.getElementById('pdf-result-icon').innerHTML = '&#10004;';
    document.getElementById('pdf-result-icon').className = 'pdf-result-icon pdf-result-success';
    document.getElementById('pdf-result-title').textContent = '导出成功';

    const fileSize = task.file_size ? formatFileSize(task.file_size) : '';
    const expireText = task.expires_at ? `，文件将保留至 ${formatDateTime(task.expires_at)}` : '';
    document.getElementById('pdf-result-info').textContent = `${fileSize}${expireText}`;

    const downloadUrl = api.pdf.download(task.id);
    document.getElementById('pdf-result-actions').innerHTML = `
        <a class="btn btn-primary" href="${downloadUrl}" download onclick="closePdfExportModal()">
            &#11015; 下载 PDF
        </a>
        <button class="btn btn-secondary" onclick="closePdfExportModal()">
            关闭
        </button>
    `;
}

function showPdfExportError(message, canRetry = false, taskId = null) {
    document.getElementById('pdf-export-progress').style.display = 'none';
    document.getElementById('pdf-export-result').style.display = 'block';

    document.getElementById('pdf-result-icon').innerHTML = '&#10006;';
    document.getElementById('pdf-result-icon').className = 'pdf-result-icon pdf-result-error';
    document.getElementById('pdf-result-title').textContent = '导出失败';
    document.getElementById('pdf-result-info').textContent = message || '未知错误';

    let actionsHtml = '';
    if (canRetry && taskId) {
        actionsHtml += `
            <button class="btn btn-primary" onclick="retryPdfExport(${taskId})">
                &#8635; 重新导出
            </button>
        `;
    }
    actionsHtml += `
        <button class="btn btn-secondary" onclick="closePdfExportModal()">
            关闭
        </button>
    `;
    document.getElementById('pdf-result-actions').innerHTML = actionsHtml;
}

async function retryPdfExport(taskId) {
    document.getElementById('pdf-export-result').style.display = 'none';
    document.getElementById('pdf-export-progress').style.display = 'block';
    document.getElementById('pdf-progress-fill').style.width = '0%';
    document.getElementById('pdf-progress-percent').textContent = '0%';
    document.getElementById('pdf-progress-info').textContent = '准备重试...';

    try {
        await api.pdf.retry(taskId);
        startPdfProgressPolling(taskId);
    } catch (e) {
        showPdfExportError(e.message || '重试失败');
    }
}

function formatFileSize(bytes) {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
}

function showConfirmModal(title, message, onConfirm) {
    const container = document.getElementById('modal-container');
    if (!container) return;

    container.innerHTML = `
        <div class="confirm-overlay" id="confirm-overlay" role="dialog" aria-modal="true" onclick="closeConfirmModal()">
            <div class="confirm-modal" onclick="event.stopPropagation()">
                <div class="confirm-header">
                    <h3>${escapeHtml(title)}</h3>
                </div>
                <div class="confirm-body">
                    <p>${escapeHtml(message)}</p>
                </div>
                <div class="confirm-footer">
                    <button class="btn btn-secondary" onclick="closeConfirmModal()">取消</button>
                    <button class="btn btn-primary" onclick="executeConfirmAction()">确定</button>
                </div>
            </div>
        </div>
    `;

    window._confirmCallback = onConfirm;

    setTimeout(() => {
        const overlay = document.getElementById('confirm-overlay');
        if (overlay) overlay.classList.add('show');
    }, 50);
}

function closeConfirmModal() {
    const overlay = document.getElementById('confirm-overlay');
    if (!overlay) return;

    overlay.classList.remove('show');
    setTimeout(() => {
        const container = document.getElementById('modal-container');
        if (container && container.querySelector('#confirm-overlay')) {
            container.innerHTML = '';
        }
    }, 200);
    window._confirmCallback = null;
}

function executeConfirmAction() {
    if (window._confirmCallback) {
        window._confirmCallback();
    }
    closeConfirmModal();
}

window.showConfirmModal = showConfirmModal;
window.closeConfirmModal = closeConfirmModal;
window.executeConfirmAction = executeConfirmAction;
window.openPdfExportModal = openPdfExportModal;
window.closePdfExportModal = closePdfExportModal;
window.startPdfExport = startPdfExport;
window.retryPdfExport = retryPdfExport;
