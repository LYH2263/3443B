let adminCommentsState = {
    list: [],
    total: 0,
    page: 1,
    limit: 20,
    loading: false,
    filters: {
        album_id: '',
        user_id: '',
        status: '',
        keyword: ''
    }
};

function renderAdminCommentsPage() {
    return renderAdminLayout('comments', `
        <div class="admin-page-header">
            <h2>评论管理</h2>
            <p class="page-desc">管理画册的所有评论内容，支持隐藏违规评论和置顶优质评论</p>
        </div>

        <div class="stats-cards" id="comments-stats">
            <div class="loading">加载中...</div>
        </div>

        <div class="filter-bar">
            <div class="filter-group">
                <input type="text" class="form-input filter-input" id="filter-keyword" placeholder="搜索评论内容..." onkeydown="if(event.key==='Enter')applyCommentFilters()">
                <select class="form-select filter-select" id="filter-status" onchange="applyCommentFilters()">
                    <option value="">全部状态</option>
                    <option value="1">正常</option>
                    <option value="0">已隐藏</option>
                    <option value="2">待审核</option>
                </select>
            </div>
            <div class="filter-group">
                <button class="btn btn-primary" onclick="applyCommentFilters()">搜索</button>
                <button class="btn btn-secondary" onclick="resetCommentFilters()">重置</button>
            </div>
        </div>

        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>用户</th>
                        <th>画册</th>
                        <th>评论内容</th>
                        <th>状态</th>
                        <th>置顶</th>
                        <th>时间</th>
                        <th>操作</th>
                    </tr>
                </thead>
                <tbody id="comments-table-body">
                    <tr><td colspan="8" class="text-center loading">加载中...</td></tr>
                </tbody>
            </table>
        </div>

        <div id="comments-pagination"></div>
    `);
}

async function initAdminCommentsPage() {
    document.getElementById('admin-page-title').textContent = '评论管理';
    loadCommentsStats();
    loadComments();
}

async function loadCommentsStats() {
    try {
        const res = await api.admin.commentStats();
        const stats = res.data;
        document.getElementById('comments-stats').innerHTML = `
            <div class="stat-card">
                <div class="stat-card-icon" style="background: var(--primary-100); color: var(--primary);">
                    &#128172;
                </div>
                <div class="stat-card-info">
                    <div class="stat-card-value">${stats.total || 0}</div>
                    <div class="stat-card-label">总评论数</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon" style="background: #D1FAE5; color: #065F46;">
                    &#10004;
                </div>
                <div class="stat-card-info">
                    <div class="stat-card-value">${stats.normal || 0}</div>
                    <div class="stat-card-label">正常评论</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon" style="background: #FEE2E2; color: #991B1B;">
                    &#128683;
                </div>
                <div class="stat-card-info">
                    <div class="stat-card-value">${stats.hidden || 0}</div>
                    <div class="stat-card-label">已隐藏</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-card-icon" style="background: #FEF3C7; color: #92400E;">
                    &#128197;
                </div>
                <div class="stat-card-info">
                    <div class="stat-card-value">${stats.today || 0}</div>
                    <div class="stat-card-label">今日新增</div>
                </div>
            </div>
        `;
    } catch (e) {
        document.getElementById('comments-stats').innerHTML = '<div class="text-error">统计加载失败</div>';
    }
}

async function loadComments() {
    const tbody = document.getElementById('comments-table-body');
    if (!tbody) return;

    adminCommentsState.loading = true;
    tbody.innerHTML = '<tr><td colspan="8" class="text-center loading">加载中...</td></tr>';

    try {
        const params = {
            page: adminCommentsState.page,
            limit: adminCommentsState.limit,
            ...adminCommentsState.filters
        };

        const res = await api.admin.comments(params);
        adminCommentsState.list = res.data.list;
        adminCommentsState.total = res.data.total;

        renderCommentsTable();
        renderCommentsPagination();
    } catch (e) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-error">加载失败</td></tr>';
    } finally {
        adminCommentsState.loading = false;
    }
}

function renderCommentsTable() {
    const tbody = document.getElementById('comments-table-body');
    if (!tbody) return;

    if (adminCommentsState.list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center empty">暂无数据</td></tr>';
        return;
    }

    tbody.innerHTML = adminCommentsState.list.map(comment => {
        const userInfo = comment.user_info || {};
        const albumInfo = comment.album_info || {};
        const statusBadge = getStatusBadge(comment.status);
        const pinnedBadge = comment.is_pinned
            ? '<span class="badge badge-primary">已置顶</span>'
            : '<span class="badge badge-gray">否</span>';

        const contentPreview = comment.content.length > 80
            ? escapeHtml(comment.content.substring(0, 80)) + '...'
            : escapeHtml(comment.content);

        const isReply = comment.parent_id ? true : false;

        return `
            <tr>
                <td>${comment.id}</td>
                <td>
                    <div class="user-cell">
                        <div class="user-avatar-sm">
                            ${userInfo.avatar
                                ? `<img src="${getImageUrl(userInfo.avatar)}" alt="">`
                                : escapeHtml((userInfo.nickname || 'U').charAt(0).toUpperCase())
                            }
                        </div>
                        <div>
                            <div class="user-name">${escapeHtml(userInfo.nickname || userInfo.username || '匿名')}</div>
                            ${isReply ? '<div class="text-xs text-gray-500">回复评论</div>' : ''}
                        </div>
                    </div>
                </td>
                <td>
                    ${albumInfo
                        ? `<a href="#/viewer/${albumInfo.id}" target="_blank" class="album-link">${escapeHtml(albumInfo.title)}</a>`
                        : '<span class="text-gray-400">未知画册</span>'
                    }
                </td>
                <td>
                    <div class="comment-content-cell" title="${escapeHtml(comment.content)}">
                        ${contentPreview}
                        ${comment.parent_info ? `<div class="comment-parent-info">回复: ${escapeHtml(comment.parent_info.user_nickname || '匿名')} - ${escapeHtml(comment.parent_info.content.substring(0, 30))}...</div>` : ''}
                    </div>
                </td>
                <td>${statusBadge}</td>
                <td>${comment.parent_id ? '-' : pinnedBadge}</td>
                <td>${formatDateTime(comment.created_at)}</td>
                <td>
                    <div class="action-buttons">
                        ${comment.status == 1
                            ? `<button class="btn btn-sm btn-secondary" onclick="hideComment(${comment.id})">隐藏</button>`
                            : `<button class="btn btn-sm btn-success" onclick="showComment(${comment.id})">显示</button>`
                        }
                        ${!comment.parent_id
                            ? `<button class="btn btn-sm ${comment.is_pinned ? 'btn-secondary' : 'btn-primary'}" onclick="toggleCommentPin(${comment.id})">
                                ${comment.is_pinned ? '取消置顶' : '置顶'}
                               </button>`
                            : ''
                        }
                        <button class="btn btn-sm btn-danger" onclick="deleteAdminComment(${comment.id})">删除</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getStatusBadge(status) {
    const statusMap = {
        1: { text: '正常', class: 'badge-success' },
        0: { text: '已隐藏', class: 'badge-danger' },
        2: { text: '待审核', class: 'badge-warning' }
    };
    const info = statusMap[status] || { text: '未知', class: 'badge-gray' };
    return `<span class="badge ${info.class}">${info.text}</span>`;
}

function renderCommentsPagination() {
    const container = document.getElementById('comments-pagination');
    if (!container) return;
    container.innerHTML = renderPagination(
        adminCommentsState.total,
        adminCommentsState.page,
        adminCommentsState.limit,
        'goToCommentsPage'
    );
}

function goToCommentsPage(page) {
    if (page < 1 || page > Math.ceil(adminCommentsState.total / adminCommentsState.limit)) return;
    adminCommentsState.page = page;
    loadComments();
}

function applyCommentFilters() {
    adminCommentsState.filters.keyword = document.getElementById('filter-keyword').value.trim();
    adminCommentsState.filters.status = document.getElementById('filter-status').value;
    adminCommentsState.page = 1;
    loadComments();
}

function resetCommentFilters() {
    document.getElementById('filter-keyword').value = '';
    document.getElementById('filter-status').value = '';
    adminCommentsState.filters = {
        album_id: '',
        user_id: '',
        status: '',
        keyword: ''
    };
    adminCommentsState.page = 1;
    loadComments();
}

async function hideComment(id) {
    showConfirmModal('隐藏评论', '确定要隐藏这条评论吗？隐藏后前台将不可见。', async () => {
        try {
            await api.admin.updateCommentStatus(id, 0);
            showToast('已隐藏评论', 'success');
            loadComments();
            loadCommentsStats();
        } catch (e) {}
    });
}

async function showComment(id) {
    showConfirmModal('显示评论', '确定要恢复显示这条评论吗？', async () => {
        try {
            await api.admin.updateCommentStatus(id, 1);
            showToast('已恢复评论', 'success');
            loadComments();
            loadCommentsStats();
        } catch (e) {}
    });
}

async function toggleCommentPin(id) {
    try {
        const res = await api.admin.toggleCommentPin(id);
        showToast(res.data.is_pinned ? '已置顶' : '已取消置顶', 'success');
        loadComments();
    } catch (e) {}
}

async function deleteAdminComment(id) {
    showConfirmModal('删除评论', '确定要删除这条评论吗？删除后无法恢复。如果是父评论，其回复也会被一并删除。', async () => {
        try {
            await api.admin.deleteComment(id);
            showToast('删除成功', 'success');
            loadComments();
            loadCommentsStats();
        } catch (e) {}
    });
}
