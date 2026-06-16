let abExperimentsState = { experiments: [], statusFilter: '' };

function renderAdminAbExperiments() {
    return renderAdminLayout('ab-experiments', `
        <div class="admin-page-header">
            <h1>&#128302; A/B 封面实验</h1>
        </div>
        <div id="ab-experiments-content">${renderLoading()}</div>
    `);
}

async function initAdminAbExperiments() {
    const titleEl = document.getElementById('admin-page-title');
    if (titleEl) titleEl.textContent = 'A/B 封面实验';
    loadAbExperiments();
}

async function loadAbExperiments() {
    const contentEl = document.getElementById('ab-experiments-content');
    if (!contentEl) return;
    contentEl.innerHTML = renderLoading();

    try {
        const params = {};
        if (abExperimentsState.statusFilter) params.status = abExperimentsState.statusFilter;

        const res = await api.admin.abExperiments(params);
        abExperimentsState.experiments = res.data || [];

        renderAbExperimentsList();
    } catch (e) {
        contentEl.innerHTML = renderEmpty('加载失败');
    }
}

function renderAbExperimentsList() {
    const contentEl = document.getElementById('ab-experiments-content');
    if (!contentEl) return;

    const experiments = abExperimentsState.experiments;

    if (experiments.length === 0) {
        contentEl.innerHTML = `
            <div style="margin-bottom:16px;display:flex;gap:8px">
                <button class="btn btn-sm ${abExperimentsState.statusFilter === '' ? 'btn-primary' : 'btn-secondary'}" onclick="filterAbStatus('')">全部</button>
                <button class="btn btn-sm ${abExperimentsState.statusFilter === 'running' ? 'btn-primary' : 'btn-secondary'}" onclick="filterAbStatus('running')">运行中</button>
                <button class="btn btn-sm ${abExperimentsState.statusFilter === 'paused' ? 'btn-primary' : 'btn-secondary'}" onclick="filterAbStatus('paused')">已暂停</button>
                <button class="btn btn-sm ${abExperimentsState.statusFilter === 'completed' ? 'btn-primary' : 'btn-secondary'}" onclick="filterAbStatus('completed')">已完成</button>
            </div>
            ${renderEmpty('暂无A/B实验数据', '&#128302;')}
        `;
        return;
    }

    let html = `
        <div style="margin-bottom:16px;display:flex;gap:8px">
            <button class="btn btn-sm ${abExperimentsState.statusFilter === '' ? 'btn-primary' : 'btn-secondary'}" onclick="filterAbStatus('')">全部 (${experiments.length})</button>
            <button class="btn btn-sm ${abExperimentsState.statusFilter === 'running' ? 'btn-primary' : 'btn-secondary'}" onclick="filterAbStatus('running')">运行中 (${experiments.filter(e => e.status === 'running').length})</button>
            <button class="btn btn-sm ${abExperimentsState.statusFilter === 'paused' ? 'btn-primary' : 'btn-secondary'}" onclick="filterAbStatus('paused')">已暂停 (${experiments.filter(e => e.status === 'paused').length})</button>
            <button class="btn btn-sm ${abExperimentsState.statusFilter === 'completed' ? 'btn-primary' : 'btn-secondary'}" onclick="filterAbStatus('completed')">已完成 (${experiments.filter(e => e.status === 'completed').length})</button>
        </div>
    `;

    experiments.forEach(exp => {
        const stats = exp.stats || {};
        const aCtr = stats.a_ctr || 0;
        const bCtr = stats.b_ctr || 0;
        const leader = stats.leader;
        const hasMinSample = stats.has_min_sample;
        const significant = stats.significant;

        const statusMap = {
            running: '<span class="badge badge-success">运行中</span>',
            paused: '<span class="badge badge-warning">已暂停</span>',
            completed: '<span class="badge badge-gray">已完成</span>'
        };

        const winnerLabel = exp.winner ? `封面 ${exp.winner.toUpperCase()}` : '-';

        html += `
            <div class="card" style="margin-bottom:16px">
                <div class="card-header">
                    <div style="display:flex;align-items:center;gap:12px">
                        <h2 style="margin:0">${escapeHtml(exp.album_title || '未知画册')}</h2>
                        ${statusMap[exp.status] || ''}
                    </div>
                    <a href="#/admin/albums/edit/${exp.album_id}" class="btn btn-sm btn-secondary">编辑画册</a>
                </div>
                <div class="card-body">
                    <div class="ab-experiment-stats">
                        <div class="ab-variant-card ${leader === 'a' && significant ? 'ab-variant-leading' : ''} ${exp.winner === 'a' ? 'ab-variant-winner' : ''}">
                            <div class="ab-variant-label">封面 A</div>
                            <div class="ab-variant-cover">
                                <img src="${getImageUrl(exp.cover_a_image_url)}" alt="封面A" onerror="this.src='${getPlaceholderImage()}'">
                            </div>
                            <div class="ab-variant-stats">
                                <div class="ab-stat"><span class="ab-stat-label">曝光</span><span class="ab-stat-value">${stats.a_exposures || 0}</span></div>
                                <div class="ab-stat"><span class="ab-stat-label">点击</span><span class="ab-stat-value">${stats.a_clicks || 0}</span></div>
                                <div class="ab-stat"><span class="ab-stat-label">点击率</span><span class="ab-stat-value">${aCtr}%</span></div>
                                ${leader === 'a' && significant ? '<div class="ab-stat ab-stat-significant">&#10004; 显著领先</div>' : ''}
                                ${leader === 'a' && !significant && hasMinSample ? '<div class="ab-stat ab-stat-trending">&#8593; 领先中</div>' : ''}
                            </div>
                        </div>
                        <div class="ab-variant-card ${leader === 'b' && significant ? 'ab-variant-leading' : ''} ${exp.winner === 'b' ? 'ab-variant-winner' : ''}">
                            <div class="ab-variant-label">封面 B</div>
                            <div class="ab-variant-cover">
                                <img src="${getImageUrl(exp.cover_b_image_url)}" alt="封面B" onerror="this.src='${getPlaceholderImage()}'">
                            </div>
                            <div class="ab-variant-stats">
                                <div class="ab-stat"><span class="ab-stat-label">曝光</span><span class="ab-stat-value">${stats.b_exposures || 0}</span></div>
                                <div class="ab-stat"><span class="ab-stat-label">点击</span><span class="ab-stat-value">${stats.b_clicks || 0}</span></div>
                                <div class="ab-stat"><span class="ab-stat-label">点击率</span><span class="ab-stat-value">${bCtr}%</span></div>
                                ${leader === 'b' && significant ? '<div class="ab-stat ab-stat-significant">&#10004; 显著领先</div>' : ''}
                                ${leader === 'b' && !significant && hasMinSample ? '<div class="ab-stat ab-stat-trending">&#8593; 领先中</div>' : ''}
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:12px;display:flex;gap:16px;align-items:center;font-size:13px;color:var(--gray-500)">
                        <span>开始时间: ${formatDateTime(exp.started_at)}</span>
                        ${exp.ended_at ? `<span>结束时间: ${formatDateTime(exp.ended_at)}</span>` : ''}
                    </div>

                    ${!hasMinSample && exp.status === 'running' ? `
                        <div class="ab-experiment-tip">
                            &#8505; 样本量不足（每个版本至少需要100次曝光），暂无法判定胜出版本
                        </div>
                    ` : ''}

                    ${hasMinSample && !significant && exp.status === 'running' ? `
                        <div class="ab-experiment-tip">
                            &#8505; 当前两版本点击率差异未达到统计显著性，建议继续运行实验积累更多数据
                        </div>
                    ` : ''}

                    ${exp.status === 'completed' ? `
                        <div class="ab-experiment-result">
                            实验已结束，胜出封面：${winnerLabel}
                        </div>
                    ` : ''}

                    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
                        ${exp.status === 'running' ? `
                            <button class="btn btn-secondary btn-sm" onclick="dashboardPauseAb(${exp.id})">&#9208; 暂停</button>
                            ${significant || hasMinSample ? `
                                <button class="btn btn-primary btn-sm" onclick="dashboardAdoptAb(${exp.id}, '${leader || 'a'}')">&#10004; 采用封面${(leader || 'a').toUpperCase()}</button>
                            ` : ''}
                            ${!significant && hasMinSample ? `
                                <button class="btn btn-secondary btn-sm" onclick="dashboardForceAdoptAb(${exp.id})">&#9889; 强制结束</button>
                            ` : ''}
                        ` : ''}
                        ${exp.status === 'paused' ? `
                            <button class="btn btn-success btn-sm" onclick="dashboardResumeAb(${exp.id})">&#9654; 恢复</button>
                        ` : ''}
                        ${exp.status !== 'completed' ? `
                            <button class="btn btn-secondary btn-sm" onclick="dashboardResetAb(${exp.id})">&#128260; 重置数据</button>
                        ` : ''}
                        <button class="btn btn-danger btn-sm" onclick="dashboardDeleteAb(${exp.id})">&#128465; 删除</button>
                    </div>
                </div>
            </div>
        `;
    });

    contentEl.innerHTML = html;
}

function filterAbStatus(status) {
    abExperimentsState.statusFilter = status;
    loadAbExperiments();
}

async function dashboardPauseAb(expId) {
    try {
        await api.admin.updateAbExperiment(expId, { status: 'paused' });
        showToast('实验已暂停', 'success');
        loadAbExperiments();
    } catch (e) {}
}

async function dashboardResumeAb(expId) {
    try {
        await api.admin.updateAbExperiment(expId, { status: 'running' });
        showToast('实验已恢复', 'success');
        loadAbExperiments();
    } catch (e) {}
}

async function dashboardAdoptAb(expId, variant) {
    showConfirmModal('采用封面并结束实验', `确定采用封面${variant.toUpperCase()}作为正式封面并结束实验？`, async () => {
        try {
            await api.admin.adoptAbExperiment(expId, { winner: variant });
            showToast(`已采用封面${variant.toUpperCase()}并结束实验`, 'success');
            loadAbExperiments();
        } catch (e) {}
    });
}

async function dashboardForceAdoptAb(expId) {
    const exp = abExperimentsState.experiments.find(e => e.id === expId);
    const stats = (exp && exp.stats) || {};
    const leader = stats.leader || 'a';

    showConfirmModal('强制结束实验', `当前差异未达统计显著性。确定强制采用封面${leader.toUpperCase()}结束实验？`, async () => {
        try {
            await api.admin.forceAdoptAbExperiment(expId, { winner: leader });
            showToast(`已强制采用封面${leader.toUpperCase()}并结束实验`, 'success');
            loadAbExperiments();
        } catch (e) {}
    });
}

async function dashboardResetAb(expId) {
    showConfirmModal('重置实验数据', '确定要清零该实验的所有曝光和点击数据？此操作不可恢复。', async () => {
        try {
            await api.admin.resetAbExperiment(expId);
            showToast('实验数据已清零', 'success');
            loadAbExperiments();
        } catch (e) {}
    });
}

async function dashboardDeleteAb(expId) {
    showConfirmModal('删除实验', '确定要删除该A/B实验及其所有数据？此操作不可恢复。', async () => {
        try {
            await api.admin.deleteAbExperiment(expId);
            showToast('实验已删除', 'success');
            loadAbExperiments();
        } catch (e) {}
    });
}
