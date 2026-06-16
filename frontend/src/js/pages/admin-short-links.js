let shortLinksState = {
    currentView: 'albums',
    albums: [],
    currentAlbum: null,
    shortLinks: [],
    stats: null,
    page: 1,
    limit: 20,
    total: 0,
    keyword: '',
};

function renderAdminShortLinks(albumId) {
    shortLinksState.currentView = albumId ? 'detail' : 'albums';
    shortLinksState.currentAlbum = albumId ? parseInt(albumId) : null;

    return renderAdminLayout('short-links', `
        <div class="admin-page-header">
            <div>
                ${albumId ? `
                    <h1>&#128279; 短链管理</h1>
                    <p style="color:var(--gray-500);margin-top:4px" id="album-title-loading">加载中...</p>
                ` : `
                    <h1>&#128279; 短链管理</h1>
                    <p style="color:var(--gray-500);margin-top:4px">管理所有画册的短链接及点击统计</p>
                `}
            </div>
            ${albumId ? `
                <div style="display:flex;gap:8px">
                    <a href="#/admin/short-links" class="btn btn-secondary">&#8592; 返回列表</a>
                    <button class="btn btn-primary" onclick="showGenerateShortLinkModal(${albumId})">&#43; 生成短链</button>
                </div>
            ` : ''}
        </div>
        <div id="short-links-content">${renderLoading()}</div>
        <div id="generate-modal-container"></div>
    `);
}

async function initAdminShortLinks(albumId) {
    const titleEl = document.getElementById('admin-page-title');
    if (titleEl) titleEl.textContent = albumId ? '短链详情' : '短链管理';

    if (albumId) {
        await loadShortLinksDetail(parseInt(albumId));
    } else {
        await loadShortLinksAlbums();
    }
}

async function loadShortLinksAlbums() {
    try {
        const res = await api.admin.shortLinksAllStats({
            page: shortLinksState.page,
            limit: shortLinksState.limit,
            keyword: shortLinksState.keyword,
        });

        shortLinksState.albums = res.data.list || [];
        shortLinksState.total = res.data.total || 0;
        shortLinksState.page = res.data.page || 1;
        shortLinksState.limit = res.data.limit || 20;

        renderShortLinksAlbums();
    } catch (e) {
        document.getElementById('short-links-content').innerHTML = renderEmpty('加载失败');
    }
}

function renderShortLinksAlbums() {
    const container = document.getElementById('short-links-content');
    if (!container) return;

    const albums = shortLinksState.albums;

    container.innerHTML = `
        <div class="card" style="margin-bottom:24px">
            <div class="card-header">
                <h2>画册列表</h2>
                <div style="display:flex;gap:8px;align-items:center">
                    <input type="text" class="form-input" placeholder="搜索画册标题" 
                           style="width:240px" id="short-link-search" 
                           value="${escapeHtml(shortLinksState.keyword)}"
                           onkeyup="handleShortLinkSearch(event)">
                    <button class="btn btn-secondary" onclick="clearShortLinkSearch()">&#10006;</button>
                </div>
            </div>
            <div class="card-body" style="padding:0">
                ${albums.length === 0 ? renderEmpty('暂无画册') : `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>画册标题</th>
                                <th>分类</th>
                                <th>短链数量</th>
                                <th>累计点击</th>
                                <th>状态</th>
                                <th>创建时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${albums.map(album => `
                                <tr>
                                    <td>${album.id}</td>
                                    <td>
                                        <div style="display:flex;align-items:center;gap:12px">
                                            ${album.cover_image ? `
                                                <img src="${getImageUrl(album.cover_image_url || album.cover_image)}" 
                                                     alt="" style="width:40px;height:40px;object-fit:cover;border-radius:4px"
                                                     onerror="this.style.display='none'">
                                            ` : ''}
                                            <span>${escapeHtml(album.title)}</span>
                                        </div>
                                    </td>
                                    <td>${album.category ? escapeHtml(album.category.name) : '-'}</td>
                                    <td><span class="badge badge-info">${album.short_link_count || 0}</span></td>
                                    <td><span class="badge badge-primary">${album.total_short_clicks || 0}</span></td>
                                    <td>${album.status === 1 
                                        ? '<span class="badge badge-success">已发布</span>' 
                                        : '<span class="badge badge-gray">草稿</span>'}</td>
                                    <td>${formatDate(album.created_at)}</td>
                                    <td>
                                        <button class="btn btn-sm btn-primary" onclick="navigateTo('/admin/short-links/${album.id}')">
                                            查看短链
                                        </button>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `}
            </div>
            <div class="card-footer">
                ${renderPagination(shortLinksState.total, shortLinksState.page, shortLinksState.limit, 'changeShortLinksPage')}
            </div>
        </div>
    `;
}

function handleShortLinkSearch(event) {
    if (event.key === 'Enter') {
        shortLinksState.keyword = event.target.value.trim();
        shortLinksState.page = 1;
        loadShortLinksAlbums();
    }
}

function clearShortLinkSearch() {
    shortLinksState.keyword = '';
    shortLinksState.page = 1;
    document.getElementById('short-link-search').value = '';
    loadShortLinksAlbums();
}

function changeShortLinksPage(page) {
    shortLinksState.page = page;
    loadShortLinksAlbums();
}

async function loadShortLinksDetail(albumId) {
    try {
        const [albumRes, linksRes, statsRes] = await Promise.all([
            api.admin.albumDetail(albumId),
            api.admin.shortLinks({ album_id: albumId, page: shortLinksState.page, limit: shortLinksState.limit }),
            api.admin.shortLinksStats({ album_id: albumId }),
        ]);

        shortLinksState.currentAlbum = albumRes.data;
        shortLinksState.shortLinks = linksRes.data.list || [];
        shortLinksState.total = linksRes.data.total || 0;
        shortLinksState.page = linksRes.data.page || 1;
        shortLinksState.limit = linksRes.data.limit || 20;
        shortLinksState.stats = statsRes.data;

        const titleLoading = document.getElementById('album-title-loading');
        if (titleLoading) {
            titleLoading.innerHTML = `画册: <strong>${escapeHtml(albumRes.data.title)}</strong>`;
        }

        renderShortLinksDetail();
    } catch (e) {
        document.getElementById('short-links-content').innerHTML = renderEmpty('加载失败');
    }
}

function renderShortLinksDetail() {
    const container = document.getElementById('short-links-content');
    if (!container) return;

    const stats = shortLinksState.stats;
    const links = shortLinksState.shortLinks;
    const channelStats = stats?.by_channel || [];
    const maxClicks = Math.max(...channelStats.map(c => c.total_clicks || 0), 1);

    container.innerHTML = `
        <div style="display:grid;grid-template-columns:2fr 1fr;gap:24px">
            <div>
                ${renderStatsCard(stats)}
                ${channelStats.length > 0 ? renderChannelChart(channelStats, maxClicks) : ''}
                <div class="card">
                    <div class="card-header">
                        <h2>短链列表</h2>
                        <span style="color:var(--gray-500);font-size:14px">共 ${shortLinksState.total} 条短链</span>
                    </div>
                    <div class="card-body" style="padding:0">
                        ${links.length === 0 ? renderEmpty('暂无短链，点击右上角"生成短链"创建') : `
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>短码</th>
                                        <th>备注/渠道</th>
                                        <th>短链接</th>
                                        <th>累计点击</th>
                                        <th>最近点击</th>
                                        <th>创建人</th>
                                        <th>状态</th>
                                        <th>创建时间</th>
                                        <th>操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${links.map(link => renderShortLinkRow(link)).join('')}
                                </tbody>
                            </table>
                        `}
                    </div>
                    ${shortLinksState.total > shortLinksState.limit ? `
                        <div class="card-footer">
                            ${renderPagination(shortLinksState.total, shortLinksState.page, shortLinksState.limit, 'changeDetailPage')}
                        </div>
                    ` : ''}
                </div>
            </div>
            <div>
                <div class="card" style="position:sticky;top:88px">
                    <div class="card-header"><h2>画册信息</h2></div>
                    <div class="card-body">
                        <div style="text-align:center;margin-bottom:16px">
                            ${shortLinksState.currentAlbum?.cover_image ? `
                                <img src="${getImageUrl(shortLinksState.currentAlbum.cover_image_url || shortLinksState.currentAlbum.cover_image)}" 
                                     alt="" style="width:120px;height:160px;object-fit:cover;border-radius:8px;box-shadow:var(--shadow)"
                                     onerror="this.style.display='none'">
                            ` : ''}
                        </div>
                        <h3 style="margin-bottom:8px">${escapeHtml(shortLinksState.currentAlbum?.title || '')}</h3>
                        <p style="color:var(--gray-500);font-size:14px;margin-bottom:16px">
                            ${escapeHtml(shortLinksState.currentAlbum?.description || '暂无描述')}
                        </p>
                        <div style="display:grid;gap:8px">
                            <div class="stat-item">
                                <span class="stat-label">画册状态</span>
                                <span class="stat-value">${shortLinksState.currentAlbum?.status === 1 
                                    ? '<span class="badge badge-success">已发布</span>' 
                                    : '<span class="badge badge-gray">草稿</span>'}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">总浏览量</span>
                                <span class="stat-value">${shortLinksState.currentAlbum?.view_count || 0}</span>
                            </div>
                            <div class="stat-item">
                                <span class="stat-label">页面数量</span>
                                <span class="stat-value">${shortLinksState.currentAlbum?.pages?.length || 0}</span>
                            </div>
                        </div>
                        <hr style="margin:16px 0;border:none;border-top:1px solid var(--gray-200)">
                        <button class="btn btn-secondary" style="width:100%" onclick="navigateTo('/admin/albums/edit/${shortLinksState.currentAlbum?.id}')">
                            &#9998; 编辑画册
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderStatsCard(stats) {
    if (!stats) return '';

    return `
        <div class="card" style="margin-bottom:24px">
            <div class="card-header"><h2>数据概览</h2></div>
            <div class="card-body">
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background:var(--primary-100);color:var(--primary-600)">&#128279;</div>
                        <div class="stat-card-info">
                            <div class="stat-card-label">短链总数</div>
                            <div class="stat-card-value">${stats.total_short_links || 0}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background:var(--success-100);color:var(--success-600)">&#128065;</div>
                        <div class="stat-card-info">
                            <div class="stat-card-label">累计点击</div>
                            <div class="stat-card-value">${stats.total_clicks || 0}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background:var(--warning-100);color:var(--warning-600)">&#128100;</div>
                        <div class="stat-card-info">
                            <div class="stat-card-label">独立IP</div>
                            <div class="stat-card-value">${stats.total_unique_ips || 0}</div>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-card-icon" style="background:var(--info-100);color:var(--info-600)">&#128200;</div>
                        <div class="stat-card-info">
                            <div class="stat-card-label">平均点击率</div>
                            <div class="stat-card-value">${stats.total_clicks && stats.total_short_links 
                                ? Math.round(stats.total_clicks / stats.total_short_links) 
                                : 0}</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderChannelChart(channelStats, maxClicks) {
    return `
        <div class="card" style="margin-bottom:24px">
            <div class="card-header"><h2>渠道点击对比</h2></div>
            <div class="card-body">
                <div style="display:flex;flex-direction:column;gap:12px">
                    ${channelStats.map(channel => `
                        <div>
                            <div style="display:flex;justify-content:space-between;margin-bottom:4px">
                                <span style="font-weight:500;color:var(--gray-700)">${escapeHtml(channel.channel || '未备注')}</span>
                                <span style="color:var(--gray-500);font-size:14px">
                                    ${channel.total_clicks || 0} 次 / ${channel.unique_ips || 0} IP
                                </span>
                            </div>
                            <div style="height:24px;background:var(--gray-100);border-radius:4px;overflow:hidden">
                                <div style="height:100%;background:linear-gradient(90deg,var(--primary-500),var(--primary-400));
                                            width:${((channel.total_clicks || 0) / maxClicks * 100).toFixed(1)}%;
                                            border-radius:4px;transition:width 0.3s ease"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderShortLinkRow(link) {
    return `
        <tr>
            <td><code style="background:var(--gray-100);padding:2px 6px;border-radius:4px">${escapeHtml(link.short_code)}</code></td>
            <td>${link.remark ? `<span class="badge badge-info">${escapeHtml(link.remark)}</span>` : '<span style="color:var(--gray-400)">-</span>'}</td>
            <td>
                <div style="max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
                    <a href="${escapeHtml(link.short_url)}" target="_blank" style="color:var(--primary-600);font-size:13px">
                        ${escapeHtml(link.short_url)}
                    </a>
                </div>
            </td>
            <td><strong>${link.click_count || 0}</strong></td>
            <td>${link.last_click_at ? formatDateTime(link.last_click_at) : '<span style="color:var(--gray-400)">暂无</span>'}</td>
            <td>${link.creator ? escapeHtml(link.creator.nickname || link.creator.username) : '-'}</td>
            <td>${link.status === 1 
                ? '<span class="badge badge-success">启用</span>' 
                : '<span class="badge badge-danger">已停用</span>'}</td>
            <td>${formatDate(link.created_at)}</td>
            <td>
                <div style="display:flex;gap:4px">
                    <button class="btn btn-sm btn-secondary" onclick="copyShortLink('${escapeHtml(link.short_url)}')" title="复制">
                        &#128203;
                    </button>
                    <button class="btn btn-sm ${link.status === 1 ? 'btn-warning' : 'btn-success'}" 
                            onclick="toggleShortLinkStatus(${link.id}, ${link.status === 1 ? 0 : 1})" 
                            title="${link.status === 1 ? '停用' : '启用'}">
                        ${link.status === 1 ? '&#9208;' : '&#9654;'}
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="confirmDeleteShortLink(${link.id})" title="删除">
                        &#128465;
                    </button>
                </div>
            </td>
        </tr>
    `;
}

function changeDetailPage(page) {
    shortLinksState.page = page;
    loadShortLinksDetail(shortLinksState.currentAlbum?.id);
}

function showGenerateShortLinkModal(albumId) {
    const container = document.getElementById('generate-modal-container');
    if (!container) return;

    container.innerHTML = `
        <div class="modal-overlay" onclick="closeGenerateModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width:480px">
                <div class="modal-header">
                    <h3>&#43; 生成短链</h3>
                    <button class="modal-close" onclick="closeGenerateModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label class="form-label">备注 / 投放渠道</label>
                        <input type="text" class="form-input" id="short-link-remark" 
                               placeholder="例如：微信朋友圈、抖音、线下海报等" maxlength="200">
                        <p style="font-size:12px;color:var(--gray-500);margin-top:4px">
                            用于区分不同投放渠道，便于统计各渠道点击效果
                        </p>
                    </div>
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;margin-top:16px">
                        <p style="font-size:13px;color:var(--gray-600);margin:0">
                            &#128161; <strong>短码说明：</strong>系统将自动生成6位唯一短码，
                            排除易混字符（0、O、o、1、l、I），方便线下传播。
                        </p>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeGenerateModal()">取消</button>
                    <button class="btn btn-primary" onclick="generateShortLink(${albumId})" id="generate-btn">
                        &#10004; 生成短链
                    </button>
                </div>
            </div>
        </div>
    `;
}

function closeGenerateModal(event) {
    if (event && event.target && !event.target.classList.contains('modal-overlay')) return;
    document.getElementById('generate-modal-container').innerHTML = '';
}

async function generateShortLink(albumId) {
    const remark = document.getElementById('short-link-remark').value.trim();
    const btn = document.getElementById('generate-btn');

    btn.disabled = true;
    btn.innerHTML = '&#8987; 生成中...';

    try {
        const res = await api.admin.generateShortLink({
            album_id: albumId,
            remark: remark,
        });

        showToast('短链生成成功', 'success');
        closeGenerateModal();

        if (res.data && res.data.short_url) {
            showShortLinkResultModal(res.data);
        }

        loadShortLinksDetail(albumId);
    } catch (e) {
    } finally {
        btn.disabled = false;
        btn.innerHTML = '&#10004; 生成短链';
    }
}

function showShortLinkResultModal(shortLink) {
    const container = document.getElementById('generate-modal-container');
    if (!container) return;

    container.innerHTML = `
        <div class="modal-overlay" onclick="closeResultModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width:480px">
                <div class="modal-header">
                    <h3>&#10004; 短链生成成功</h3>
                    <button class="modal-close" onclick="closeResultModal()">&times;</button>
                </div>
                <div class="modal-body" style="text-align:center">
                    <div style="font-size:48px;margin-bottom:16px">&#127881;</div>
                    <p style="margin-bottom:16px;color:var(--gray-600)">以下是您的短链接：</p>
                    <div style="background:var(--gray-50);padding:16px;border-radius:8px;margin-bottom:16px">
                        <code style="font-size:16px;color:var(--primary-600);word-break:break-all">
                            ${escapeHtml(shortLink.short_url)}
                        </code>
                    </div>
                    <p style="font-size:13px;color:var(--gray-500);margin-bottom:8px">
                        短码：<strong>${escapeHtml(shortLink.short_code)}</strong>
                    </p>
                    ${shortLink.remark ? `
                        <p style="font-size:13px;color:var(--gray-500)">
                            备注：<strong>${escapeHtml(shortLink.remark)}</strong>
                        </p>
                    ` : ''}
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeResultModal()">关闭</button>
                    <button class="btn btn-primary" onclick="copyShortLinkAndClose('${escapeHtml(shortLink.short_url)}')">
                        &#128203; 复制链接
                    </button>
                </div>
            </div>
        </div>
    `;
}

function closeResultModal(event) {
    if (event && event.target && !event.target.classList.contains('modal-overlay')) return;
    document.getElementById('generate-modal-container').innerHTML = '';
}

function copyShortLinkAndClose(url) {
    copyShortLink(url);
    closeResultModal();
}

function copyShortLink(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('链接已复制到剪贴板', 'success');
    }).catch(() => {
        const textarea = document.createElement('textarea');
        textarea.value = url;
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('链接已复制到剪贴板', 'success');
        } catch (e) {
            showToast('复制失败，请手动复制', 'error');
        }
        document.body.removeChild(textarea);
    });
}

async function toggleShortLinkStatus(id, status) {
    const action = status === 1 ? '启用' : '停用';
    showConfirmModal(`${action}短链`, `确定要${action}该短链吗？${status === 0 ? '停用后用户将无法通过该短链访问画册。' : ''}`, async () => {
        try {
            await api.admin.updateShortLink(id, { status: status });
            showToast(`短链已${action}`, 'success');
            loadShortLinksDetail(shortLinksState.currentAlbum?.id);
        } catch (e) {}
    });
}

function confirmDeleteShortLink(id) {
    showConfirmModal('删除短链', '确定要删除该短链吗？此操作将同时删除所有点击统计数据，且不可恢复。', async () => {
        try {
            await api.admin.deleteShortLink(id);
            showToast('短链已删除', 'success');
            loadShortLinksDetail(shortLinksState.currentAlbum?.id);
        } catch (e) {}
    });
}
