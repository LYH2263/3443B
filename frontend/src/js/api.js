const API_BASE = '/api';

const recentMessages = new Set();

function showToast(message, type = 'info', duration = 3000) {
    if (recentMessages.has(message)) return;
    recentMessages.add(message);
    setTimeout(() => recentMessages.delete(message), 2000);

    const container = document.getElementById('toast-container');
    const icons = {
        success: '&#10004;',
        error: '&#10006;',
        warning: '&#9888;',
        info: '&#8505;'
    };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <span class="toast-message">${message}</span>
        <span class="toast-close" onclick="this.parentElement.remove()">&times;</span>
    `;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

function getToken() {
    return localStorage.getItem('flipbook_token') || '';
}

function setToken(token) {
    localStorage.setItem('flipbook_token', token);
}

function removeToken() {
    localStorage.removeItem('flipbook_token');
    localStorage.removeItem('flipbook_user');
}

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('flipbook_user') || 'null');
    } catch (e) { return null; }
}

function setUser(user) {
    localStorage.setItem('flipbook_user', JSON.stringify(user));
}

function isLoggedIn() {
    return !!getToken();
}

function isAdmin() {
    const user = getUser();
    return user && user.role === 'admin';
}

async function apiRequest(url, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...options.headers,
    };

    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }

    try {
        const response = await fetch(`${API_BASE}${url}`, {
            ...options,
            headers,
            body: options.body instanceof FormData ? options.body : (options.body ? JSON.stringify(options.body) : undefined),
        });

        if (response.status === 401) {
            removeToken();
            showToast('登录已过期，请重新登录', 'warning');
            setTimeout(() => { window.location.hash = '#/login'; }, 1000);
            const error = new Error('登录已过期，请重新登录');
            error._isBusinessError = true;
            throw error;
        }

        const data = await response.json();

        if (data.code !== 200) {
            showToast(data.message || '操作失败', 'error');
            const error = new Error(data.message);
            error._isBusinessError = true;
            throw error;
        }

        return data;
    } catch (error) {
        if (error._isBusinessError) throw error;
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showToast('服务器连接失败，请稍后重试', 'error');
        }
        throw error;
    }
}

const api = {
    auth: {
        login: (data) => apiRequest('/auth/login', { method: 'POST', body: data }),
        register: (data) => apiRequest('/auth/register', { method: 'POST', body: data }),
        profile: () => apiRequest('/auth/profile'),
        updateProfile: (data) => apiRequest('/auth/profile', { method: 'PUT', body: data }),
        changePassword: (data) => apiRequest('/auth/password', { method: 'PUT', body: data }),
    },
    public: {
        albums: (params) => apiRequest('/public/albums?' + new URLSearchParams(params)),
        albumDetail: (id, password, shareToken) => {
            let url = `/public/albums/${id}`;
            const params = [];
            if (password) params.push(`password=${encodeURIComponent(password)}`);
            if (shareToken) params.push(`share_token=${encodeURIComponent(shareToken)}`);
            if (params.length > 0) url += '?' + params.join('&');
            return apiRequest(url);
        },
        verifyPassword: (id, password) => apiRequest(`/public/albums/${id}/verify`, { method: 'POST', body: { password } }),
        categories: () => apiRequest('/public/categories'),
        tagCloud: () => apiRequest('/public/tags/cloud'),
        albumsByTag: (params) => apiRequest('/public/tags/albums?' + new URLSearchParams(params)),
        albumRecommend: (id, limit) => apiRequest(`/public/albums/${id}/recommend?limit=${limit || 6}`),
        abExperiments: () => apiRequest('/public/ab-experiments'),
        abAssign: (data) => apiRequest('/public/ab-experiments/assign', { method: 'POST', body: data }),
        abExposure: (data) => apiRequest('/public/ab-experiments/exposure', { method: 'POST', body: data }),
        abClick: (data) => apiRequest('/public/ab-experiments/click', { method: 'POST', body: data }),

        comments: (albumId, params) => apiRequest(`/public/albums/${albumId}/comments?` + new URLSearchParams(params || {})),
        commentReplies: (commentId, params) => apiRequest(`/public/comments/${commentId}/replies?` + new URLSearchParams(params || {})),
        commentCount: (albumId) => apiRequest(`/public/albums/${albumId}/comments/count`),
        postComment: (data) => apiRequest('/public/comments', { method: 'POST', body: data }),
        deleteComment: (id) => apiRequest(`/public/comments/${id}`, { method: 'DELETE' }),
    },
    admin: {
        dashboard: () => apiRequest('/admin/dashboard'),
        albums: (params) => apiRequest('/admin/albums?' + new URLSearchParams(params || {})),
        albumDetail: (id) => apiRequest(`/admin/albums/${id}`),
        createAlbum: (data) => apiRequest('/admin/albums', { method: 'POST', body: data }),
        updateAlbum: (id, data) => apiRequest(`/admin/albums/${id}`, { method: 'PUT', body: data }),
        deleteAlbum: (id) => apiRequest(`/admin/albums/${id}`, { method: 'DELETE' }),
        albumPages: (albumId) => apiRequest(`/admin/albums/${albumId}/pages`),
        addPage: (albumId, data) => apiRequest(`/admin/albums/${albumId}/pages`, { method: 'POST', body: data }),
        updatePage: (albumId, id, data) => apiRequest(`/admin/albums/${albumId}/pages/${id}`, { method: 'PUT', body: data }),
        deletePage: (albumId, id) => apiRequest(`/admin/albums/${albumId}/pages/${id}`, { method: 'DELETE' }),
        sortPages: (albumId, pages) => apiRequest(`/admin/albums/${albumId}/pages/sort`, { method: 'POST', body: { pages } }),
        generateQrcode: (data) => apiRequest('/admin/qrcode/generate', { method: 'POST', body: data }),
        users: (params) => apiRequest('/admin/users?' + new URLSearchParams(params || {})),
        userDetail: (id) => apiRequest(`/admin/users/${id}`),
        createUser: (data) => apiRequest('/admin/users', { method: 'POST', body: data }),
        updateUser: (id, data) => apiRequest(`/admin/users/${id}`, { method: 'PUT', body: data }),
        deleteUser: (id) => apiRequest(`/admin/users/${id}`, { method: 'DELETE' }),
        levels: () => apiRequest('/admin/levels'),
        createLevel: (data) => apiRequest('/admin/levels', { method: 'POST', body: data }),
        updateLevel: (id, data) => apiRequest(`/admin/levels/${id}`, { method: 'PUT', body: data }),
        deleteLevel: (id) => apiRequest(`/admin/levels/${id}`, { method: 'DELETE' }),
        categories: () => apiRequest('/admin/categories'),
        createCategory: (data) => apiRequest('/admin/categories', { method: 'POST', body: data }),
        updateCategory: (id, data) => apiRequest(`/admin/categories/${id}`, { method: 'PUT', body: data }),
        deleteCategory: (id) => apiRequest(`/admin/categories/${id}`, { method: 'DELETE' }),
        backgrounds: () => apiRequest('/admin/backgrounds'),
        addBackground: (data) => apiRequest('/admin/backgrounds', { method: 'POST', body: data }),
        deleteBackground: (id) => apiRequest(`/admin/backgrounds/${id}`, { method: 'DELETE' }),
        abExperiments: (params) => apiRequest('/admin/ab-experiments?' + new URLSearchParams(params || {})),
        abExperimentDetail: (id) => apiRequest(`/admin/ab-experiments/${id}`),
        createAbExperiment: (data) => apiRequest('/admin/ab-experiments', { method: 'POST', body: data }),
        updateAbExperiment: (id, data) => apiRequest(`/admin/ab-experiments/${id}`, { method: 'PUT', body: data }),
        adoptAbExperiment: (id, data) => apiRequest(`/admin/ab-experiments/${id}/adopt`, { method: 'POST', body: data }),
        forceAdoptAbExperiment: (id, data) => apiRequest(`/admin/ab-experiments/${id}/force-adopt`, { method: 'POST', body: data }),
        resetAbExperiment: (id) => apiRequest(`/admin/ab-experiments/${id}/reset`, { method: 'POST' }),
        deleteAbExperiment: (id) => apiRequest(`/admin/ab-experiments/${id}`, { method: 'DELETE' }),

        shortLinks: (params) => apiRequest('/admin/short-links?' + new URLSearchParams(params || {})),
        shortLinksAllStats: (params) => apiRequest('/admin/short-links/all-stats?' + new URLSearchParams(params || {})),
        shortLinksStats: (params) => apiRequest('/admin/short-links/stats?' + new URLSearchParams(params || {})),
        generateShortLink: (data) => apiRequest('/admin/short-links/generate', { method: 'POST', body: data }),
        updateShortLink: (id, data) => apiRequest(`/admin/short-links/${id}`, { method: 'PUT', body: data }),
        deleteShortLink: (id) => apiRequest(`/admin/short-links/${id}`, { method: 'DELETE' }),

        shareLinks: (params) => apiRequest('/admin/share-links?' + new URLSearchParams(params || {})),
        shareLinksStats: (params) => apiRequest('/admin/share-links/stats?' + new URLSearchParams(params || {})),
        shareLinkDetail: (id) => apiRequest(`/admin/share-links/${id}`),
        createShareLink: (data) => apiRequest('/admin/share-links', { method: 'POST', body: data }),
        disableShareLink: (id) => apiRequest(`/admin/share-links/${id}/disable`, { method: 'POST' }),
        deleteShareLink: (id) => apiRequest(`/admin/share-links/${id}`, { method: 'DELETE' }),
        cleanExpiredShareLinks: () => apiRequest('/admin/share-links/clean-expired', { method: 'POST' }),

        tags: (params) => apiRequest('/admin/tags?' + new URLSearchParams(params || {})),
        tagAutocomplete: (q) => apiRequest('/admin/tags/autocomplete?q=' + encodeURIComponent(q)),
        deleteTag: (id) => apiRequest(`/admin/tags/${id}`, { method: 'DELETE' }),
        albumTags: (albumId) => apiRequest(`/admin/albums/${albumId}/tags`),
        syncAlbumTags: (albumId, tags) => apiRequest(`/admin/albums/${albumId}/tags`, { method: 'PUT', body: { tags } }),

        comments: (params) => apiRequest('/admin/comments?' + new URLSearchParams(params || {})),
        commentDetail: (id) => apiRequest(`/admin/comments/${id}`),
        updateCommentStatus: (id, status) => apiRequest(`/admin/comments/${id}/status`, { method: 'PUT', body: { status } }),
        toggleCommentPin: (id) => apiRequest(`/admin/comments/${id}/toggle-pin`, { method: 'POST' }),
        deleteComment: (id) => apiRequest(`/admin/comments/${id}`, { method: 'DELETE' }),
        commentStats: () => apiRequest('/admin/comments/stats/overview'),

        sensitiveWords: (params) => apiRequest('/admin/sensitive-words?' + new URLSearchParams(params || {})),
        sensitiveWordStats: () => apiRequest('/admin/sensitive-words/stats'),
        sensitiveWordDetail: (id) => apiRequest(`/admin/sensitive-words/${id}`),
        createSensitiveWord: (data) => apiRequest('/admin/sensitive-words', { method: 'POST', body: data }),
        updateSensitiveWord: (id, data) => apiRequest(`/admin/sensitive-words/${id}`, { method: 'PUT', body: data }),
        deleteSensitiveWord: (id) => apiRequest(`/admin/sensitive-words/${id}`, { method: 'DELETE' }),
        batchImportSensitiveWords: (data) => apiRequest('/admin/sensitive-words/batch-import', { method: 'POST', body: data }),
        refreshSensitiveWordCache: () => apiRequest('/admin/sensitive-words/refresh-cache', { method: 'POST' }),
        detectSensitiveWord: (text) => apiRequest('/admin/sensitive-words/detect', { method: 'POST', body: { text } }),

        sensitiveWhitelist: (params) => apiRequest('/admin/sensitive-whitelist?' + new URLSearchParams(params || {})),
        createSensitiveWhitelist: (data) => apiRequest('/admin/sensitive-whitelist', { method: 'POST', body: data }),
        updateSensitiveWhitelist: (id, data) => apiRequest(`/admin/sensitive-whitelist/${id}`, { method: 'PUT', body: data }),
        deleteSensitiveWhitelist: (id) => apiRequest(`/admin/sensitive-whitelist/${id}`, { method: 'DELETE' }),

        pendingContents: (params) => apiRequest('/admin/pending-contents?' + new URLSearchParams(params || {})),
        pendingContentStats: () => apiRequest('/admin/pending-contents/stats'),
        pendingContentDetail: (id) => apiRequest(`/admin/pending-contents/${id}`),
        approvePendingContent: (id, remark) => apiRequest(`/admin/pending-contents/${id}/approve`, { method: 'POST', body: { remark } }),
        rejectPendingContent: (id, remark) => apiRequest(`/admin/pending-contents/${id}/reject`, { method: 'POST', body: { remark } }),
        batchApprovePendingContents: (ids, remark) => apiRequest('/admin/pending-contents/batch-approve', { method: 'POST', body: { ids, remark } }),
        batchRejectPendingContents: (ids, remark) => apiRequest('/admin/pending-contents/batch-reject', { method: 'POST', body: { ids, remark } }),
    },
    upload: {
        image: async (file, type = 'albums') => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);
            return apiRequest('/upload/image', { method: 'POST', body: formData, headers: {} });
        },
        audio: async (file, type = 'bgm') => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', type);
            return apiRequest('/upload/audio', { method: 'POST', body: formData, headers: {} });
        },
        deleteAudio: async (path) => {
            return apiRequest('/upload/audio/delete', { method: 'POST', body: { path } });
        },
    },
    bigscreen: () => apiRequest('/bigscreen'),
    init: () => apiRequest('/init'),
};
