let viewerState = { album: null, pages: [], currentPage: 1, needPassword: false, flipbookReady: false, audioManager: null, hasAudio: false, recommendations: [], comments: [], commentsPage: 1, commentsLimit: 10, commentsSort: 'time', commentsTotal: 0, commentsTotalCount: 0, commentsLoading: false, replyingTo: null };

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
    initComments(viewerState.album.id);

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
