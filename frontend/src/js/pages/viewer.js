let viewerState = {
    album: null, pages: [], currentPage: 1, needPassword: false, flipbookReady: false,
    audioManager: null, hasAudio: false, recommendations: [], comments: [],
    commentsPage: 1, commentsLimit: 10, commentsSort: 'time', commentsTotal: 0,
    commentsTotalCount: 0, commentsLoading: false, replyingTo: null,
    jumpPageBuffer: '', jumpPageTimeout: null, isFullscreen: false,
    zoomLevel: 1, gestureStartX: 0, gestureStartY: 0, gestureStartTime: 0,
    lastTapTime: 0, isDraggingTurnJs: false, keyboardHandlersBound: false,
    gestureHandlersBound: false
};

function renderViewerPage(id) {
    return `
        <div class="viewer-page" id="viewer-page-root">
            <div class="viewer-header">
                <button class="viewer-back" onclick="window.location.hash='#/'">&#8592; 返回画册列表</button>
                <h2 id="viewer-title">加载中...</h2>
                <div style="width:80px"></div>
            </div>
            <div class="viewer-container" id="viewer-container" tabindex="0" aria-label="画册阅读区域，使用键盘左右方向键翻页">
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
                <div class="viewer-jump-hint" id="viewer-jump-hint" style="display:none"></div>
            </div>
            <div class="viewer-controls" id="viewer-controls" style="display:none">
                <button onclick="flipPrev()" aria-label="上一页">&#9664; 上一页</button>
                <span class="page-indicator" id="page-indicator" tabindex="0" aria-live="polite">1 / 1</span>
                <button onclick="flipNext()" aria-label="下一页">下一页 &#9654;</button>
                <button onclick="toggleFullscreen()" style="margin-left:16px" title="全屏 (F)" aria-label="全屏切换">&#9974;</button>
                <button class="viewer-help-btn" onclick="showKeyboardHelpPanel()" title="快捷键帮助 (?)" aria-label="显示快捷键帮助">?</button>
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
            <div id="comments-section" class="comments-section" style="display:none">
                <div class="comments-header">
                    <h3 class="comments-title">&#128172; 评论 <span id="comments-count" class="comments-count">0</span></h3>
                    <div class="comments-sort">
                        <button class="sort-btn active" data-sort="time" onclick="switchCommentSort('time')">最新</button>
                        <button class="sort-btn" data-sort="hot" onclick="switchCommentSort('hot')">最热</button>
                    </div>
                </div>
                <div class="comment-input-wrapper">
                    <div id="comment-input-area" class="comment-input-area">
                    </div>
                </div>
                <div id="comments-list" class="comments-list">
                    <div class="comments-loading">加载中...</div>
                </div>
                <div id="comments-load-more" class="comments-load-more" style="display:none">
                    <button class="btn btn-secondary" onclick="loadMoreComments()">加载更多评论</button>
                </div>
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
    if (window._viewerInteractionsCleanup) {
        window._viewerInteractionsCleanup();
    }
    
    viewerState.audioManager = new AudioManager();
    window._viewerAudioCleanup = initViewerAudioCleanup;
    window._viewerInteractionsCleanup = cleanupViewerInteractions;
    
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
    initComments(viewerState.album.id);

    setTimeout(() => {
        initFlipbook();
        initViewerInteractions();
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

    const hash = window.location.hash;
    const queryIdx = hash.indexOf('?');
    let shareToken = '';
    if (queryIdx !== -1) {
        const params = new URLSearchParams(hash.substring(queryIdx + 1));
        shareToken = params.get('share_token') || '';
    }

    try {
        const res = await api.public.albumDetail(id, null, shareToken);
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
                        <span>&#128172; ${rec.comment_count || 0}</span>
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

function initComments(albumId) {
    const section = document.getElementById('comments-section');
    if (section) section.style.display = 'block';

    renderCommentInput();
    loadComments(albumId, 1);
}

function renderCommentInput() {
    const inputArea = document.getElementById('comment-input-area');
    if (!inputArea) return;

    const user = getUser();
    const loggedIn = isLoggedIn();

    if (!loggedIn) {
        inputArea.innerHTML = `
            <div class="comment-login-prompt">
                <p>请先登录后发表评论</p>
                <button class="btn btn-primary btn-sm" onclick="window.location.hash='#/login'">立即登录</button>
            </div>
        `;
        return;
    }

    const avatarUrl = user && user.avatar ? getImageUrl(user.avatar) : '';
    const avatarContent = avatarUrl
        ? `<img src="${avatarUrl}" alt="" class="comment-avatar">`
        : `<div class="comment-avatar comment-avatar-default">${escapeHtml((user.nickname || user.username || 'U').charAt(0).toUpperCase())}</div>`;

    inputArea.innerHTML = `
        <div class="comment-input-box">
            ${avatarContent}
            <div class="comment-input-main">
                <textarea class="comment-textarea" id="comment-textarea" placeholder="写下你的评论..." maxlength="1000"></textarea>
                <div class="comment-input-actions">
                    <span class="comment-count-hint" id="comment-count-hint">0/1000</span>
                    <button class="btn btn-primary btn-sm" onclick="submitComment()">发表评论</button>
                </div>
            </div>
        </div>
    `;

    const textarea = document.getElementById('comment-textarea');
    if (textarea) {
        textarea.addEventListener('input', function() {
            const count = this.value.length;
            const hint = document.getElementById('comment-count-hint');
            if (hint) hint.textContent = `${count}/1000`;
        });
    }
}

async function loadComments(albumId, page) {
    const listEl = document.getElementById('comments-list');
    if (!listEl) return;

    if (page === 1) {
        listEl.innerHTML = '<div class="comments-loading">加载中...</div>';
    }

    viewerState.commentsLoading = true;

    try {
        const res = await api.public.comments(albumId, {
            page: page,
            limit: viewerState.commentsLimit,
            sort: viewerState.commentsSort
        });

        viewerState.commentsTotal = res.data.total;
        viewerState.commentsTotalCount = res.data.total_count;
        viewerState.commentsPage = page;

        if (page === 1) {
            viewerState.comments = res.data.list;
        } else {
            viewerState.comments = viewerState.comments.concat(res.data.list);
        }

        renderComments();
        updateCommentsCount();
    } catch (e) {
        if (page === 1) {
            listEl.innerHTML = '<div class="comments-empty">评论加载失败</div>';
        }
    } finally {
        viewerState.commentsLoading = false;
    }
}

function updateCommentsCount() {
    const countEl = document.getElementById('comments-count');
    if (countEl) {
        countEl.textContent = `(${viewerState.commentsTotalCount})`;
    }
}

function renderComments() {
    const listEl = document.getElementById('comments-list');
    const loadMoreEl = document.getElementById('comments-load-more');
    if (!listEl) return;

    if (viewerState.comments.length === 0) {
        listEl.innerHTML = '<div class="comments-empty">暂无评论，快来发表第一条评论吧~</div>';
        if (loadMoreEl) loadMoreEl.style.display = 'none';
        return;
    }

    listEl.innerHTML = viewerState.comments.map(comment => renderCommentItem(comment)).join('');

    const hasMore = viewerState.comments.length < viewerState.commentsTotal;
    if (loadMoreEl) {
        loadMoreEl.style.display = hasMore ? 'block' : 'none';
    }
}

function renderCommentItem(comment) {
    const user = comment.user_info || {};
    const avatarUrl = user.avatar ? getImageUrl(user.avatar) : '';
    const avatarContent = avatarUrl
        ? `<img src="${avatarUrl}" alt="" class="comment-avatar">`
        : `<div class="comment-avatar comment-avatar-default">${escapeHtml((user.nickname || 'U').charAt(0).toUpperCase())}</div>`;

    const currentUser = getUser();
    const isOwner = currentUser && currentUser.id === user.id;

    const pinnedBadge = comment.is_pinned ? '<span class="comment-pinned-badge">&#128204; 置顶</span>' : '';

    const repliesHtml = comment.replies && comment.replies.length > 0
        ? `<div class="comment-replies">${comment.replies.map(r => renderReplyItem(r)).join('')}</div>`
        : '';

    const moreRepliesBtn = comment.has_more_replies
        ? `<div class="comment-more-replies" onclick="loadMoreReplies(${comment.id})">查看全部 ${comment.reply_total} 条回复</div>`
        : '';

    const replyInputHtml = viewerState.replyingTo && viewerState.replyingTo.commentId === comment.id
        ? renderReplyInput(comment)
        : '';

    return `
        <div class="comment-item" id="comment-${comment.id}">
            ${avatarContent}
            <div class="comment-main">
                <div class="comment-header">
                    <span class="comment-nickname">${escapeHtml(user.nickname || '匿名用户')}</span>
                    ${pinnedBadge}
                    <span class="comment-time">${formatRelativeTime(comment.created_at)}</span>
                </div>
                <div class="comment-content">${escapeHtml(comment.content)}</div>
                <div class="comment-actions">
                    <button class="comment-action-btn" onclick="toggleReplyInput(${comment.id})">
                        &#128172; 回复
                    </button>
                    ${isOwner ? `<button class="comment-action-btn comment-delete-btn" onclick="deleteComment(${comment.id})">
                        &#128465; 删除
                    </button>` : ''}
                </div>
                ${replyInputHtml}
                ${repliesHtml}
                ${moreRepliesBtn}
            </div>
        </div>
    `;
}

function renderReplyItem(reply) {
    const user = reply.user_info || {};
    const replyToUser = reply.reply_to_user_info;

    const avatarUrl = user.avatar ? getImageUrl(user.avatar) : '';
    const avatarContent = avatarUrl
        ? `<img src="${avatarUrl}" alt="" class="comment-avatar comment-avatar-small">`
        : `<div class="comment-avatar comment-avatar-small comment-avatar-default">${escapeHtml((user.nickname || 'U').charAt(0).toUpperCase())}</div>`;

    const currentUser = getUser();
    const isOwner = currentUser && currentUser.id === user.id;

    const replyToText = replyToUser
        ? ` <span class="comment-reply-to">回复 ${escapeHtml(replyToUser.nickname)}</span>`
        : '';

    return `
        <div class="comment-reply-item" id="comment-${reply.id}">
            ${avatarContent}
            <div class="comment-reply-main">
                <div class="comment-header">
                    <span class="comment-nickname">${escapeHtml(user.nickname || '匿名用户')}</span>
                    ${replyToText}
                    <span class="comment-time">${formatRelativeTime(reply.created_at)}</span>
                </div>
                <div class="comment-content">${escapeHtml(reply.content)}</div>
                <div class="comment-actions">
                    <button class="comment-action-btn" onclick="replyToReply(${reply.parent_id}, ${reply.user_id})">
                        &#128172; 回复
                    </button>
                    ${isOwner ? `<button class="comment-action-btn comment-delete-btn" onclick="deleteComment(${reply.id})">
                        &#128465; 删除
                    </button>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderReplyInput(comment) {
    const user = getUser();
    if (!user) return '';

    const replyToUserId = viewerState.replyingTo.replyToUserId || null;
    const replyToUserNickname = viewerState.replyingTo.replyToUserNickname || '';
    const placeholder = replyToUserNickname ? `回复 @${replyToUserNickname}` : '写下你的回复...';

    return `
        <div class="comment-reply-input">
            <textarea class="comment-textarea comment-textarea-small" 
                id="reply-textarea-${comment.id}" 
                placeholder="${escapeHtml(placeholder)}" 
                maxlength="1000"
                onclick="event.stopPropagation()"></textarea>
            <div class="comment-input-actions">
                <button class="btn btn-secondary btn-sm" onclick="cancelReply(${comment.id})">取消</button>
                <button class="btn btn-primary btn-sm" onclick="submitReply(${comment.id}, ${replyToUserId || 'null'})">发表回复</button>
            </div>
        </div>
    `;
}

function toggleReplyInput(commentId) {
    if (!isLoggedIn()) {
        showToast('请先登录后再回复', 'warning');
        setTimeout(() => { window.location.hash = '#/login'; }, 1000);
        return;
    }

    if (viewerState.replyingTo && viewerState.replyingTo.commentId === commentId) {
        viewerState.replyingTo = null;
    } else {
        viewerState.replyingTo = {
            commentId: commentId,
            replyToUserId: null,
            replyToUserNickname: ''
        };
    }
    renderComments();
}

function replyToReply(parentId, replyToUserId) {
    if (!isLoggedIn()) {
        showToast('请先登录后再回复', 'warning');
        setTimeout(() => { window.location.hash = '#/login'; }, 1000);
        return;
    }

    const parentComment = viewerState.comments.find(c => c.id === parentId);
    let replyToUserNickname = '';
    if (parentComment && parentComment.replies) {
        const reply = parentComment.replies.find(r => r.user_info && r.user_info.id === replyToUserId);
        if (reply && reply.user_info) {
            replyToUserNickname = reply.user_info.nickname || '';
        }
    }

    viewerState.replyingTo = {
        commentId: parentId,
        replyToUserId: replyToUserId,
        replyToUserNickname: replyToUserNickname
    };
    renderComments();

    setTimeout(() => {
        const textarea = document.getElementById(`reply-textarea-${parentId}`);
        if (textarea) textarea.focus();
    }, 50);
}

function cancelReply(commentId) {
    viewerState.replyingTo = null;
    renderComments();
}

async function submitComment() {
    if (!isLoggedIn()) {
        showToast('请先登录后发表评论', 'warning');
        setTimeout(() => { window.location.hash = '#/login'; }, 1000);
        return;
    }

    const textarea = document.getElementById('comment-textarea');
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) {
        showToast('评论内容不能为空', 'warning');
        return;
    }
    if (content.length > 1000) {
        showToast('评论内容不能超过1000个字符', 'warning');
        return;
    }

    try {
        const res = await api.public.postComment({
            album_id: viewerState.album.id,
            content: content
        });

        showToast('评论发表成功', 'success');
        textarea.value = '';
        document.getElementById('comment-count-hint').textContent = '0/1000';

        loadComments(viewerState.album.id, 1);
    } catch (e) {
    }
}

async function submitReply(parentId, replyToUserId) {
    if (!isLoggedIn()) {
        showToast('请先登录后发表回复', 'warning');
        setTimeout(() => { window.location.hash = '#/login'; }, 1000);
        return;
    }

    const textarea = document.getElementById(`reply-textarea-${parentId}`);
    if (!textarea) return;

    const content = textarea.value.trim();
    if (!content) {
        showToast('回复内容不能为空', 'warning');
        return;
    }
    if (content.length > 1000) {
        showToast('回复内容不能超过1000个字符', 'warning');
        return;
    }

    try {
        const res = await api.public.postComment({
            album_id: viewerState.album.id,
            content: content,
            parent_id: parentId,
            reply_to_user_id: replyToUserId || null
        });

        showToast('回复发表成功', 'success');
        viewerState.replyingTo = null;
        loadComments(viewerState.album.id, viewerState.commentsPage);
    } catch (e) {
    }
}

async function deleteComment(commentId) {
    showConfirmModal('确认删除', '确定要删除这条评论吗？删除后无法恢复。', async () => {
        try {
            await api.public.deleteComment(commentId);
            showToast('删除成功', 'success');
            loadComments(viewerState.album.id, viewerState.commentsPage);
        } catch (e) {
        }
    });
}

async function loadMoreReplies(commentId) {
    try {
        const comment = viewerState.comments.find(c => c.id === commentId);
        if (!comment) return;

        const currentReplies = comment.replies ? comment.replies.length : 0;
        const page = Math.ceil(currentReplies / 10) + 1;

        const res = await api.public.commentReplies(commentId, {
            page: page,
            limit: 10
        });

        if (!comment.replies) comment.replies = [];
        comment.replies = comment.replies.concat(res.data.list);
        comment.has_more_replies = comment.replies.length < res.data.total;

        renderComments();
    } catch (e) {
    }
}

function loadMoreComments() {
    if (viewerState.commentsLoading) return;
    const nextPage = viewerState.commentsPage + 1;
    loadComments(viewerState.album.id, nextPage);
}

function switchCommentSort(sort) {
    if (viewerState.commentsSort === sort) return;

    viewerState.commentsSort = sort;

    const buttons = document.querySelectorAll('.comments-sort .sort-btn');
    buttons.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.sort === sort);
    });

    loadComments(viewerState.album.id, 1);
}

function isInputFocused() {
    const active = document.activeElement;
    if (!active) return false;
    const tag = active.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (active.isContentEditable) return true;
    return false;
}

function handleViewerKeydown(event) {
    if (isInputFocused()) return;
    if (!viewerState.flipbookReady) return;

    const key = event.key;
    const totalPages = $('#flipbook').turn('pages');

    switch (key) {
        case 'ArrowLeft':
        case 'PageUp':
            event.preventDefault();
            flipPrev();
            announcePageChange();
            break;

        case 'ArrowRight':
        case ' ':
        case 'PageDown':
            event.preventDefault();
            flipNext();
            announcePageChange();
            break;

        case 'Home':
            event.preventDefault();
            jumpToPage(1);
            break;

        case 'End':
            event.preventDefault();
            jumpToPage(totalPages);
            break;

        case 'f':
        case 'F':
            event.preventDefault();
            toggleFullscreen();
            break;

        case 'Escape':
            event.preventDefault();
            if (viewerState.isFullscreen) {
                document.exitFullscreen().catch(() => {});
            } else if (isKeyboardHelpPanelOpen()) {
                hideKeyboardHelpPanel();
            } else if (isViewerGuideVisible()) {
                hideViewerGuide();
            }
            break;

        case '?':
        case '/':
            event.preventDefault();
            toggleKeyboardHelpPanel();
            break;

        case 'Enter':
            if (viewerState.jumpPageBuffer) {
                event.preventDefault();
                const targetPage = parseInt(viewerState.jumpPageBuffer, 10);
                if (!isNaN(targetPage)) {
                    jumpToPage(targetPage);
                }
                clearJumpPageBuffer();
            }
            break;

        default:
            if (/^[0-9]$/.test(key)) {
                handleJumpPageInput(key);
            }
            break;
    }
}

function handleJumpPageInput(digit) {
    if (viewerState.jumpPageTimeout) {
        clearTimeout(viewerState.jumpPageTimeout);
    }
    viewerState.jumpPageBuffer += digit;
    showJumpPageHint(viewerState.jumpPageBuffer);
    viewerState.jumpPageTimeout = setTimeout(() => {
        clearJumpPageBuffer();
    }, 2000);
}

function clearJumpPageBuffer() {
    viewerState.jumpPageBuffer = '';
    if (viewerState.jumpPageTimeout) {
        clearTimeout(viewerState.jumpPageTimeout);
        viewerState.jumpPageTimeout = null;
    }
    hideJumpPageHint();
}

function showJumpPageHint(text) {
    const hint = document.getElementById('viewer-jump-hint');
    if (hint) {
        hint.textContent = `跳转到第 ${text} 页 (按 Enter 确认)`;
        hint.style.display = 'block';
    }
}

function hideJumpPageHint() {
    const hint = document.getElementById('viewer-jump-hint');
    if (hint) {
        hint.style.display = 'none';
    }
}

function jumpToPage(pageNum) {
    if (!viewerState.flipbookReady) return;
    const totalPages = $('#flipbook').turn('pages');
    const clamped = Math.max(1, Math.min(totalPages, pageNum));
    if (clamped !== pageNum) {
        showToast(`页码超出范围，已跳转至第 ${clamped} 页`, 'warning');
    }
    $('#flipbook').turn('page', clamped);
    announcePageChange();
}

function announcePageChange() {
    const indicator = document.getElementById('page-indicator');
    if (indicator && 'ariaLive' in indicator) {
        indicator.textContent = indicator.textContent;
    }
}

function bindKeyboardHandlers() {
    if (viewerState.keyboardHandlersBound) return;
    document.addEventListener('keydown', handleViewerKeydown);
    viewerState.keyboardHandlersBound = true;
}

function unbindKeyboardHandlers() {
    if (!viewerState.keyboardHandlersBound) return;
    document.removeEventListener('keydown', handleViewerKeydown);
    viewerState.keyboardHandlersBound = false;
    clearJumpPageBuffer();
}

function handleTouchStart(event) {
    if (!viewerState.flipbookReady) return;
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    viewerState.gestureStartX = touch.clientX;
    viewerState.gestureStartY = touch.clientY;
    viewerState.gestureStartTime = Date.now();
    viewerState.isDraggingTurnJs = false;
}

function handleTouchMove(event) {
    if (!viewerState.flipbookReady) return;
    if (event.touches.length !== 1) return;
    const touch = event.touches[0];
    const deltaX = Math.abs(touch.clientX - viewerState.gestureStartX);
    const deltaY = Math.abs(touch.clientY - viewerState.gestureStartY);
    if (deltaX > 10 && deltaX > deltaY) {
        viewerState.isDraggingTurnJs = true;
    }
}

function handleTouchEnd(event) {
    if (!viewerState.flipbookReady) return;
    if (event.changedTouches.length !== 1) return;
    const touch = event.changedTouches[0];
    const deltaX = touch.clientX - viewerState.gestureStartX;
    const deltaY = touch.clientY - viewerState.gestureStartY;
    const deltaTime = Date.now() - viewerState.gestureStartTime;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (deltaTime < 300 && absX < 10 && absY < 10) {
        handleDoubleTap(touch.clientX, touch.clientY);
        return;
    }

    if (viewerState.isDraggingTurnJs) return;

    const swipeThreshold = 50;
    const swipeTimeThreshold = 500;

    if (deltaTime < swipeTimeThreshold) {
        if (absX > absY && absX > swipeThreshold) {
            if (deltaX < 0) {
                flipNext();
                announcePageChange();
            } else {
                flipPrev();
                announcePageChange();
            }
        } else if (absY > absX && absY > swipeThreshold && deltaY < 0) {
            showToast('缩略图面板功能开发中', 'info');
        }
    }
}

function handleDoubleTap(x, y) {
    const now = Date.now();
    if (now - viewerState.lastTapTime < 300) {
        toggleViewerZoom();
        viewerState.lastTapTime = 0;
    } else {
        viewerState.lastTapTime = now;
    }
}

function toggleViewerZoom() {
    const wrapper = document.getElementById('flipbook-wrapper');
    if (!wrapper) return;
    if (viewerState.zoomLevel === 1) {
        viewerState.zoomLevel = 2;
        wrapper.style.transform = 'scale(2)';
        wrapper.style.transformOrigin = 'center center';
    } else {
        viewerState.zoomLevel = 1;
        wrapper.style.transform = 'scale(1)';
    }
    wrapper.style.transition = 'transform 0.3s ease';
}

function bindGestureHandlers() {
    if (viewerState.gestureHandlersBound) return;
    const container = document.getElementById('viewer-container');
    if (!container) return;
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    viewerState.gestureHandlersBound = true;
}

function unbindGestureHandlers() {
    if (!viewerState.gestureHandlersBound) return;
    const container = document.getElementById('viewer-container');
    if (container) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
    }
    viewerState.gestureHandlersBound = false;
}

function handleFullscreenChange() {
    viewerState.isFullscreen = !!document.fullscreenElement;
}

function bindFullscreenHandler() {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
}

function isViewerGuideDismissed() {
    try {
        return localStorage.getItem('flipbook_viewer_guide_dismissed') === 'true';
    } catch (e) {
        return false;
    }
}

function dismissViewerGuideForever() {
    try {
        localStorage.setItem('flipbook_viewer_guide_dismissed', 'true');
    } catch (e) {}
}

function showViewerGuide() {
    if (isViewerGuideDismissed()) return;
    const container = document.getElementById('modal-container');
    if (!container) return;
    container.innerHTML = `
        <div class="viewer-guide-overlay" id="viewer-guide-overlay" role="dialog" aria-modal="true" aria-labelledby="viewer-guide-title">
            <div class="viewer-guide-content" onclick="event.stopPropagation()">
                <button class="viewer-guide-close" onclick="hideViewerGuide()" aria-label="关闭引导">&times;</button>
                <h3 id="viewer-guide-title" class="viewer-guide-title">&#128075; 欢迎使用翻页阅读器</h3>
                <p class="viewer-guide-subtitle">掌握以下快捷操作，获得更流畅的阅读体验</p>
                <div class="viewer-guide-grid">
                    <div class="viewer-guide-item">
                        <div class="viewer-guide-icon">&#9001; &#9002;</div>
                        <div class="viewer-guide-text">
                            <strong>键盘翻页</strong>
                            <span>← → 或 空格键</span>
                        </div>
                    </div>
                    <div class="viewer-guide-item">
                        <div class="viewer-guide-icon">&#128269;</div>
                        <div class="viewer-guide-text">
                            <strong>数字跳页</strong>
                            <span>输入页码 + Enter</span>
                        </div>
                    </div>
                    <div class="viewer-guide-item">
                        <div class="viewer-guide-icon">&#128470;</div>
                        <div class="viewer-guide-text">
                            <strong>全屏模式</strong>
                            <span>按 F 键切换</span>
                        </div>
                    </div>
                    <div class="viewer-guide-item">
                        <div class="viewer-guide-icon">&#128073;&#128072;</div>
                        <div class="viewer-guide-text">
                            <strong>触屏手势</strong>
                            <span>左右滑动翻页</span>
                        </div>
                    </div>
                </div>
                <p class="viewer-guide-tip">按 <kbd>?</kbd> 键随时查看完整快捷键列表</p>
                <div class="viewer-guide-actions">
                    <label class="viewer-guide-checkbox">
                        <input type="checkbox" id="viewer-guide-dont-show">
                        <span>不再提示</span>
                    </label>
                    <button class="btn btn-primary" onclick="confirmViewerGuide()">开始阅读</button>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => {
        const overlay = document.getElementById('viewer-guide-overlay');
        if (overlay) overlay.classList.add('show');
    }, 50);
}

function hideViewerGuide() {
    const overlay = document.getElementById('viewer-guide-overlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(() => {
        const container = document.getElementById('modal-container');
        if (container && container.querySelector('#viewer-guide-overlay')) {
            container.innerHTML = '';
        }
    }, 200);
}

function isViewerGuideVisible() {
    return !!document.getElementById('viewer-guide-overlay');
}

function confirmViewerGuide() {
    const dontShow = document.getElementById('viewer-guide-dont-show');
    if (dontShow && dontShow.checked) {
        dismissViewerGuideForever();
    }
    hideViewerGuide();
}

function getKeyboardShortcutsList() {
    return [
        {
            category: '翻页操作',
            items: [
                { keys: ['←', 'PageUp'], desc: '上一页' },
                { keys: ['→', 'Space', 'PageDown'], desc: '下一页' },
                { keys: ['Home'], desc: '跳转到第一页' },
                { keys: ['End'], desc: '跳转到最后一页' },
                { keys: ['数字 + Enter'], desc: '跳转到指定页码' }
            ]
        },
        {
            category: '视图控制',
            items: [
                { keys: ['F'], desc: '全屏 / 退出全屏' },
                { keys: ['Esc'], desc: '退出全屏 / 关闭面板' },
                { keys: ['?'], desc: '显示 / 隐藏快捷键帮助' }
            ]
        },
        {
            category: '触屏手势（移动端）',
            items: [
                { keys: ['← 滑动'], desc: '下一页' },
                { keys: ['→ 滑动'], desc: '上一页' },
                { keys: ['双击'], desc: '放大 / 复位' },
                { keys: ['↑ 上滑'], desc: '呼出缩略图面板' }
            ]
        }
    ];
}

function formatKeyCombo(keys) {
    return keys.map(k => `<kbd>${escapeHtml(k)}</kbd>`).join(' + ');
}

function showKeyboardHelpPanel() {
    const container = document.getElementById('modal-container');
    if (!container) return;
    const shortcuts = getKeyboardShortcutsList();
    container.innerHTML = `
        <div class="keyboard-help-overlay" id="keyboard-help-overlay" role="dialog" aria-modal="true" aria-labelledby="keyboard-help-title" onclick="hideKeyboardHelpPanel()">
            <div class="keyboard-help-content" onclick="event.stopPropagation()">
                <div class="keyboard-help-header">
                    <h3 id="keyboard-help-title">&#9000; 快捷键帮助</h3>
                    <button class="viewer-guide-close" onclick="hideKeyboardHelpPanel()" aria-label="关闭帮助">&times;</button>
                </div>
                <div class="keyboard-help-body">
                    ${shortcuts.map(group => `
                        <div class="keyboard-help-group">
                            <h4 class="keyboard-help-category">${escapeHtml(group.category)}</h4>
                            <div class="keyboard-help-items">
                                ${group.items.map(item => `
                                    <div class="keyboard-help-item">
                                        <div class="keyboard-help-keys">${formatKeyCombo(item.keys)}</div>
                                        <div class="keyboard-help-desc">${escapeHtml(item.desc)}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
                <div class="keyboard-help-footer">
                    <p class="viewer-guide-tip">按 <kbd>Esc</kbd> 或 <kbd>?</kbd> 关闭此面板</p>
                </div>
            </div>
        </div>
    `;
    setTimeout(() => {
        const overlay = document.getElementById('keyboard-help-overlay');
        if (overlay) overlay.classList.add('show');
    }, 50);
}

function hideKeyboardHelpPanel() {
    const overlay = document.getElementById('keyboard-help-overlay');
    if (!overlay) return;
    overlay.classList.remove('show');
    setTimeout(() => {
        const container = document.getElementById('modal-container');
        if (container && container.querySelector('#keyboard-help-overlay')) {
            container.innerHTML = '';
        }
    }, 200);
}

function toggleKeyboardHelpPanel() {
    if (isKeyboardHelpPanelOpen()) {
        hideKeyboardHelpPanel();
    } else {
        showKeyboardHelpPanel();
    }
}

function isKeyboardHelpPanelOpen() {
    return !!document.getElementById('keyboard-help-overlay');
}

function initViewerInteractions() {
    bindKeyboardHandlers();
    bindGestureHandlers();
    bindFullscreenHandler();
    setTimeout(() => {
        showViewerGuide();
    }, 800);
}

function cleanupViewerInteractions() {
    unbindKeyboardHandlers();
    unbindGestureHandlers();
    clearJumpPageBuffer();
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
}
