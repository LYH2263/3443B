let editAlbumState = { album: null, categories: [], levels: [], backgrounds: [], pages: [], isNew: true, previewAudio: null };

function renderAdminAlbumEdit(id) {
    editAlbumState.isNew = !id;
    return renderAdminLayout('albums', `
        <div class="admin-page-header">
            <h1>${id ? '&#9998; 编辑画册' : '&#43; 创建画册'}</h1>
            <a href="#/admin/albums" class="btn btn-secondary">&#8592; 返回列表</a>
        </div>
        <div id="album-edit-content">${renderLoading()}</div>
    `);
}

async function initAdminAlbumEdit(id) {
    const titleEl = document.getElementById('admin-page-title');
    if (titleEl) titleEl.textContent = id ? '编辑画册' : '创建画册';

    try {
        const [catRes, levelRes, bgRes] = await Promise.all([
            api.admin.categories(),
            api.admin.levels(),
            api.admin.backgrounds()
        ]);
        editAlbumState.categories = catRes.data || [];
        editAlbumState.levels = levelRes.data || [];
        editAlbumState.backgrounds = bgRes.data || [];

        if (id) {
            const albumRes = await api.admin.albumDetail(id);
            editAlbumState.album = albumRes.data;
            editAlbumState.pages = albumRes.data.pages || [];
        } else {
            editAlbumState.album = {
                title: '', description: '', cover_image: '', background_image: '',
                category_id: '', min_level: 0, share_password: '', status: 1,
                qrcode_logo: '', qrcode_text_line1: '', qrcode_text_line2: '',
                bgm_audio: '', bgm_volume: 80, bgm_enabled: 1,
                sort_order: 0
            };
            editAlbumState.pages = [];
        }

        renderAlbumEditForm(id);
    } catch (e) {
        document.getElementById('album-edit-content').innerHTML = renderEmpty('加载失败');
    }
}

function renderAlbumEditForm(id) {
    const a = editAlbumState.album;
    const container = document.getElementById('album-edit-content');
    if (!container) return;

    const coverPreview = a.cover_image
        ? `<div class="upload-preview"><div class="upload-preview-item"><img src="${getImageUrl(a.cover_image_url || a.cover_image)}" alt="封面" onerror="this.parentElement.style.display='none'"></div></div>`
        : '';
    const bgPreview = a.background_image
        ? `<div class="upload-preview"><div class="upload-preview-item"><img src="${getImageUrl(a.background_image_url || a.background_image)}" alt="背景" onerror="this.parentElement.style.display='none'"></div></div>`
        : '';
    const logoPreview = a.qrcode_logo
        ? `<div class="upload-preview"><div class="upload-preview-item"><img src="${getImageUrl(a.qrcode_logo_url || a.qrcode_logo)}" alt="Logo" onerror="this.parentElement.style.display='none'"></div></div>`
        : '';
    const qrcodePreview = a.qrcode_image_url
        ? `<div style="margin-top:12px"><img src="${getImageUrl(a.qrcode_image_url)}" alt="二维码" style="max-width:200px;border-radius:8px;box-shadow:var(--shadow)"></div>`
        : '';

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px">
            <div>
                <div class="card" style="margin-bottom:24px">
                    <div class="card-header"><h2>基本信息</h2></div>
                    <div class="card-body">
                        <form id="album-form">
                            <div class="form-group">
                                <label class="form-label">画册标题 <span class="required">*</span></label>
                                <input type="text" class="form-input" id="album-title" value="${escapeHtml(a.title)}" placeholder="请输入画册标题" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">画册描述</label>
                                <textarea class="form-textarea" id="album-desc" placeholder="请输入画册描述">${escapeHtml(a.description || '')}</textarea>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                                <div class="form-group">
                                    <label class="form-label">分类</label>
                                    <select class="form-select" id="album-category">
                                        <option value="">请选择分类</option>
                                        ${editAlbumState.categories.map(c => `<option value="${c.id}" ${a.category_id == c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label class="form-label">最低访问等级</label>
                                    <select class="form-select" id="album-min-level">
                                        <option value="0" ${a.min_level == 0 ? 'selected' : ''}>公开（所有人可见）</option>
                                        ${editAlbumState.levels.map(l => `<option value="${l.level}" ${a.min_level == l.level ? 'selected' : ''}>${escapeHtml(l.name)}（等级${l.level}）</option>`).join('')}
                                    </select>
                                </div>
                            </div>
                            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
                                <div class="form-group">
                                    <label class="form-label">分享密码</label>
                                    <input type="text" class="form-input" id="album-password" value="${escapeHtml(a.share_password || '')}" placeholder="留空则无密码限制">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">发布状态</label>
                                    <select class="form-select" id="album-status">
                                        <option value="1" ${a.status == 1 ? 'selected' : ''}>已发布</option>
                                        <option value="0" ${a.status == 0 ? 'selected' : ''}>草稿</option>
                                    </select>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <div class="card" style="margin-bottom:24px">
                    <div class="card-header"><h2>封面与背景</h2></div>
                    <div class="card-body">
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
                            <div>
                                <label class="form-label">封面图片</label>
                                ${createUploadArea('cover')}
                                <div id="cover-preview">${coverPreview}</div>
                            </div>
                            <div>
                                <label class="form-label">背景图片</label>
                                ${createUploadArea('background')}
                                <div id="bg-preview">${bgPreview}</div>
                                ${editAlbumState.backgrounds.length > 0 ? `
                                    <div style="margin-top:16px">
                                        <label class="form-label">或从图库选择背景</label>
                                        <div class="bg-grid">
                                            ${editAlbumState.backgrounds.map(bg => `
                                                <div class="bg-grid-item ${a.background_image === bg.path ? 'selected' : ''}" onclick="selectBackground('${bg.path}','${getImageUrl(bg.url || bg.path)}')">
                                                    <img src="${getImageUrl(bg.url || bg.path)}" alt="${escapeHtml(bg.name)}" onerror="this.parentElement.style.display='none'">
                                                    <div class="bg-check">&#10004;</div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
            </div>

                ${id ? `
                <div class="card" style="margin-bottom:24px">
                    <div class="card-header">
                        <h2>&#127925; 音频设置</h2>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label class="form-label">
                                <input type="checkbox" id="bgm-enabled" ${a.bgm_enabled ? 'checked' : ''} onchange="toggleBgmEnabled()"> 启用背景音乐
                            </label>
                        </div>
                        <div id="bgm-settings" style="${a.bgm_enabled ? '' : 'display:none;opacity:0.5;pointer-events:none'}">
                            <div class="form-group">
                                <label class="form-label">背景音乐（整册循环播放）</label>
                                ${createUploadArea('bgm', 'audio/*', false)}
                                <div id="bgm-preview">${renderAudioPreview('bgm', a.bgm_audio, a.bgm_audio_url, a.title)}</div>
                            </div>
                            <div class="form-group">
                                <label class="form-label">背景音乐音量: <span id="bgm-volume-value">${a.bgm_volume || 80}%</span></label>
                                <input type="range" id="bgm-volume" min="0" max="100" value="${a.bgm_volume || 80}" 
                                    class="form-range" oninput="updateBgmVolume(this.value)">
                            </div>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${id ? `
                <div class="card" style="margin-bottom:24px">
                    <div class="card-header">
                        <h2>画册页面 (${editAlbumState.pages.length})</h2>
                        <div>
                            ${createUploadArea('pages')}
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="pages-grid" id="pages-grid">
                            ${editAlbumState.pages.length === 0 ? renderEmpty('暂无页面，请上传图片添加页面') : ''}
                            ${editAlbumState.pages.map((p, i) => `
                                <div class="page-card" data-id="${p.id}">
                                    <div class="page-card-image">
                                        <img src="${getImageUrl(p.image_url || p.image)}" alt="第${i + 1}页" onerror="this.src='${getPlaceholderImage()}'">
                                        <span class="page-card-number">第${p.page_number}页</span>
                                    </div>
                                    <div class="page-card-narration">
                                        <div class="narration-header">
                                            <span class="narration-icon">&#127908;</span>
                                            <span class="narration-label">语音解说</span>
                                        </div>
                                        <div class="narration-controls" id="narration-preview-${p.id}">
                                            ${renderPageNarrationPreview(p)}
                                        </div>
                                        ${!p.narration_audio ? `
                                        <div class="narration-upload">
                                            ${createUploadArea('narration-' + p.id, 'audio/*', false)}
                                        </div>
                                        ` : ''}
                                    </div>
                                    <div class="page-card-actions">
                                        <button class="btn btn-sm btn-danger" onclick="deleteAlbumPage(${id},${p.id})">&#128465; 删除</button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>

            <div>
                <div class="card" style="margin-bottom:24px;position:sticky;top:88px">
                    <div class="card-header"><h2>二维码</h2></div>
                    <div class="card-body">
                        <div class="form-group">
                            <label class="form-label">二维码Logo</label>
                            ${createUploadArea('logo')}
                            <div id="logo-preview">${logoPreview}</div>
                        </div>
                        <div class="form-group">
                            <label class="form-label">文字行1</label>
                            <input type="text" class="form-input" id="qr-text1" value="${escapeHtml(a.qrcode_text_line1 || '')}" placeholder="二维码下方第一行文字">
                        </div>
                        <div class="form-group">
                            <label class="form-label">文字行2</label>
                            <input type="text" class="form-input" id="qr-text2" value="${escapeHtml(a.qrcode_text_line2 || '')}" placeholder="二维码下方第二行文字">
                        </div>
                        ${id ? `<button class="btn btn-secondary" onclick="generateQrcode(${id})" style="width:100%;margin-bottom:16px" id="qr-gen-btn">&#128290; 生成二维码</button>` : '<p style="font-size:13px;color:var(--gray-400)">请先保存画册后生成二维码</p>'}
                        <div id="qrcode-preview">${qrcodePreview}</div>
                        <hr style="margin:20px 0;border:none;border-top:1px solid var(--gray-200)">
                        <button class="btn btn-primary btn-lg" onclick="saveAlbum(${id || 'null'})" style="width:100%" id="save-album-btn">
                            ${id ? '&#128190; 保存修改' : '&#43; 创建画册'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    if (id && editAlbumState.pages.length > 0) {
        setTimeout(() => {
            editAlbumState.pages.forEach(p => {
                if (!p.narration_audio) {
                    setupDynamicNarrationUpload(p.id);
                }
            });
        }, 100);
    }
}

window._albumCoverPath = null;
window._albumBgPath = null;
window._albumLogoPath = null;
window._albumBgmPath = null;
window._pageNarrationPaths = {};

window.onUploadComplete_cover = function (results) {
    if (results.length > 0) {
        window._albumCoverPath = results[0].path;
        document.getElementById('cover-preview').innerHTML = `
            <div class="upload-preview"><div class="upload-preview-item">
                <img src="${getImageUrl(results[0].url || results[0].path)}" alt="封面">
            </div></div>
        `;
        showToast('封面上传成功', 'success');
    }
};

window.onUploadComplete_background = function (results) {
    if (results.length > 0) {
        window._albumBgPath = results[0].path;
        document.getElementById('bg-preview').innerHTML = `
            <div class="upload-preview"><div class="upload-preview-item">
                <img src="${getImageUrl(results[0].url || results[0].path)}" alt="背景">
            </div></div>
        `;
        showToast('背景上传成功', 'success');
    }
};

window.onUploadComplete_logo = function (results) {
    if (results.length > 0) {
        window._albumLogoPath = results[0].path;
        document.getElementById('logo-preview').innerHTML = `
            <div class="upload-preview"><div class="upload-preview-item">
                <img src="${getImageUrl(results[0].url || results[0].path)}" alt="Logo">
            </div></div>
        `;
        showToast('Logo上传成功', 'success');
    }
};

window.onUploadComplete_pages = function (results) {
    if (results.length > 0) {
        const hash = window.location.hash;
        const match = hash.match(/\/admin\/albums\/edit\/(\d+)/);
        if (!match) return;
        const albumId = match[1];
        addPagesSequentially(albumId, results, 0);
    }
};

async function addPagesSequentially(albumId, results, index) {
    if (index >= results.length) {
        showToast(`成功添加 ${results.length} 个页面`, 'success');
        initAdminAlbumEdit(albumId);
        return;
    }
    try {
        await api.admin.addPage(albumId, { image: results[index].path });
        addPagesSequentially(albumId, results, index + 1);
    } catch (e) {
        showToast(`第 ${index + 1} 个页面添加失败`, 'error');
        addPagesSequentially(albumId, results, index + 1);
    }
}

function selectBackground(path, url) {
    window._albumBgPath = path;
    document.getElementById('bg-preview').innerHTML = `
        <div class="upload-preview"><div class="upload-preview-item">
            <img src="${url}" alt="背景">
        </div></div>
    `;
    document.querySelectorAll('.bg-grid-item').forEach(el => el.classList.remove('selected'));
    event.currentTarget.classList.add('selected');
    showToast('背景图片已选择', 'success');
}

async function saveAlbum(id) {
    const title = document.getElementById('album-title').value.trim();
    if (!title) {
        showToast('请输入画册标题', 'warning');
        return;
    }

    const btn = document.getElementById('save-album-btn');
    btn.disabled = true;
    btn.innerHTML = '&#8987; 保存中...';

    const data = {
        title,
        description: document.getElementById('album-desc').value.trim(),
        category_id: document.getElementById('album-category').value || null,
        min_level: parseInt(document.getElementById('album-min-level').value) || 0,
        share_password: document.getElementById('album-password').value.trim(),
        status: parseInt(document.getElementById('album-status').value),
        qrcode_text_line1: document.getElementById('qr-text1').value.trim(),
        qrcode_text_line2: document.getElementById('qr-text2').value.trim(),
    };

    if (window._albumCoverPath) data.cover_image = window._albumCoverPath;
    if (window._albumBgPath) data.background_image = window._albumBgPath;
    if (window._albumLogoPath) data.qrcode_logo = window._albumLogoPath;
    if (window._albumBgmPath !== null) data.bgm_audio = window._albumBgmPath;
    if (document.getElementById('bgm-volume')) data.bgm_volume = parseInt(document.getElementById('bgm-volume').value) || 80;
    data.bgm_enabled = document.getElementById('bgm-enabled') ? (document.getElementById('bgm-enabled').checked ? 1 : 0) : 1;

    try {
        if (id) {
            await api.admin.updateAlbum(id, data);
            showToast('画册更新成功', 'success');
            window._albumCoverPath = null;
            window._albumBgPath = null;
            window._albumLogoPath = null;
            window._albumBgmPath = null;
            window._pageNarrationPaths = {};
        } else {
            const res = await api.admin.createAlbum(data);
            showToast('画册创建成功', 'success');
            window.location.hash = `#/admin/albums/edit/${res.data.id}`;
        }
    } catch (e) {
    } finally {
        btn.disabled = false;
        btn.innerHTML = id ? '&#128190; 保存修改' : '&#43; 创建画册';
    }
}

async function generateQrcode(albumId) {
    const btn = document.getElementById('qr-gen-btn');
    btn.disabled = true;
    btn.innerHTML = '&#8987; 生成中...';

    try {
        const data = {
            album_id: albumId,
            text_line1: document.getElementById('qr-text1').value.trim(),
            text_line2: document.getElementById('qr-text2').value.trim(),
            frontend_url: window.location.origin,
        };
        if (window._albumLogoPath) data.logo = window._albumLogoPath;
        else if (editAlbumState.album && editAlbumState.album.qrcode_logo) data.logo = editAlbumState.album.qrcode_logo;

        const res = await api.admin.generateQrcode(data);
        document.getElementById('qrcode-preview').innerHTML = `
            <div style="margin-top:12px;text-align:center">
                <img src="${getImageUrl(res.data.url || res.data.path)}" alt="二维码" style="max-width:200px;border-radius:8px;box-shadow:var(--shadow)">
                <p style="margin-top:8px;font-size:13px;color:var(--gray-500)">二维码已生成并保存</p>
            </div>
        `;
        showToast('二维码生成成功', 'success');
    } catch (e) {
    } finally {
        btn.disabled = false;
        btn.innerHTML = '&#128290; 生成二维码';
    }
}

async function deleteAlbumPage(albumId, pageId) {
    showConfirmModal('删除页面', '确定要删除此页面吗？', async () => {
        try {
            await api.admin.deletePage(albumId, pageId);
            showToast('页面删除成功', 'success');
            initAdminAlbumEdit(albumId);
        } catch (e) {}
    });
}

function renderAudioPreview(type, path, url, name) {
    if (!path && !url) return '';
    const audioUrl = url || getImageUrl(path);
    const displayName = name || '音频文件';
    return `
        <div class="audio-preview-card">
            <div class="audio-preview-info">
                <span class="audio-preview-icon">&#127925;</span>
                <div class="audio-preview-text">
                    <div class="audio-preview-name">${escapeHtml(displayName)}</div>
                    <div class="audio-preview-url" style="font-size:11px;color:var(--gray-400);word-break:break-all">${audioUrl}</div>
                </div>
            </div>
            <div class="audio-preview-actions">
                <button class="btn btn-sm btn-secondary" onclick="playAudioPreview('${audioUrl}')" title="试听">&#9654; 试听</button>
                <button class="btn btn-sm btn-danger" onclick="delete${type.charAt(0).toUpperCase() + type.slice(1)}Audio('${path}')" title="删除">&#128465; 删除</button>
            </div>
        </div>
    `;
}

function renderPageNarrationPreview(page) {
    if (!page.narration_audio && !page.narration_audio_url) {
        return '<div style="color:var(--gray-400);font-size:12px;padding:8px">暂无语音解说</div>';
    }
    const audioUrl = page.narration_audio_url || getImageUrl(page.narration_audio);
    return `
        <div class="audio-preview-card audio-preview-card-sm">
            <div class="audio-preview-info">
                <span class="audio-preview-icon">&#127908;</span>
                <div class="audio-preview-text">
                    <div class="audio-preview-name">第${page.page_number}页解说</div>
                    ${page.narration_duration ? `<div class="audio-preview-duration" style="font-size:11px;color:var(--gray-400)">时长: ${formatDuration(page.narration_duration)}</div>` : ''}
                </div>
            </div>
            <div class="audio-preview-actions">
                <button class="btn btn-sm btn-secondary" onclick="playAudioPreview('${audioUrl}')" title="试听">&#9654;</button>
                <button class="btn btn-sm btn-danger" onclick="deletePageNarration(${page.id}, '${page.narration_audio}')" title="删除">&#128465;</button>
            </div>
        </div>
    `;
}

function formatDuration(seconds) {
    if (!seconds) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function toggleBgmEnabled() {
    const enabled = document.getElementById('bgm-enabled').checked;
    const settings = document.getElementById('bgm-settings');
    if (enabled) {
        settings.style.display = 'block';
        settings.style.opacity = '1';
        settings.style.pointerEvents = 'auto';
    } else {
        settings.style.display = 'none';
        settings.style.opacity = '0.5';
        settings.style.pointerEvents = 'none';
    }
}

function updateBgmVolume(value) {
    document.getElementById('bgm-volume-value').textContent = value + '%';
}

function playAudioPreview(url) {
    if (editAlbumState.previewAudio) {
        editAlbumState.previewAudio.pause();
        editAlbumState.previewAudio.currentTime = 0;
    }
    
    const audio = new Audio(url);
    editAlbumState.previewAudio = audio;
    
    audio.addEventListener('ended', () => {
        editAlbumState.previewAudio = null;
    });
    
    audio.addEventListener('error', () => {
        showToast('音频加载失败，请检查文件', 'error');
        editAlbumState.previewAudio = null;
    });
    
    audio.play().catch(e => {
        showToast('音频播放失败', 'error');
        editAlbumState.previewAudio = null;
    });
    
    showToast('开始播放', 'success');
}

function stopAudioPreview() {
    if (editAlbumState.previewAudio) {
        editAlbumState.previewAudio.pause();
        editAlbumState.previewAudio.currentTime = 0;
        editAlbumState.previewAudio = null;
    }
}

window.onUploadComplete_bgm = function (results) {
    if (results.length > 0) {
        window._albumBgmPath = results[0].path;
        document.getElementById('bgm-preview').innerHTML = renderAudioPreview('bgm', results[0].path, results[0].url, results[0].name);
        showToast('背景音乐上传成功', 'success');
    }
};

window.onbeforeunload = function() {
    stopAudioPreview();
};

async function deleteBgmAudio(path) {
    showConfirmModal('删除音频', '确定要删除背景音乐吗？', async () => {
        try {
            await api.upload.deleteAudio(path);
            window._albumBgmPath = '';
            if (editAlbumState.album) {
                editAlbumState.album.bgm_audio = '';
                editAlbumState.album.bgm_audio_url = '';
            }
            document.getElementById('bgm-preview').innerHTML = '';
            showToast('背景音乐已删除', 'success');
        } catch (e) {}
    });
}

async function deletePageNarration(pageId, path) {
    showConfirmModal('删除音频', '确定要删除此页面的语音解说吗？', async () => {
        try {
            if (path) {
                await api.upload.deleteAudio(path);
            }
            await api.admin.updatePage(editAlbumState.album.id, pageId, {
                narration_audio: '',
                narration_duration: 0
            });
            const page = editAlbumState.pages.find(p => p.id === pageId);
            if (page) {
                page.narration_audio = '';
                page.narration_audio_url = '';
                page.narration_duration = 0;
            }
            delete window._pageNarrationPaths[pageId];
            document.getElementById(`narration-preview-${pageId}`).innerHTML = renderPageNarrationPreview(page);
            const uploadAreaId = `upload-area-narration-${pageId}`;
            let uploadArea = document.getElementById(uploadAreaId);
            if (!uploadArea) {
                const container = document.querySelector(`[data-id="${pageId}"] .narration-upload`);
                if (container) {
                    container.innerHTML = createUploadArea('narration-' + pageId, 'audio/*', false);
                    setupDynamicNarrationUpload(pageId);
                }
            }
            showToast('语音解说已删除', 'success');
        } catch (e) {}
    });
}

function setupDynamicNarrationUpload(pageId) {
    const fileInput = document.getElementById(`file-input-narration-${pageId}`);
    if (fileInput) {
        fileInput.onchange = function(e) {
            handleNarrationFileSelect(e, pageId);
        };
    }
    
    const uploadArea = document.getElementById(`upload-area-narration-${pageId}`);
    if (uploadArea) {
        uploadArea.ondrop = function(e) {
            e.preventDefault();
            e.currentTarget.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length) {
                uploadNarrationFile(files[0], pageId);
            }
        };
    }
}

function handleNarrationFileSelect(event, pageId) {
    const files = event.target.files;
    if (!files.length) return;
    uploadNarrationFile(files[0], pageId);
}

async function uploadNarrationFile(file, pageId) {
    const uploadArea = document.getElementById(`upload-area-narration-${pageId}`);
    if (uploadArea) {
        uploadArea.innerHTML = '<div class="loading"><div class="spinner"></div></div><p style="margin-top:8px;font-size:13px;color:var(--gray-500)">上传中...</p>';
    }
    
    try {
        const res = await api.upload.audio(file, 'narration');
        if (res.data) {
            window._pageNarrationPaths[pageId] = res.data.path;
            
            const tempAudio = new Audio(res.data.url || getImageUrl(res.data.path));
            tempAudio.addEventListener('loadedmetadata', async () => {
                const duration = Math.round(tempAudio.duration);
                
                try {
                    await api.admin.updatePage(editAlbumState.album.id, pageId, {
                        narration_audio: res.data.path,
                        narration_duration: duration
                    });
                    
                    const page = editAlbumState.pages.find(p => p.id === pageId);
                    if (page) {
                        page.narration_audio = res.data.path;
                        page.narration_audio_url = res.data.url || getImageUrl(res.data.path);
                        page.narration_duration = duration;
                    }
                    
                    document.getElementById(`narration-preview-${pageId}`).innerHTML = renderPageNarrationPreview(page);
                    
                    if (uploadArea) {
                        uploadArea.parentElement.style.display = 'none';
                    }
                    
                    showToast('语音解说上传成功', 'success');
                } catch (e) {
                    if (uploadArea) {
                        uploadArea.innerHTML = `
                            <div class="upload-area-icon">&#127925;</div>
                            <h4>点击或拖拽上传音频</h4>
                            <p>支持 MP3、WAV、OGG、M4A、AAC 格式，最大 50MB</p>
                        `;
                    }
                }
            });
            
            tempAudio.addEventListener('error', async () => {
                try {
                    await api.admin.updatePage(editAlbumState.album.id, pageId, {
                        narration_audio: res.data.path,
                        narration_duration: 0
                    });
                    
                    const page = editAlbumState.pages.find(p => p.id === pageId);
                    if (page) {
                        page.narration_audio = res.data.path;
                        page.narration_audio_url = res.data.url || getImageUrl(res.data.path);
                        page.narration_duration = 0;
                    }
                    
                    document.getElementById(`narration-preview-${pageId}`).innerHTML = renderPageNarrationPreview(page);
                    
                    if (uploadArea) {
                        uploadArea.parentElement.style.display = 'none';
                    }
                    
                    showToast('语音解说上传成功（无法获取时长）', 'success');
                } catch (e) {
                    if (uploadArea) {
                        uploadArea.innerHTML = `
                            <div class="upload-area-icon">&#127925;</div>
                            <h4>点击或拖拽上传音频</h4>
                            <p>支持 MP3、WAV、OGG、M4A、AAC 格式，最大 50MB</p>
                        `;
                    }
                }
            });
        }
    } catch (e) {
        if (uploadArea) {
            uploadArea.innerHTML = `
                <div class="upload-area-icon">&#127925;</div>
                <h4>点击或拖拽上传音频</h4>
                <p>支持 MP3、WAV、OGG、M4A、AAC 格式，最大 50MB</p>
            `;
        }
    }
}
