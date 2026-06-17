const routes = {
    '/': { render: renderHomePage, init: initHomePage, auth: false },
    '/login': { render: renderLoginPage, auth: false },
    '/register': { render: renderRegisterPage, auth: false },
    '/viewer/:id': { render: renderViewerPage, init: initViewerPage, auth: false },
    '/profile': { render: renderProfilePage, auth: true },
    '/big-screen': { render: renderBigScreenPage, init: initBigScreen, auth: false, fullscreen: true },
    '/admin': { render: renderAdminDashboard, init: initAdminDashboard, auth: true, admin: true },
    '/admin/albums': { render: renderAdminAlbums, init: initAdminAlbums, auth: true, admin: true },
    '/admin/albums/create': { render: () => renderAdminAlbumEdit(null), init: () => initAdminAlbumEdit(null), auth: true, admin: true },
    '/admin/albums/edit/:id': { render: renderAdminAlbumEdit, init: initAdminAlbumEdit, auth: true, admin: true },
    '/admin/ab-experiments': { render: renderAdminAbExperiments, init: initAdminAbExperiments, auth: true, admin: true },
    '/admin/short-links': { render: () => renderAdminShortLinks(null), init: () => initAdminShortLinks(null), auth: true, admin: true },
    '/admin/short-links/:albumId': { render: renderAdminShortLinks, init: initAdminShortLinks, auth: true, admin: true },
    '/admin/users': { render: renderAdminUsers, init: initAdminUsers, auth: true, admin: true },
    '/admin/levels': { render: renderAdminLevels, init: initAdminLevels, auth: true, admin: true },
    '/admin/categories': { render: renderAdminCategories, init: initAdminCategories, auth: true, admin: true },
    '/admin/backgrounds': { render: renderAdminBackgrounds, init: initAdminBackgrounds, auth: true, admin: true },
    '/admin/comments': { render: renderAdminCommentsPage, init: initAdminCommentsPage, auth: true, admin: true },
    '/admin/sensitive-words': { render: renderAdminSensitiveWords, init: initAdminSensitiveWords, auth: true, admin: true },
    '/admin/pending-contents': { render: renderAdminPendingContents, init: initAdminPendingContents, auth: true, admin: true },
};

function matchRoute(path) {
    for (const [pattern, route] of Object.entries(routes)) {
        const paramNames = [];
        const regexStr = pattern.replace(/:(\w+)/g, (_, name) => {
            paramNames.push(name);
            return '([^/]+)';
        });
        const regex = new RegExp(`^${regexStr}$`);
        const match = path.match(regex);
        if (match) {
            const params = {};
            paramNames.forEach((name, i) => {
                params[name] = match[i + 1];
            });
            return { route, params };
        }
    }
    return null;
}

function navigateTo(path) {
    window.location.hash = '#' + path;
}

async function handleRoute() {
    const hash = window.location.hash.slice(1) || '/';
    const path = hash.split('?')[0];

    if (window._viewerAudioCleanup) {
        window._viewerAudioCleanup();
        window._viewerAudioCleanup = null;
    }

    if (window._viewerInteractionsCleanup) {
        window._viewerInteractionsCleanup();
        window._viewerInteractionsCleanup = null;
    }

    if (window._bigScreenCleanup) {
        window._bigScreenCleanup();
        window._bigScreenCleanup = null;
    }

    const matched = matchRoute(path);

    if (!matched) {
        document.getElementById('page-content').innerHTML = `
            <div class="auth-page" style="background:var(--gray-100)">
                <div class="auth-container" style="text-align:center">
                    <h1 style="font-size:72px;color:var(--gray-300);margin-bottom:16px">404</h1>
                    <h2 style="margin-bottom:8px">页面不存在</h2>
                    <p style="color:var(--gray-500);margin-bottom:24px">您访问的页面不存在或已被移除</p>
                    <a href="#/" class="btn btn-primary">返回首页</a>
                </div>
            </div>
        `;
        return;
    }

    const { route, params } = matched;

    if (route.auth && !isLoggedIn()) {
        showToast('请先登录', 'warning');
        window.location.hash = '#/login';
        return;
    }

    if (route.admin && !isAdmin()) {
        showToast('没有管理员权限', 'warning');
        window.location.hash = '#/';
        return;
    }

    if (route.fullscreen) {
        document.body.classList.add('fullscreen-page');
    } else {
        document.body.classList.remove('fullscreen-page');
    }

    const paramValues = Object.values(params);
    const content = route.render(...paramValues);
    document.getElementById('page-content').innerHTML = content;

    if (route.init) {
        await route.init(...paramValues);
    }

    window.scrollTo(0, 0);
}

window.addEventListener('hashchange', handleRoute);

document.addEventListener('DOMContentLoaded', async () => {
    try {
        await fetch(`${API_BASE}/init`);
    } catch (e) {}

    handleRoute();
});
