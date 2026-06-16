let homeState = { albums: [], categories: [], page: 1, total: 0, limit: 12, categoryId: '', keyword: '', abAssignments: {}, tagCloud: [], activeTagId: null };

function renderHomePage() {
    return `
        <div class="home-page">
            ${renderNavbar('home')}
            <section class="hero-section">
                <div class="hero-content">
                    <h1>精美翻页画册</h1>
                    <p>创建、分享和浏览精美的翻页电子画册，支持多终端自适应浏览</p>
                    <div class="hero-search">
                        <input type="text" id="home-search" placeholder="搜索画册..." value="${escapeHtml(homeState.keyword)}" onkeydown="if(event.key==='Enter')searchAlbums()">
                        <button onclick="searchAlbums()">搜索</button>
                    </div>
                </div>
            </section>
            <div id="category-bar"></div>
            <div id="tag-cloud-section"></div>
            <div class="albums-container">
                <div id="albums-list">${renderLoading()}</div>
                <div id="albums-pagination"></div>
            </div>
            ${renderFooter()}
        </div>
    `;
}

async function initHomePage() {
    try {
        const [catRes] = await Promise.all([
            api.public.categories(),
        ]);
        homeState.categories = catRes.data || [];
        renderCategoryBar();
    } catch (e) {}
    try {
        const tagRes = await api.public.tagCloud();
        homeState.tagCloud = tagRes.data || [];
        renderTagCloud();
    } catch (e) {}
    loadHomeAlbums();
}

function renderCategoryBar() {
    const bar = document.getElementById('category-bar');
    if (!bar) return;
    let html = '<div class="category-filter">';
    html += `<span class="category-chip ${homeState.categoryId === '' ? 'active' : ''}" onclick="filterCategory('')">全部</span>`;
    homeState.categories.forEach(cat => {
        html += `<span class="category-chip ${homeState.categoryId == cat.id ? 'active' : ''}" onclick="filterCategory(${cat.id})">${escapeHtml(cat.name)}</span>`;
    });
    html += '</div>';
    bar.innerHTML = html;
}

function filterCategory(id) {
    homeState.categoryId = id;
    homeState.activeTagId = null;
    homeState.page = 1;
    renderCategoryBar();
    renderTagCloud();
    loadHomeAlbums();
}

function searchAlbums() {
    const input = document.getElementById('home-search');
    homeState.keyword = input ? input.value.trim() : '';
    homeState.page = 1;
    homeState.activeTagId = null;
    renderTagCloud();
    loadHomeAlbums();
}

function renderTagCloud() {
    const section = document.getElementById('tag-cloud-section');
    if (!section) return;

    if (homeState.tagCloud.length === 0) {
        section.innerHTML = '';
        return;
    }

    let html = '<div class="tag-cloud-container">';
    html += '<h3 class="tag-cloud-title">热门标签</h3>';
    html += '<div class="tag-cloud">';
    homeState.tagCloud.forEach(tag => {
        const isActive = homeState.activeTagId === tag.id;
        const fontSize = Math.max(12, Math.min(32, tag.weight * 0.28 + 12));
        html += `<span class="tag-cloud-item ${isActive ? 'tag-cloud-item-active' : ''}" 
            style="font-size:${fontSize}px"
            onclick="filterByTag(${tag.id}, '${escapeHtml(tag.name)}')">${escapeHtml(tag.name)}</span>`;
    });
    html += '</div>';
    if (homeState.activeTagId) {
        html += `<div class="tag-cloud-active-info">
            <span>按标签筛选：<strong>${escapeHtml(homeState.tagCloud.find(t => t.id === homeState.activeTagId)?.name || '')}</strong></span>
            <button class="btn btn-sm btn-secondary" onclick="clearTagFilter()">&#10005; 清除筛选</button>
        </div>`;
    }
    html += '</div>';
    section.innerHTML = html;
}

function filterByTag(tagId, tagName) {
    if (homeState.activeTagId === tagId) {
        clearTagFilter();
        return;
    }
    homeState.activeTagId = tagId;
    homeState.categoryId = '';
    homeState.keyword = '';
    homeState.page = 1;
    renderCategoryBar();
    renderTagCloud();
    loadHomeAlbums();
}

function clearTagFilter() {
    homeState.activeTagId = null;
    homeState.page = 1;
    renderTagCloud();
    loadHomeAlbums();
}

async function loadHomeAlbums() {
    const listEl = document.getElementById('albums-list');
    const pagEl = document.getElementById('albums-pagination');
    if (!listEl) return;
    listEl.innerHTML = renderLoading();

    try {
        let res;

        if (homeState.activeTagId) {
            const params = { tag_id: homeState.activeTagId, page: homeState.page, limit: homeState.limit };
            res = await api.public.albumsByTag(params);
        } else {
            const params = { page: homeState.page, limit: homeState.limit };
            if (homeState.categoryId) params.category_id = homeState.categoryId;
            if (homeState.keyword) params.keyword = homeState.keyword;
            res = await api.public.albums(params);
        }

        homeState.albums = res.data.list || [];
        homeState.total = res.data.total || 0;

        if (homeState.albums.length === 0) {
            listEl.innerHTML = renderEmpty('暂无画册', '&#128218;');
            if (pagEl) pagEl.innerHTML = '';
            return;
        }

        await processAbExperiments();

        let html = '<div class="albums-grid">';
        homeState.albums.forEach(album => {
            let coverUrl = album.cover_image_url ? getImageUrl(album.cover_image_url) : getPlaceholderImage();
            const assignment = homeState.abAssignments[album.id];

            if (assignment) {
                coverUrl = assignment.cover_image_url ? getImageUrl(assignment.cover_image_url) : getPlaceholderImage();
            }

            const levelBadge = album.min_level > 0
                ? `<span class="album-card-lock">&#128274; 会员专属</span>` : '';
            const pwdBadge = album.has_password
                ? `<span class="badge badge-warning" style="font-size:11px">密码访问</span>` : '';

            html += `
                <div class="album-card" onclick="viewAlbum(${album.id})">
                    <div class="album-card-image">
                        <img src="${coverUrl}" alt="${escapeHtml(album.title)}" onerror="this.src='${getPlaceholderImage()}'">
                        ${levelBadge}
                        <div class="album-card-badge">${pwdBadge}</div>
                    </div>
                    <div class="album-card-body">
                        <div class="album-card-title">${escapeHtml(album.title)}</div>
                        <div class="album-card-desc">${escapeHtml(album.description || '暂无描述')}</div>
                        <div class="album-card-meta">
                            <span>&#128196; ${album.page_count || 0} 页</span>
                            <span>&#128065; ${album.view_count || 0} 次浏览</span>
                        </div>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        listEl.innerHTML = html;

        reportAbExposures();

        if (pagEl) {
            pagEl.innerHTML = renderPagination(homeState.total, homeState.page, homeState.limit, 'goHomePage');
        }
    } catch (e) {
        listEl.innerHTML = renderEmpty('加载失败，请稍后重试');
    }
}

async function processAbExperiments() {
    const albums = homeState.albums.filter(a => a.ab_experiment);
    if (albums.length === 0) return;

    const fp = getVisitorFingerprint();

    for (const album of albums) {
        const exp = album.ab_experiment;
        const cached = getAbAssignment(album.id);
        if (cached && cached.experiment_id === exp.id) {
            homeState.abAssignments[album.id] = cached;
            continue;
        }

        const variant = getAbVariant(album.id);
        const coverImageUrl = variant === 'a' ? exp.cover_a_image_url : exp.cover_b_image_url;

        const assignment = {
            experiment_id: exp.id,
            variant: variant,
            cover_image_url: coverImageUrl
        };

        homeState.abAssignments[album.id] = assignment;
        setAbAssignment(album.id, assignment);
    }
}

function reportAbExposures() {
    const fp = getVisitorFingerprint();
    for (const album of homeState.albums) {
        const assignment = homeState.abAssignments[album.id];
        if (!assignment) continue;

        api.public.abExposure({
            experiment_id: assignment.experiment_id,
            fingerprint: fp,
            variant: assignment.variant
        }).catch(() => {});
    }
}

function goHomePage(page) {
    homeState.page = page;
    loadHomeAlbums();
    window.scrollTo({ top: 400, behavior: 'smooth' });
}

function viewAlbum(id) {
    const assignment = homeState.abAssignments[id];
    if (assignment) {
        const fp = getVisitorFingerprint();
        api.public.abClick({
            experiment_id: assignment.experiment_id,
            fingerprint: fp,
            variant: assignment.variant
        }).catch(() => {});
    }
    window.location.hash = `#/viewer/${id}`;
}
