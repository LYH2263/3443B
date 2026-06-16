let viewerState = { album: null, pages: [], currentPage: 1, needPassword: false, flipbookReady: false, audioManager: null, hasAudio: false, recommendations: [] };

function renderViewerPage(id) {
    return `
        <div class="viewer-page">
            <div class="viewer-header">
                <button class="viewer-back" onclick="window.location.hash='#/'">&#8592; 返回画册列表</button>
                <h2 id="viewer-title">加载中...</h2>
                <div style="width:80px"></div>
            </div>
            <div class="viewer-container" id="viewer-container">
                <div class="viewer-bg" id="viewer-bg"></div>
                <div id="flipbook-wrapper">
                    <div id="viewer-loading">${renderLoading()}</div>
                    <div id="flipbook" style="display:none"></div>
                </div>
                <div class="viewer-password" id="viewer-password" style="display:none">
                    <div class="viewer-password-box">
                        <h3>&#128274; 需要访问密码</h3>
                        <p>此画册需要输入分享密码才能查看</p>
                        <div class="form-group">
                            <input type="password" class="form-input" id="pwd-input" placeholder="请输入分享密码"
                                onkeydown="if(event.key==='Enter')verifyAlbumPassword(${id})">
                        </div>
                        <button class="btn btn-primary" onclick="verifyAlbumPassword(${id})" style="width:100%">验证密码</button>
                    </div>
                </div>
            </div>
            <div class="viewer-controls" id="viewer-controls" style="display:none">
                <button onclick="flipPrev()">&#9664; 上一页</button>
                <span class="page-indicator" id="page-indicator">1 / 1</span>
                <button onclick="flipNext()">下一页 &#9654;</button>
                <button onclick="toggleFullscreen()" style="margin-left:16px" title="全屏">&#9974;</button>
            </div>
            <div id="audio-control" class="audio-control" style="display:none">
                <button id="audio-mute-btn" class="audio-mute-btn" onclick="toggleAudioMute()" title="静音/播放">
                    <span id="audio-icon">&#128266;</span>
                </button>
            </div>
            <div id="recommendations-section" class="recommendations-section" style="display:none">
                <h3 class="recommendations-title">&#128218; 相关推荐</h3>
                <div class="recommendations-grid" id="recommendations-grid"></div>
            </div>
        </div>
    `;
}

window._viewerAudioCleanup = null;

function initViewerAudioCleanup() {
    if (viewerState.audioManager) {
        viewerState.audioManager.destroy();
        viewerState.audioManager = null;
    }
    viewerState.hasAudio = false;
    const audioControl = document.getElementById('audio-control');
    if (audioControl) {
        audioControl.style.display = 'none';
    }
}

function setupViewerAudio(data) {
    viewerState.album = data.album;
    viewerState.pages = data.pages || [];
    
    if (window._viewerAudioCleanup) {
        window._viewerAudioCleanup();
    }
    
    viewerState.audioManager = new AudioManager();
    window._viewerAudioCleanup = initViewerAudioCleanup;
    
    const hasBgm = data.album.bgm_audio_url && data.album.bgm_enabled;
    const hasNarration = viewerState.pages.some(p => p.narration_audio_url);
    viewerState.hasAudio = hasBgm || hasNarration;
    
    if (viewerState.hasAudio) {
        const audioControl = document.getElementById('audio-control');
        if (audioControl) {
            audioControl.style.display = 'flex';
        }
        
        viewerState.audioManager.init(
            data.album.bgm_audio_url,
            data.album.bgm_volume,
            data.album.bgm_enabled
        );
        
        updateAudioMuteIcon();
    }
    
    document.getElementById('viewer-title').textContent = data.album.title || '画册';
    document.getElementById('viewer-loading').style.display = 'none';
    
    if (data.album.background_image_url) {
        document.getElementById('viewer-bg').style.backgroundImage = `url(${getImageUrl(data.album.background_image_url})`;
    }
    
    if (viewerState.pages.length === 0) {
        document.getElementById('flipbook-wrapper').innerHTML = renderEmpty('该画册暂无页面内容');
        return;
    }
    
    const flipbook = document.getElementById('flipbook');
    flipbook.style.display = 'block';
    flipbook.innerHTML = '';
    
    viewerState.pages.forEach((page, index) => {
        const pageEl = document.createElement('div');
        pageEl.className = 'page';
        if (page.image_url) {
            pageEl.innerHTML = `<img src="${getImageUrl(page.image_url)}" alt="第${index + 1}页" loading="lazy">`;
        } else {
            pageEl.innerHTML = `<div class="page-content"><h3>${escapeHtml(page.title || '第' + (index + 1) + '页')}</h3></div>`;
        }
        flipbook.appendChild(pageEl);
    });
    
    document.getElementById('viewer-controls').style.display = 'flex';
    
    loadRecommendations(viewerState.album.id);

    setTimeout(() => {
        initFlipbook();
    }, 100);
}

function updateAudioMuteIcon() {
    const icon = document.getElementById('audio-icon');
    if (icon && viewerState.audioManager) {
        icon.textContent = viewerState.audioManager.isMuted ? '&#128263;' : '&#128266;';
    }
}

function toggleAudioMute() {
    if (viewerState.audioManager) {
        const isMuted = viewerState.audioManager.toggleMute();
        updateAudioMuteIcon();
        showToast(isMuted ? '已静音' : '已开启声音', 'success');
    }
}

function playPageNarration(pageNumber) {
    if (viewerState.audioManager && viewerState.flipbookReady) {
        const page = viewerState.pages[pageNumber - 1];
        if (page && page.narration_audio_url) {
            viewerState.audioManager.playNarration(getImageUrl(page.narration_audio_url));
        } else {
            viewerState.audioManager.stopNarration();
        }
    }
}

async function initViewerPage(id) {
    viewerState = { album: null, pages: [], currentPage: 1, needPassword: false, flipbookReady: false, audioManager: null, hasAudio: false, recommendations: [] };

    const assignment = getAbAssignment(id);
    if (assignment) {
        const fp = getVisitorFingerprint();
        api.public.abClick({
            experiment_id: assignment.experiment_id,
            fingerprint: fp,
            variant: assignment.variant
        }).catch(() => {});
    }

    try {
        const res = await api.public.albumDetail(id);
        if (res.data.need_password) {
            viewerState.needPassword = true;
            viewerState.album = res.data.album;
            document.getElementById('viewer-title').textContent = res.data.album.title || '画册';
            document.getElementById('viewer-loading').style.display = 'none';
            document.getElementById('viewer-password').style.display = 'flex';
            return;
        }
        setupViewerAudio(res.data);
    } catch (e) {
        document.getElementById('viewer-loading').innerHTML = renderEmpty('画册加载失败');
    }
}

async function verifyAlbumPassword(id) {
    const pwd = document.getElementById('pwd-input').value.trim();
    if (!pwd) {
        showToast('请输入分享密码', 'warning');
        return;
    }
    try {
        const res = await api.public.albumDetail(id, pwd);
        if (res.data.need_password) {
            showToast('密码不正确', 'error');
            return;
        }
        document.getElementById('viewer-password').style.display = 'none';
        setupViewerAudio(res.data);
    } catch (e) {}
}

function initFlipbook() {
    const flipbook = $('#flipbook');
    const container = document.getElementById('viewer-container');
    const containerWidth = container.clientWidth - 40;
    const containerHeight = container.clientHeight - 40;

    let width = Math.min(800, containerWidth);
    let height = Math.min(500, containerHeight);

    if (window.innerWidth <= 768) {
        width = containerWidth;
        height = width * 0.65;
    }

    flipbook.turn({
        width: width,
        height: height,
        autoCenter: true,
        elevation: 50,
        gradients: true,
        duration: 1000,
        acceleration: true,
        when: {
            turning: function (event, page, view) {
                viewerState.currentPage = page;
                updatePageIndicator();
                if (viewerState.audioManager) {
                    viewerState.audioManager.stopNarration();
                }
            },
            turned: function (event, page, view) {
                viewerState.currentPage = page;
                updatePageIndicator();
                setTimeout(() => {
                    playPageNarration(page);
                }, 100);
            }
        }
    });

    viewerState.flipbookReady = true;
    updatePageIndicator();
    
    setTimeout(() => {
        playPageNarration(viewerState.currentPage);
    }, 500);
}

function updatePageIndicator() {
    const indicator = document.getElementById('page-indicator');
    if (indicator && viewerState.flipbookReady) {
        const total = $('#flipbook').turn('pages');
        indicator.textContent = `${viewerState.currentPage} / ${total}`;
    }
}

function flipPrev() {
    if (viewerState.flipbookReady) {
        $('#flipbook').turn('previous');
    }
}

function flipNext() {
    if (viewerState.flipbookReady) {
        $('#flipbook').turn('next');
    }
}

function toggleFullscreen() {
    const el = document.querySelector('.viewer-page');
    if (!document.fullscreenElement) {
        el.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen();
    }
}

async function loadRecommendations(albumId) {
    try {
        const res = await api.public.albumRecommend(albumId, 6);
        viewerState.recommendations = res.data || [];
        renderRecommendations();
    } catch (e) {
        viewerState.recommendations = [];
    }
}

function renderRecommendations() {
    const section = document.getElementById('recommendations-section');
    const grid = document.getElementById('recommendations-grid');
    if (!section || !grid) return;

    if (viewerState.recommendations.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    grid.innerHTML = viewerState.recommendations.map(rec => {
        const coverUrl = rec.cover_image_url ? getImageUrl(rec.cover_image_url) : getPlaceholderImage();
        const tags = (rec.tags || []).slice(0, 3).map(t =>
            `<span class="rec-tag">${escapeHtml(t.name)}</span>`
        ).join('');

        return `
            <div class="rec-card" onclick="window.location.hash='#/viewer/${rec.id}'">
                <div class="rec-card-image">
                    <img src="${coverUrl}" alt="${escapeHtml(rec.title)}" onerror="this.src='${getPlaceholderImage()}'">
                </div>
                <div class="rec-card-body">
                    <div class="rec-card-title">${escapeHtml(rec.title)}</div>
                    <div class="rec-card-meta">
                        <span>&#128065; ${rec.view_count || 0}</span>
                        <span>&#128196; ${rec.page_count || 0}页</span>
                    </div>
                    ${tags ? `<div class="rec-card-tags">${tags}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');
}

window.addEventListener('resize', debounce(() => {
    if (viewerState.flipbookReady) {
        const container = document.getElementById('viewer-container');
        if (!container) return;
        const containerWidth = container.clientWidth - 40;
        let width = Math.min(800, containerWidth);
        let height = width * 0.625;
        if (window.innerWidth <= 768) {
            width = containerWidth;
            height = width * 0.65;
        }
        $('#flipbook').turn('size', width, height);
    }
}, 300));
