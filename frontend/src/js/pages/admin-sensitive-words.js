let sensitiveWordCurrentPage = 1;
let sensitiveWordCurrentTab = 'words';
let sensitiveWordLevelMap = {};
let sensitiveWordSelectedIds = new Set();

function renderAdminSensitiveWords() {
    const content = `
        <div class="admin-page-header">
            <h2>敏感词管理</h2>
        </div>
        <div class="card" style="margin-bottom:16px">
            <div class="admin-stats-grid" id="sensitive-stats" style="grid-template-columns:repeat(4,1fr)">
                <div class="stat-item">
                    <div class="stat-value" id="stat-total">-</div>
                    <div class="stat-label">总敏感词</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="stat-forbid" style="color:var(--danger)">-</div>
                    <div class="stat-label">禁止级</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="stat-replace" style="color:var(--warning)">-</div>
                    <div class="stat-label">替换级</div>
                </div>
                <div class="stat-item">
                    <div class="stat-value" id="stat-mark" style="color:var(--info)">-</div>
                    <div class="stat-label">标记待审</div>
                </div>
            </div>
        </div>
        <div class="card">
            <div class="tabs">
                <button class="tab-btn active" data-tab="words" onclick="switchSensitiveTab('words')">
                    &#128279; 敏感词库
                </button>
                <button class="tab-btn" data-tab="whitelist" onclick="switchSensitiveTab('whitelist')">
                    &#9989; 白名单
                </button>
            </div>
            <div id="sensitive-words-content">
                <div class="admin-page-toolbar">
                    <div class="toolbar-left">
                        <input type="text" id="sw-keyword" placeholder="搜索敏感词..." oninput="loadSensitiveWords(1)" />
                        <select id="sw-level" onchange="loadSensitiveWords(1)">
                            <option value="">全部级别</option>
                            <option value="forbid">禁止</option>
                            <option value="replace">替换为星号</option>
                            <option value="mark">标记待审</option>
                        </select>
                        <select id="sw-status" onchange="loadSensitiveWords(1)">
                            <option value="">全部状态</option>
                            <option value="1">启用</option>
                            <option value="0">禁用</option>
                        </select>
                    </div>
                    <div class="toolbar-right">
                        <button class="btn btn-secondary" onclick="showBatchImportModal()">&#128228; 批量导入</button>
                        <button class="btn btn-secondary" onclick="refreshSensitiveCache()">&#128260; 刷新缓存</button>
                        <button class="btn btn-primary" onclick="showSensitiveWordModal()">&#10133; 新增敏感词</button>
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th style="width:40px"><input type="checkbox" id="sw-select-all" onchange="toggleSelectAllSensitiveWords(this)" /></th>
                                <th>ID</th>
                                <th>敏感词</th>
                                <th>级别</th>
                                <th>分类</th>
                                <th>备注</th>
                                <th>状态</th>
                                <th>创建时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="sensitive-words-tbody">
                            <tr><td colspan="9" class="text-center">加载中...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="sw-pagination" class="pagination"></div>
            </div>
            <div id="sensitive-whitelist-content" style="display:none">
                <div class="admin-page-toolbar">
                    <div class="toolbar-left">
                        <input type="text" id="wl-keyword" placeholder="搜索白名单词..." oninput="loadWhitelist(1)" />
                    </div>
                    <div class="toolbar-right">
                        <button class="btn btn-primary" onclick="showWhitelistModal()">&#10133; 新增白名单</button>
                    </div>
                </div>
                <div class="table-container">
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>白名单词</th>
                                <th>备注</th>
                                <th>状态</th>
                                <th>创建时间</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody id="whitelist-tbody">
                            <tr><td colspan="6" class="text-center">加载中...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div id="wl-pagination" class="pagination"></div>
            </div>
        </div>
        <div class="modal" id="sensitive-word-modal">
            <div class="modal-content" style="max-width:500px">
                <div class="modal-header">
                    <h3 id="sw-modal-title">新增敏感词</h3>
                    <button class="modal-close" onclick="closeModalById('sensitive-word-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>敏感词 <span style="color:var(--danger)">*</span></label>
                        <input type="text" id="sw-word" placeholder="请输入敏感词" />
                    </div>
                    <div class="form-group">
                        <label>级别 <span style="color:var(--danger)">*</span></label>
                        <select id="sw-level-modal">
                            <option value="forbid">禁止 - 直接拦截提交</option>
                            <option value="replace">替换 - 自动替换为星号</option>
                            <option value="mark">标记 - 正常入库但进入待审</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>分类</label>
                        <input type="text" id="sw-category" placeholder="如：政治类、广告类" />
                    </div>
                    <div class="form-group">
                        <label>备注</label>
                        <textarea id="sw-remark" rows="2" placeholder="备注说明"></textarea>
                    </div>
                    <div class="form-group">
                        <label>状态</label>
                        <select id="sw-status-modal">
                            <option value="1">启用</option>
                            <option value="0">禁用</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModalById('sensitive-word-modal')">取消</button>
                    <button class="btn btn-primary" onclick="saveSensitiveWord()">保存</button>
                </div>
            </div>
        </div>
        <div class="modal" id="whitelist-modal">
            <div class="modal-content" style="max-width:500px">
                <div class="modal-header">
                    <h3 id="wl-modal-title">新增白名单</h3>
                    <button class="modal-close" onclick="closeModalById('whitelist-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>白名单词 <span style="color:var(--danger)">*</span></label>
                        <input type="text" id="wl-word" placeholder="请输入白名单词（不会被识别为敏感词）" />
                    </div>
                    <div class="form-group">
                        <label>备注</label>
                        <textarea id="wl-remark" rows="2" placeholder="备注说明"></textarea>
                    </div>
                    <div class="form-group">
                        <label>状态</label>
                        <select id="wl-status-modal">
                            <option value="1">启用</option>
                            <option value="0">禁用</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModalById('whitelist-modal')">取消</button>
                    <button class="btn btn-primary" onclick="saveWhitelist()">保存</button>
                </div>
            </div>
        </div>
        <div class="modal" id="batch-import-modal">
            <div class="modal-content" style="max-width:600px">
                <div class="modal-header">
                    <h3>批量导入敏感词</h3>
                    <button class="modal-close" onclick="closeModalById('batch-import-modal')">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label>默认级别</label>
                        <select id="bi-default-level">
                            <option value="forbid">禁止</option>
                            <option value="replace">替换为星号</option>
                            <option value="mark">标记待审</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>默认分类</label>
                        <input type="text" id="bi-default-category" placeholder="可留空" />
                    </div>
                    <div class="form-group">
                        <label>敏感词列表 <span style="color:var(--danger)">*</span></label>
                        <textarea id="bi-words" rows="10" placeholder="每行一个敏感词&#10;也支持 JSON 数组格式：[{&quot;word&quot;:&quot;敏感词1&quot;,&quot;level&quot;:&quot;forbid&quot;,&quot;category&quot;:&quot;分类&quot;}]"></textarea>
                        <small style="color:var(--gray-500);margin-top:4px;display:block">
                            支持两种格式：<br/>
                            1. 纯文本：每行一个词<br/>
                            2. JSON数组：[{"word":"敏感词","level":"forbid","category":"分类","remark":"备注"}]
                        </small>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeModalById('batch-import-modal')">取消</button>
                    <button class="btn btn-primary" onclick="doBatchImport()">开始导入</button>
                </div>
            </div>
        </div>
    `;
    return renderAdminLayout('sensitive-words', content);
}

async function initAdminSensitiveWords() {
    document.getElementById('admin-page-title').textContent = '敏感词管理';
    await loadSensitiveWordStats();
    await loadSensitiveWords(1);
}

async function loadSensitiveWordStats() {
    try {
        const res = await api.admin.sensitiveWordStats();
        const data = res.data;
        document.getElementById('stat-total').textContent = data.total || 0;
        document.getElementById('stat-forbid').textContent = data.forbid_count || 0;
        document.getElementById('stat-replace').textContent = data.replace_count || 0;
        document.getElementById('stat-mark').textContent = data.mark_count || 0;
    } catch (e) {}
}

function switchSensitiveTab(tab) {
    sensitiveWordCurrentTab = tab;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });
    document.getElementById('sensitive-words-content').style.display = tab === 'words' ? 'block' : 'none';
    document.getElementById('sensitive-whitelist-content').style.display = tab === 'whitelist' ? 'block' : 'none';
    if (tab === 'whitelist') {
        loadWhitelist(1);
    }
}

async function loadSensitiveWords(page) {
    sensitiveWordCurrentPage = page || 1;
    const keyword = document.getElementById('sw-keyword').value;
    const level = document.getElementById('sw-level').value;
    const status = document.getElementById('sw-status').value;

    try {
        const res = await api.admin.sensitiveWords({ page: sensitiveWordCurrentPage, limit: 20, keyword, level, status });
        const data = res.data;
        sensitiveWordLevelMap = data.level_map || {};
        sensitiveWordSelectedIds.clear();
        document.getElementById('sw-select-all').checked = false;

        const tbody = document.getElementById('sensitive-words-tbody');
        if (!data.list || data.list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9" class="text-center text-gray">暂无数据</td></tr>';
        } else {
            tbody.innerHTML = data.list.map(item => `
                <tr>
                    <td><input type="checkbox" class="sw-select-item" value="${item.id}" onchange="toggleSelectSensitiveWord(${item.id}, this)" /></td>
                    <td>${item.id}</td>
                    <td><code style="background:var(--gray-100);padding:2px 6px;border-radius:4px">${escapeHtml(item.word)}</code></td>
                    <td>${getLevelBadge(item.level)}</td>
                    <td>${escapeHtml(item.category || '-')}</td>
                    <td>${escapeHtml(item.remark || '-')}</td>
                    <td>${item.status ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-danger">禁用</span>'}</td>
                    <td>${formatDate(item.created_at)}</td>
                    <td>
                        <button class="btn-link" onclick="showSensitiveWordModal(${item.id})">编辑</button>
                        <button class="btn-link btn-danger" onclick="deleteSensitiveWord(${item.id})">删除</button>
                    </td>
                </tr>
            `).join('');
        }
        renderPaginationAndInsert('sw-pagination', data.total, sensitiveWordCurrentPage, 20, 'goToSensitiveWordsPage');
    } catch (e) {}
}

function goToSensitiveWordsPage(page) {
    loadSensitiveWords(page);
}

function getLevelBadge(level) {
    const map = {
        forbid: { text: '禁止', class: 'badge-danger' },
        replace: { text: '替换', class: 'badge-warning' },
        mark: { text: '待审', class: 'badge-info' },
    };
    const item = map[level] || { text: level, class: '' };
    return `<span class="badge ${item.class}">${item.text}</span>`;
}

function toggleSelectAllSensitiveWords(checkbox) {
    document.querySelectorAll('.sw-select-item').forEach(cb => {
        cb.checked = checkbox.checked;
        const id = parseInt(cb.value);
        if (checkbox.checked) {
            sensitiveWordSelectedIds.add(id);
        } else {
            sensitiveWordSelectedIds.delete(id);
        }
    });
}

function toggleSelectSensitiveWord(id, checkbox) {
    if (checkbox.checked) {
        sensitiveWordSelectedIds.add(id);
    } else {
        sensitiveWordSelectedIds.delete(id);
    }
}

let editingSensitiveWordId = null;

function showSensitiveWordModal(id) {
    editingSensitiveWordId = id || null;
    document.getElementById('sw-modal-title').textContent = id ? '编辑敏感词' : '新增敏感词';

    if (id) {
        api.admin.sensitiveWordDetail(id).then(res => {
            const d = res.data;
            document.getElementById('sw-word').value = d.word;
            document.getElementById('sw-level-modal').value = d.level;
            document.getElementById('sw-category').value = d.category || '';
            document.getElementById('sw-remark').value = d.remark || '';
            document.getElementById('sw-status-modal').value = String(d.status);
        }).catch(() => {});
    } else {
        document.getElementById('sw-word').value = '';
        document.getElementById('sw-level-modal').value = 'forbid';
        document.getElementById('sw-category').value = '';
        document.getElementById('sw-remark').value = '';
        document.getElementById('sw-status-modal').value = '1';
    }
    openModal('sensitive-word-modal');
}

async function saveSensitiveWord() {
    const word = document.getElementById('sw-word').value.trim();
    if (!word) {
        showToast('请输入敏感词', 'warning');
        return;
    }
    const data = {
        word,
        level: document.getElementById('sw-level-modal').value,
        category: document.getElementById('sw-category').value.trim(),
        remark: document.getElementById('sw-remark').value.trim(),
        status: parseInt(document.getElementById('sw-status-modal').value),
    };

    try {
        if (editingSensitiveWordId) {
            await api.admin.updateSensitiveWord(editingSensitiveWordId, data);
            showToast('更新成功', 'success');
        } else {
            await api.admin.createSensitiveWord(data);
            showToast('添加成功', 'success');
        }
        closeModalById('sensitive-word-modal');
        loadSensitiveWordStats();
        loadSensitiveWords(sensitiveWordCurrentPage);
    } catch (e) {}
}

async function deleteSensitiveWord(id) {
    if (!confirm('确定要删除这个敏感词吗？')) return;
    try {
        await api.admin.deleteSensitiveWord(id);
        showToast('删除成功', 'success');
        loadSensitiveWordStats();
        loadSensitiveWords(sensitiveWordCurrentPage);
    } catch (e) {}
}

async function refreshSensitiveCache() {
    try {
        await api.admin.refreshSensitiveWordCache();
        showToast('缓存刷新成功', 'success');
    } catch (e) {}
}

function showBatchImportModal() {
    document.getElementById('bi-default-level').value = 'forbid';
    document.getElementById('bi-default-category').value = '';
    document.getElementById('bi-words').value = '';
    openModal('batch-import-modal');
}

async function doBatchImport() {
    const rawText = document.getElementById('bi-words').value.trim();
    if (!rawText) {
        showToast('请输入敏感词列表', 'warning');
        return;
    }

    let words = [];
    try {
        const parsed = JSON.parse(rawText);
        if (Array.isArray(parsed)) {
            words = parsed;
        } else {
            throw new Error('not json');
        }
    } catch (e) {
        const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
        words = lines;
    }

    const data = {
        words,
        default_level: document.getElementById('bi-default-level').value,
        default_category: document.getElementById('bi-default-category').value.trim(),
    };

    try {
        const res = await api.admin.batchImportSensitiveWords(data);
        const result = res.data;
        showToast(`导入完成：成功${result.success_count}条，失败${result.fail_count}条`, result.fail_count > 0 ? 'warning' : 'success');
        if (result.errors && result.errors.length > 0) {
            alert('以下条目导入失败：\n' + result.errors.join('\n'));
        }
        closeModalById('batch-import-modal');
        loadSensitiveWordStats();
        loadSensitiveWords(sensitiveWordCurrentPage);
    } catch (e) {}
}

let whitelistCurrentPage = 1;
let editingWhitelistId = null;

async function loadWhitelist(page) {
    whitelistCurrentPage = page || 1;
    const keyword = document.getElementById('wl-keyword').value;

    try {
        const res = await api.admin.sensitiveWhitelist({ page: whitelistCurrentPage, limit: 20, keyword });
        const data = res.data;
        const tbody = document.getElementById('whitelist-tbody');
        if (!data.list || data.list.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-gray">暂无数据</td></tr>';
        } else {
            tbody.innerHTML = data.list.map(item => `
                <tr>
                    <td>${item.id}</td>
                    <td><code style="background:var(--gray-100);padding:2px 6px;border-radius:4px">${escapeHtml(item.word)}</code></td>
                    <td>${escapeHtml(item.remark || '-')}</td>
                    <td>${item.status ? '<span class="badge badge-success">启用</span>' : '<span class="badge badge-danger">禁用</span>'}</td>
                    <td>${formatDate(item.created_at)}</td>
                    <td>
                        <button class="btn-link" onclick="showWhitelistModal(${item.id})">编辑</button>
                        <button class="btn-link btn-danger" onclick="deleteWhitelist(${item.id})">删除</button>
                    </td>
                </tr>
            `).join('');
        }
        renderPaginationAndInsert('wl-pagination', data.total, whitelistCurrentPage, 20, 'goToWhitelistPage');
    } catch (e) {}
}

function goToWhitelistPage(page) {
    loadWhitelist(page);
}

function showWhitelistModal(id) {
    editingWhitelistId = id || null;
    document.getElementById('wl-modal-title').textContent = id ? '编辑白名单' : '新增白名单';

    if (id) {
        api.admin.sensitiveWhitelist({ page: 1, limit: 1000 }).then(res => {
            const item = res.data.list.find(i => i.id === id);
            if (item) {
                document.getElementById('wl-word').value = item.word;
                document.getElementById('wl-remark').value = item.remark || '';
                document.getElementById('wl-status-modal').value = String(item.status);
            }
        }).catch(() => {});
    } else {
        document.getElementById('wl-word').value = '';
        document.getElementById('wl-remark').value = '';
        document.getElementById('wl-status-modal').value = '1';
    }
    openModal('whitelist-modal');
}

async function saveWhitelist() {
    const word = document.getElementById('wl-word').value.trim();
    if (!word) {
        showToast('请输入白名单词', 'warning');
        return;
    }
    const data = {
        word,
        remark: document.getElementById('wl-remark').value.trim(),
        status: parseInt(document.getElementById('wl-status-modal').value),
    };

    try {
        if (editingWhitelistId) {
            await api.admin.updateSensitiveWhitelist(editingWhitelistId, data);
            showToast('更新成功', 'success');
        } else {
            await api.admin.createSensitiveWhitelist(data);
            showToast('添加成功', 'success');
        }
        closeModalById('whitelist-modal');
        loadWhitelist(whitelistCurrentPage);
    } catch (e) {}
}

async function deleteWhitelist(id) {
    if (!confirm('确定要删除这个白名单词吗？')) return;
    try {
        await api.admin.deleteSensitiveWhitelist(id);
        showToast('删除成功', 'success');
        loadWhitelist(whitelistCurrentPage);
    } catch (e) {}
}
