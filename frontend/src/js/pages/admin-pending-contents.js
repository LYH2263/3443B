let pendingContentCurrentPage = 1;
let pendingContentSelectedIds = new Set();

function renderAdminPendingContents() {
    const content = `
        <div class="admin-page-header">
            <h2>待审内容管理</h2>
        </div>
        <div class="card" style="margin-bottom:16px">
            <div class="admin-stats-grid" id="pc-stats" style="grid-template-columns:repeat(4,1fr)">
                <div class="stat-item">
                    <div class="stat-value" id="pc-stat-pending" style="color:var(--warning)">-</div>
                    <div class="stat-label">待审核</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="pc-stat-approved" style="color:var(--success)">-</div>
                    <div class="stat-label">已通过</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="pc-stat-rejected" style="color:var(--danger)">-</div>
                    <div class="stat-label">已驳回</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="pc-stat-today">-</div>
                    <div class="stat-label">今日新增</div>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="admin-page-toolbar">
                <div class="toolbar-left">
                    <select id="pc-status" onchange="loadPendingContents(1)">
                        <option value="pending">待审核</option>
                        <option value="approved">已通过</option>
                        <option value="rejected">已驳回</option>
                        <option value="">全部状态</option>
                    </select>
                    <select id="pc-type" onchange="loadPendingContents(1)">
                        <option value="">全部类型</option>
                        <option value="album_title">画册标题</option>
                        <option value="album_description">画册描述</option>
                        <option value="album_page_title">页面标题</option>
                        <option value="album_page_description">页面描述</option>
                        <option value="comment">评论内容</option>
                    </select>
                </div>
                <div class="toolbar-right" id="pc-batch-actions" style="display:none">
                    <span style="color:var(--gray-600);margin-right:8px">已选 <span id="pc-selected-count">0</span> 项</span>
                    <button class="btn btn-success" onclick="batchApprovePendingContents()">&#10004; 批量通过</button>
                    <button class="btn btn-danger" onclick="batchRejectPendingContents()">&#10006; 批量驳回</button>
                </div>
            </div>
            <div class="table-container">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th style="width:40px"><input type="checkbox" id="pc-select-all" onchange="toggleSelectAllPendingContents(this)" /></th>
                            <th>ID</th>
                            <th>内容类型</th>
                            <th>关联对象</th>
                            <th>字段</th>
                            <th>原始内容</th>
                            <th>处理后内容</th>
                            <th>命中敏感词</th>
                            <th>提交者</th>
                            <th>状态</th>
                            <th>提交时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody id="pending-contents-tbody">
                        <tr><td colspan="12" class="text-center">加载中...</td></tr>
                    </tbody>
                </table>
            </div>
            <div id="pc-pagination" class="pagination"></div>
        </div>
        <div class="modal" id="pending-content-modal">
            <div class="modal-content" style="max-width:700px">
                <div class="modal-header">
                    <h3>内容审核详情</h3>
                    <button class="modal-close" onclick="closeModalById('pending-content-modal')">&times;</button>
                </div>
                <div class="modal-body" id="pc-detail-body">
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModalById('pending-content-modal')">关闭</button>
                    <button class="btn btn-danger" onclick="doRejectFromDetail()">&#10006; 驳回</button>
                    <button class="btn btn-success" onclick="doApproveFromDetail()">&#10004; 通过</button>
                </div>
            </div>
        </div>
        <div class="modal" id="pc-remark-modal">
            <div class="modal-content" style="max-width:400px">
                <div class="modal-header">
                    <h3 id="pc-remark-title">审核备注</h3>
                    <button class="modal-close" onclick="closeModalById('pc-remark-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>审核备注（可选）</label>
                        <textarea id="pc-remark" rows="3" placeholder="请输入审核备注"></textarea>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModalById('pc-remark-modal')">取消</button>
                    <button class="btn btn-primary" id="pc-remark-confirm-btn">确认</button>
                </div>
            </div>
        </div>
    `;
    return renderAdminLayout('pending-contents', content);
}

async function initAdminPendingContents() {
    document.getElementById('admin-page-title').textContent = '待审内容管理';
    await loadPendingContentStats();
    await loadPendingContents(1);
}

async function loadPendingContentStats() {
    try {
        const res = await api.admin.pendingContentStats();
        const data = res.data;
        document.getElementById('pc-stat-pending').textContent = data.pending_count || 0;
        document.getElementById('pc-stat-approved').textContent = data.approved_count || 0;
        document.getElementById('pc-stat-rejected').textContent = data.rejected_count || 0;
        document.getElementById('pc-stat-today').textContent = data.today_count || 0;
    } catch (e) {}
}

async function loadPendingContents(page) {
    pendingContentCurrentPage = page || 1;
    const status = document.getElementById('pc-status').value;
    const contentType = document.getElementById('pc-type').value;

    try {
        const res = await api.admin.pendingContents({ page: pendingContentCurrentPage, limit: 20, status, content_type: contentType });
        const data = res.data;
        pendingContentSelectedIds.clear();
        document.getElementById('pc-select-all').checked = false;
        updatePendingBatchActions();

        const tbody = document.getElementById('pending-contents-tbody');
        if (!data.list || data.list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" class="text-center text-gray">暂无数据</td></tr>';
        } else {
            tbody.innerHTML = data.list.map(item => `
                <tr>
                    <td><input type="checkbox" class="pc-select-item" value="${item.id}" onchange="toggleSelectPendingContent(${item.id}, this)" ${item.status !== 'pending' ? 'disabled' : ''} /></td>
                    <td>${item.id}</td>
                    <td>${item.content_type_text}</td>
                    <td>
                        ${item.target_link ? `<a href="${item.target_link}" target="_blank" style="color:var(--primary)">${escapeHtml(item.target_title || '查看')}</a>` : escapeHtml(item.target_title || '-')}
                    </td>
                    <td><code>${escapeHtml(item.field_name)}</code></td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(item.original_content || '')}">${escapeHtml(truncate(item.original_content, 40))}</td>
                    <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${escapeHtml(item.processed_content || '')}">${escapeHtml(truncate(item.processed_content, 40))}</td>
                    <td>${renderMatchedWords(item.matched_words)}</td>
                    <td>${item.submitter_info ? escapeHtml(item.submitter_info.nickname) : '-'}</td>
                    <td>${getStatusBadge(item.status)}</td>
                    <td>${formatDate(item.created_at)}</td>
                    <td>
                        <button class="btn-link" onclick="showPendingContentDetail(${item.id})">查看</button>
                        ${item.status === 'pending' ? `
                            <button class="btn-link btn-success" onclick="approvePendingContent(${item.id})">通过</button>
                            <button class="btn-link btn-danger" onclick="rejectPendingContent(${item.id})">驳回</button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
        }
        renderPaginationAndInsert('pc-pagination', data.total, pendingContentCurrentPage, 20, 'goToPendingContentsPage');
    } catch (e) {}
}

function goToPendingContentsPage(page) {
    loadPendingContents(page);
}

function renderMatchedWords(words) {
    if (!words || !Array.isArray(words) || words.length === 0) return '-';
    return words.map(w => {
        const levelMap = { forbid: 'badge-danger', replace: 'badge-warning', mark: 'badge-info' };
        return `<span class="badge ${levelMap[w.level] || ''}" style="margin:2px">${escapeHtml(w.word)}</span>`;
    }).join('');
}

function getStatusBadge(status) {
    const map = {
        pending: { text: '待审', class: 'badge-warning' },
        approved: { text: '通过', class: 'badge-success' },
        rejected: { text: '驳回', class: 'badge-danger' },
    };
    const item = map[status] || { text: status, class: '' };
    return `<span class="badge ${item.class}">${item.text}</span>`;
}

function toggleSelectAllPendingContents(checkbox) {
    document.querySelectorAll('.pc-select-item:enabled').forEach(cb => {
        cb.checked = checkbox.checked;
        const id = parseInt(cb.value);
        if (checkbox.checked) {
            pendingContentSelectedIds.add(id);
        } else {
            pendingContentSelectedIds.delete(id);
        }
    });
    updatePendingBatchActions();
}

function toggleSelectPendingContent(id, checkbox) {
    if (checkbox.checked) {
        pendingContentSelectedIds.add(id);
    } else {
        pendingContentSelectedIds.delete(id);
    }
    updatePendingBatchActions();
}

function updatePendingBatchActions() {
    const count = pendingContentSelectedIds.size;
    document.getElementById('pc-selected-count').textContent = count;
    document.getElementById('pc-batch-actions').style.display = count > 0 ? 'flex' : 'none';
}

let viewingPendingContentId = null;

async function showPendingContentDetail(id) {
    viewingPendingContentId = id;
    try {
        const res = await api.admin.pendingContentDetail(id);
        const item = res.data;
        document.getElementById('pc-detail-body').innerHTML = `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px">
                <div>
                    <label style="color:var(--gray-500);font-size:12px">内容类型</label>
                    <div style="font-weight:500">${escapeHtml(item.content_type_text)}</div>
                </div>
                <div>
                    <label style="color:var(--gray-500);font-size:12px">字段</label>
                    <div><code>${escapeHtml(item.field_name)}</code></div>
                </div>
                <div>
                    <label style="color:var(--gray-500);font-size:12px">状态</label>
                    <div>${getStatusBadge(item.status)}</div>
                </div>
                <div>
                    <label style="color:var(--gray-500);font-size:12px">提交者</label>
                    <div>${item.submitter_info ? escapeHtml(item.submitter_info.nickname) : '-'}</div>
                </div>
                <div>
                    <label style="color:var(--gray-500);font-size:12px">提交时间</label>
                    <div>${formatDate(item.created_at)}</div>
                </div>
                <div>
                    <label style="color:var(--gray-500);font-size:12px">审核人</label>
                    <div>${item.reviewer_info ? escapeHtml(item.reviewer_info.nickname) : '-'}</div>
                </div>
            </div>
            <div style="margin-bottom:12px">
                <label style="color:var(--gray-500);font-size:12px">关联对象</label>
                <div>${item.target_link ? `<a href="${item.target_link}" target="_blank" style="color:var(--primary)">${escapeHtml(item.target_title || '查看')}</a>` : escapeHtml(item.target_title || '-')}</div>
            </div>
            <div style="margin-bottom:12px">
                <label style="color:var(--gray-500);font-size:12px">命中的敏感词</label>
                <div>${renderMatchedWords(item.matched_words)}</div>
            </div>
            <div style="margin-bottom:12px">
                <label style="color:var(--gray-500);font-size:12px">原始内容</label>
                <div style="background:var(--gray-50);padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-all;border:1px solid var(--gray-200)">${escapeHtml(item.original_content || '')}</div>
            </div>
            <div style="margin-bottom:12px">
                <label style="color:var(--gray-500);font-size:12px">处理后内容（替换为星号）</label>
                <div style="background:var(--gray-50);padding:12px;border-radius:8px;white-space:pre-wrap;word-break:break-all;border:1px solid var(--gray-200)">${escapeHtml(item.processed_content || '')}</div>
            </div>
            ${item.review_remark ? `
                <div>
                    <label style="color:var(--gray-500);font-size:12px">审核备注</label>
                    <div style="background:var(--gray-50);padding:12px;border-radius:8px;border:1px solid var(--gray-200)">${escapeHtml(item.review_remark)}</div>
                </div>
            ` : ''}
        `;
        openModal('pending-content-modal');
    } catch (e) {}
}

function approvePendingContent(id) {
    pendingRemarkAction = 'approve';
    pendingRemarkIds = [id];
    document.getElementById('pc-remark-title').textContent = '通过审核';
    document.getElementById('pc-remark').value = '';
    document.getElementById('pc-remark-confirm-btn').textContent = '确认通过';
    document.getElementById('pc-remark-confirm-btn').onclick = doPendingRemarkAction;
    openModal('pc-remark-modal');
}

function rejectPendingContent(id) {
    pendingRemarkAction = 'reject';
    pendingRemarkIds = [id];
    document.getElementById('pc-remark-title').textContent = '驳回审核';
    document.getElementById('pc-remark').value = '';
    document.getElementById('pc-remark-confirm-btn').textContent = '确认驳回';
    document.getElementById('pc-remark-confirm-btn').onclick = doPendingRemarkAction;
    openModal('pc-remark-modal');
}

function batchApprovePendingContents() {
    if (pendingContentSelectedIds.size === 0) {
        showToast('请选择要审核的内容', 'warning');
        return;
    }
    pendingRemarkAction = 'batch-approve';
    pendingRemarkIds = Array.from(pendingContentSelectedIds);
    document.getElementById('pc-remark-title').textContent = '批量通过';
    document.getElementById('pc-remark').value = '';
    document.getElementById('pc-remark-confirm-btn').textContent = '确认通过';
    document.getElementById('pc-remark-confirm-btn').onclick = doPendingRemarkAction;
    openModal('pc-remark-modal');
}

function batchRejectPendingContents() {
    if (pendingContentSelectedIds.size === 0) {
        showToast('请选择要审核的内容', 'warning');
        return;
    }
    pendingRemarkAction = 'batch-reject';
    pendingRemarkIds = Array.from(pendingContentSelectedIds);
    document.getElementById('pc-remark-title').textContent = '批量驳回';
    document.getElementById('pc-remark').value = '';
    document.getElementById('pc-remark-confirm-btn').textContent = '确认驳回';
    document.getElementById('pc-remark-confirm-btn').onclick = doPendingRemarkAction;
    openModal('pc-remark-modal');
}

function doApproveFromDetail() {
    if (!viewingPendingContentId) return;
    closeModalById('pending-content-modal');
    approvePendingContent(viewingPendingContentId);
}

function doRejectFromDetail() {
    if (!viewingPendingContentId) return;
    closeModalById('pending-content-modal');
    rejectPendingContent(viewingPendingContentId);
}

let pendingRemarkAction = '';
let pendingRemarkIds = [];

async function doPendingRemarkAction() {
    const remark = document.getElementById('pc-remark').value.trim();
    closeModalById('pc-remark-modal');

    try {
        if (pendingRemarkAction === 'approve') {
            await api.admin.approvePendingContent(pendingRemarkIds[0], remark);
            showToast('审核通过', 'success');
        } else if (pendingRemarkAction === 'reject') {
            await api.admin.rejectPendingContent(pendingRemarkIds[0], remark);
            showToast('已驳回', 'success');
        } else if (pendingRemarkAction === 'batch-approve') {
            const res = await api.admin.batchApprovePendingContents(pendingRemarkIds, remark);
            showToast(`批量完成：成功${res.data.success_count}条，失败${res.data.fail_count}条`, res.data.fail_count > 0 ? 'warning' : 'success');
        } else if (pendingRemarkAction === 'batch-reject') {
            const res = await api.admin.batchRejectPendingContents(pendingRemarkIds, remark);
            showToast(`批量完成：成功${res.data.success_count}条，失败${res.data.fail_count}条`, res.data.fail_count > 0 ? 'warning' : 'success');
        }
        loadPendingContentStats();
        loadPendingContents(pendingContentCurrentPage);
    } catch (e) {}
}

function truncate(str, len) {
    if (!str) return '';
    if (str.length <= len) return str;
    return str.slice(0, len) + '...';
}
