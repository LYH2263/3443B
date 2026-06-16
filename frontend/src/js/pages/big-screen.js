const BigScreen = (function () {
    let pollTimer = null;
    let retryCount = 0;
    const MAX_RETRY = 5;
    const POLL_INTERVAL = 5000;
    const RETRY_DELAY = 2000;
    let animationFrameId = null;
    let marqueeAnimFrame = null;
    let isDestroyed = false;
    let currentData = null;

    const categoryColors = [
        '#00D4FF', '#00FFAA', '#FFB800', '#FF6B9D',
        '#A855F7', '#0099FF', '#FF8C00', '#7CFC00'
    ];

    function renderBigScreenPage() {
        return `
            <div class="bigscreen-container">
                <div class="bigscreen-header">
                    <div class="bigscreen-title">
                        <span class="title-decor left"></span>
                        <h1>实时数据大屏</h1>
                        <span class="title-decor right"></span>
                    </div>
                    <div class="bigscreen-time" id="bigscreen-time"></div>
                </div>

                <div class="bigscreen-main">
                    <div class="bigscreen-col left">
                        <div class="bigscreen-card">
                            <div class="card-title">
                                <span class="card-icon">&#128200;</span>
                                <span>实时在线</span>
                            </div>
                            <div class="card-content">
                                <div class="online-number" id="online-count">
                                    <span class="number-value">0</span>
                                    <span class="number-unit">人</span>
                                </div>
                                <div class="online-trend">
                                    <span class="trend-dot"></span>
                                    <span>实时更新中</span>
                                </div>
                            </div>
                        </div>

                        <div class="bigscreen-card">
                            <div class="card-title">
                                <span class="card-icon">&#128202;</span>
                                <span>今日浏览趋势</span>
                            </div>
                            <div class="card-content">
                                <canvas id="trend-chart"></canvas>
                            </div>
                        </div>

                        <div class="bigscreen-card">
                            <div class="card-title">
                                <span class="card-icon">&#127948;</span>
                                <span>分类占比</span>
                            </div>
                            <div class="card-content">
                                <div class="ring-chart-wrapper">
                                    <canvas id="ring-chart" width="200" height="200"></canvas>
                                    <div class="ring-center">
                                        <div class="ring-total" id="ring-total">0</div>
                                        <div class="ring-label">画册总数</div>
                                    </div>
                                </div>
                                <div class="ring-legend" id="ring-legend"></div>
                            </div>
                        </div>
                    </div>

                    <div class="bigscreen-col center">
                        <div class="bigscreen-row top">
                            <div class="cumulative-item">
                                <div class="cumulative-icon">&#128218;</div>
                                <div class="cumulative-info">
                                    <div class="cumulative-number" id="cumulative-albums">0</div>
                                    <div class="cumulative-label">累计画册</div>
                                </div>
                            </div>
                            <div class="cumulative-item">
                                <div class="cumulative-icon">&#128100;</div>
                                <div class="cumulative-info">
                                    <div class="cumulative-number" id="cumulative-users">0</div>
                                    <div class="cumulative-label">累计用户</div>
                                </div>
                            </div>
                            <div class="cumulative-item">
                                <div class="cumulative-icon">&#128065;</div>
                                <div class="cumulative-info">
                                    <div class="cumulative-number" id="cumulative-views">0</div>
                                    <div class="cumulative-label">累计浏览</div>
                                </div>
                            </div>
                        </div>

                        <div class="bigscreen-card bigscreen-marquee">
                            <div class="card-title">
                                <span class="card-icon">&#128221;</span>
                                <span>最新访问流水</span>
                            </div>
                            <div class="card-content">
                                <div class="marquee-container" id="marquee-container">
                                    <div class="marquee-track" id="marquee-track"></div>
                                </div>
                            </div>
                        </div>

                        <div class="bigscreen-card">
                            <div class="card-title">
                                <span class="card-icon">&#127942;</span>
                                <span>画册浏览量 Top 榜</span>
                            </div>
                            <div class="card-content">
                                <div class="top-list" id="top-list"></div>
                            </div>
                        </div>
                    </div>

                    <div class="bigscreen-col right">
                        <div class="bigscreen-card">
                            <div class="card-title">
                                <span class="card-icon">&#128200;</span>
                                <span>系统状态</span>
                            </div>
                            <div class="card-content">
                                <div class="status-list">
                                    <div class="status-item">
                                        <span class="status-label">服务器状态</span>
                                        <span class="status-value ok">
                                            <span class="status-dot"></span>正常
                                        </span>
                                    </div>
                                    <div class="status-item">
                                        <span class="status-label">数据库</span>
                                        <span class="status-value ok">
                                            <span class="status-dot"></span>正常
                                        </span>
                                    </div>
                                    <div class="status-item">
                                        <span class="status-label">数据刷新</span>
                                        <span class="status-value" id="refresh-status">
                                            <span class="status-dot"></span>--
                                        </span>
                                    </div>
                                    <div class="status-item">
                                        <span class="status-label">上次更新</span>
                                        <span class="status-value" id="last-update">--</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bigscreen-card">
                            <div class="card-title">
                                <span class="card-icon">&#128176;</span>
                                <span>今日数据</span>
                            </div>
                            <div class="card-content">
                                <div class="today-stats">
                                    <div class="today-stat-item">
                                        <div class="today-stat-number" id="today-views">0</div>
                                        <div class="today-stat-label">今日浏览</div>
                                    </div>
                                    <div class="today-stat-item">
                                        <div class="today-stat-number" id="today-albums">0</div>
                                        <div class="today-stat-label">新增画册</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="bigscreen-card">
                            <div class="card-title">
                                <span class="card-icon">&#9881;</span>
                                <span>快速操作</span>
                            </div>
                            <div class="card-content">
                                <div class="quick-actions">
                                    <button class="quick-btn" onclick="BigScreen.toggleFullscreen()">
                                        <span class="quick-icon">&#9974;</span>
                                        <span>全屏</span>
                                    </button>
                                    <button class="quick-btn" onclick="BigScreen.refreshData()">
                                        <span class="quick-icon">&#128260;</span>
                                        <span>刷新</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="bigscreen-footer">
                    <div class="footer-decor left"></div>
                    <span>数据每 5 秒自动刷新 | 投屏专用展示页面</span>
                    <div class="footer-decor right"></div>
                </div>

                <div class="bigscreen-loading" id="bigscreen-loading">
                    <div class="loading-spinner"></div>
                    <span>数据加载中...</span>
                </div>

                <div class="bigscreen-error" id="bigscreen-error" style="display:none">
                    <div class="error-icon">&#9888;</div>
                    <div class="error-text">数据加载失败</div>
                    <div class="error-sub" id="error-retry-text">正在尝试重连...</div>
                </div>
            </div>
        `;
    }

    async function initBigScreen() {
        isDestroyed = false;
        currentData = null;
        startTimeUpdate();
        startResizeHandler();
        try {
            await fetchData();
        } catch (e) {
        }
        startPolling();
    }

    function destroyBigScreen() {
        isDestroyed = true;
        if (pollTimer) {
            clearTimeout(pollTimer);
            pollTimer = null;
        }
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
        if (marqueeAnimFrame) {
            cancelAnimationFrame(marqueeAnimFrame);
            marqueeAnimFrame = null;
        }
        window.removeEventListener('resize', handleResize);
        currentData = null;
    }

    function startTimeUpdate() {
        function update() {
            if (isDestroyed) return;
            const timeEl = document.getElementById('bigscreen-time');
            if (timeEl) {
                const now = new Date();
                const dateStr = formatDate(now);
                const timeStr = now.toLocaleTimeString('zh-CN', { hour12: false });
                timeEl.innerHTML = '<span class="time-date">' + dateStr + '</span><span class="time-time">' + timeStr + '</span>';
            }
            setTimeout(update, 1000);
        }
        update();
    }

    function formatDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const weekDays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
        return year + '年' + month + '月' + day + '日 ' + weekDays[date.getDay()];
    }

    async function fetchData() {
        if (isDestroyed) return;

        try {
            const res = await api.bigscreen();
            const data = res.data;
            currentData = data;
            retryCount = 0;

            hideError();
            updateData(data);
            updateRefreshStatus(true);
            updateLastUpdate();

            return data;
        } catch (e) {
            retryCount++;
            showError(retryCount < MAX_RETRY);
            updateRefreshStatus(false);

            if (retryCount < MAX_RETRY) {
                setTimeout(function () {
                    if (!isDestroyed) fetchData();
                }, RETRY_DELAY);
            }
            throw e;
        }
    }

    function startPolling() {
        pollTimer = setTimeout(async function () {
            if (isDestroyed) return;
            try {
                await fetchData();
            } catch (e) {
            }
            startPolling();
        }, POLL_INTERVAL);
    }

    function refreshData() {
        if (pollTimer) {
            clearTimeout(pollTimer);
        }
        fetchData().then(function () {
            startPolling();
        }).catch(function () {
            startPolling();
        });
    }

    function updateData(data) {
        updateOnlineCount(data.online_count);
        updateTrendChart(data.today_trend);
        updateTopList(data.top_albums);
        updateMarquee(data.recent_logs);
        updateRingChart(data.category_dist);
        updateCumulative(data.cumulative);
        updateTodayStats(data.today_trend);
    }

    function updateOnlineCount(count) {
        const el = document.querySelector('#online-count .number-value');
        if (!el) return;
        animateNumber(el, getNumberFromText(el.textContent), count, 1000);
    }

    function updateCumulative(cumulative) {
        const albumEl = document.getElementById('cumulative-albums');
        const userEl = document.getElementById('cumulative-users');
        const viewEl = document.getElementById('cumulative-views');

        if (albumEl) animateNumber(albumEl, getNumberFromText(albumEl.textContent), cumulative.album_count || 0, 1500);
        if (userEl) animateNumber(userEl, getNumberFromText(userEl.textContent), cumulative.user_count || 0, 1500);
        if (viewEl) animateNumber(viewEl, getNumberFromText(viewEl.textContent), cumulative.total_views || 0, 1500);
    }

    function updateTodayStats(trend) {
        const total = (trend || []).reduce(function (sum, item) { return sum + item.count; }, 0);
        const viewsEl = document.getElementById('today-views');
        if (viewsEl) animateNumber(viewsEl, getNumberFromText(viewsEl.textContent), total, 1000);
    }

    function getNumberFromText(text) {
        const num = parseInt(String(text).replace(/[^0-9]/g, ''));
        return isNaN(num) ? 0 : num;
    }

    function animateNumber(el, from, to, duration) {
        if (!el || from === to) return;
        const startTime = performance.now();
        const diff = to - from;

        function animate(currentTime) {
            if (isDestroyed || !el.parentNode) return;
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(from + diff * easeProgress);
            el.textContent = formatNumber(current);
            if (progress < 1) {
                animationFrameId = requestAnimationFrame(animate);
            }
        }
        animationFrameId = requestAnimationFrame(animate);
    }

    function formatNumber(num) {
        return num.toLocaleString('zh-CN');
    }

    function updateTrendChart(trend) {
        const canvas = document.getElementById('trend-chart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();

        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);

        const width = rect.width;
        const height = rect.height;
        const padding = { top: 20, right: 20, bottom: 30, left: 50 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        ctx.clearRect(0, 0, width, height);

        if (!trend || trend.length === 0) {
            drawEmptyState(ctx, width, height, '暂无数据');
            return;
        }

        const maxVal = Math.max.apply(null, trend.map(function (d) { return d.count; }));
        const maxValue = Math.max(Math.ceil(maxVal / 10) * 10, 10);

        ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
        ctx.lineWidth = 1;
        const gridLines = 5;
        for (let i = 0; i <= gridLines; i++) {
            const y = padding.top + (chartHeight / gridLines) * i;
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(Math.round(maxValue - (maxValue / gridLines) * i), padding.left - 10, y);
        }

        const xStep = trend.length > 1 ? chartWidth / (trend.length - 1) : chartWidth;

        const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0)');

        ctx.beginPath();
        ctx.moveTo(padding.left, height - padding.bottom);
        trend.forEach(function (d, i) {
            const x = padding.left + xStep * i;
            const y = padding.top + chartHeight * (1 - d.count / maxValue);
            if (i === 0) {
                ctx.lineTo(x, y);
            } else {
                const prevX = padding.left + xStep * (i - 1);
                const prevY = padding.top + chartHeight * (1 - trend[i - 1].count / maxValue);
                const cpX = (prevX + x) / 2;
                ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
            }
        });
        ctx.lineTo(padding.left + xStep * (trend.length - 1), height - padding.bottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.strokeStyle = '#00D4FF';
        ctx.lineWidth = 2;
        trend.forEach(function (d, i) {
            const x = padding.left + xStep * i;
            const y = padding.top + chartHeight * (1 - d.count / maxValue);
            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                const prevX = padding.left + xStep * (i - 1);
                const prevY = padding.top + chartHeight * (1 - trend[i - 1].count / maxValue);
                const cpX = (prevX + x) / 2;
                ctx.bezierCurveTo(cpX, prevY, cpX, y, x, y);
            }
        });
        ctx.stroke();

        trend.forEach(function (d, i) {
            const x = padding.left + xStep * i;
            const y = padding.top + chartHeight * (1 - d.count / maxValue);

            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#00D4FF';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.3)';
            ctx.lineWidth = 3;
            ctx.stroke();

            if (i % Math.ceil(trend.length / 6) === 0 || i === trend.length - 1) {
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(d.hour, x, height - padding.bottom + 10);
            }
        });
    }

    function updateRingChart(categories) {
        const canvas = document.getElementById('ring-chart');
        const legendEl = document.getElementById('ring-legend');
        const totalEl = document.getElementById('ring-total');

        if (!canvas || !legendEl) return;

        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        const size = 200;

        canvas.width = size * dpr;
        canvas.height = size * dpr;
        ctx.scale(dpr, dpr);

        const centerX = size / 2;
        const centerY = size / 2;
        const outerRadius = 80;
        const innerRadius = 55;

        ctx.clearRect(0, 0, size, size);

        if (!categories || categories.length === 0) {
            drawEmptyState(ctx, size, size, '暂无数据');
            legendEl.innerHTML = '';
            if (totalEl) totalEl.textContent = '0';
            return;
        }

        const total = categories.reduce(function (sum, c) { return sum + c.count; }, 0);
        if (totalEl) totalEl.textContent = formatNumber(total);

        let startAngle = -Math.PI / 2;

        categories.forEach(function (cat, index) {
            if (cat.count === 0) return;
            const angle = (cat.count / total) * Math.PI * 2;
            const endAngle = startAngle + angle;

            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
            ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = categoryColors[index % categoryColors.length];
            ctx.fill();

            startAngle = endAngle;
        });

        ctx.beginPath();
        ctx.arc(centerX, centerY, outerRadius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, innerRadius - 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.stroke();

        legendEl.innerHTML = categories.map(function (cat, index) {
            return '<div class="legend-item">' +
                '<span class="legend-dot" style="background:' + categoryColors[index % categoryColors.length] + '"></span>' +
                '<span class="legend-name">' + cat.name + '</span>' +
                '<span class="legend-value">' + cat.percent + '%</span>' +
                '</div>';
        }).join('');
    }

    function updateTopList(albums) {
        const el = document.getElementById('top-list');
        if (!el) return;

        if (!albums || albums.length === 0) {
            el.innerHTML = '<div class="empty-state">暂无数据</div>';
            return;
        }

        const topColors = ['#FF4757', '#FFB800', '#00D4FF'];
        const maxViews = Math.max.apply(null, albums.map(function (a) { return a.view_count || 1; }));

        el.innerHTML = albums.slice(0, 8).map(function (album, index) {
            const barWidth = Math.min(((album.view_count || 0) / maxViews) * 100, 100);
            const barColor = index < 3 ? topColors[index] : '#00FFAA';
            return '<div class="top-item">' +
                '<div class="top-rank ' + (index < 3 ? 'top' : '') + '">' + (index + 1) + '</div>' +
                '<div class="top-info">' +
                '<div class="top-name">' + escapeHtml(album.title) + '</div>' +
                '<div class="top-category">' + escapeHtml(album.category_name || '未分类') + '</div>' +
                '</div>' +
                '<div class="top-views">' +
                '<span class="views-number">' + formatNumber(album.view_count || 0) + '</span>' +
                '<span class="views-label">浏览</span>' +
                '</div>' +
                '<div class="top-bar">' +
                '<div class="top-bar-fill" style="width:' + barWidth + '%;background:' + barColor + '"></div>' +
                '</div>' +
                '</div>';
        }).join('');
    }

    function updateMarquee(logs) {
        const track = document.getElementById('marquee-track');
        if (!track) return;

        if (marqueeAnimFrame) {
            cancelAnimationFrame(marqueeAnimFrame);
            marqueeAnimFrame = null;
        }

        if (!logs || logs.length === 0) {
            track.innerHTML = '<div class="marquee-item"><span class="marquee-time">--</span><span class="marquee-content">暂无访问记录</span></div>';
            return;
        }

        const items = logs.map(function (log) {
            return '<div class="marquee-item">' +
                '<span class="marquee-time">' + escapeHtml(log.time_text || '') + '</span>' +
                '<span class="marquee-ip">' + escapeHtml(log.ip || '未知') + '</span>' +
                '<span class="marquee-action">访问了</span>' +
                '<span class="marquee-album">' + escapeHtml(log.album_title || '未知画册') + '</span>' +
                '</div>';
        }).join('');

        track.innerHTML = items + items;

        let marqueeY = 0;

        function animateMarquee() {
            if (isDestroyed || !track) return;
            marqueeY -= 0.5;
            const halfHeight = track.scrollHeight / 2;
            if (Math.abs(marqueeY) >= halfHeight) {
                marqueeY = 0;
            }
            track.style.transform = 'translateY(' + marqueeY + 'px)';
            marqueeAnimFrame = requestAnimationFrame(animateMarquee);
        }
        marqueeAnimFrame = requestAnimationFrame(animateMarquee);
    }

    function drawEmptyState(ctx, width, height, text) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, width / 2, height / 2);
    }

    function updateRefreshStatus(success) {
        const el = document.getElementById('refresh-status');
        if (!el) return;
        if (success) {
            el.innerHTML = '<span class="status-dot"></span>正常';
            el.className = 'status-value ok';
        } else {
            el.innerHTML = '<span class="status-dot"></span>异常';
            el.className = 'status-value error';
        }
    }

    function updateLastUpdate() {
        const el = document.getElementById('last-update');
        if (!el) return;
        const now = new Date();
        el.textContent = now.toLocaleTimeString('zh-CN', { hour12: false });
    }

    function showError(retrying) {
        const errorEl = document.getElementById('bigscreen-error');
        const loadingEl = document.getElementById('bigscreen-loading');
        const retryText = document.getElementById('error-retry-text');

        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'flex';
        if (retryText) {
            retryText.textContent = retrying ? '正在尝试重连...' : '重连失败，请检查网络';
        }
    }

    function hideError() {
        const errorEl = document.getElementById('bigscreen-error');
        const loadingEl = document.getElementById('bigscreen-loading');

        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    function startResizeHandler() {
        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 100);
        handleScale();
    }

    function handleResize() {
        handleScale();
        if (currentData) {
            updateTrendChart(currentData.today_trend);
            updateRingChart(currentData.category_dist);
        }
    }

    function handleScale() {
        const container = document.querySelector('.bigscreen-container');
        if (!container) return;

        const designWidth = 1920;
        const designHeight = 1080;
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        const scaleX = windowWidth / designWidth;
        const scaleY = windowHeight / designHeight;
        const scale = Math.min(scaleX, scaleY, 1.5);

        container.style.transform = `scale(${scale})`;
        container.style.transformOrigin = 'center center';
        container.style.width = designWidth + 'px';
        container.style.height = designHeight + 'px';
        container.style.position = 'absolute';
        container.style.left = '50%';
        container.style.top = '50%';
        container.style.marginLeft = -(designWidth / 2) + 'px';
        container.style.marginTop = -(designHeight / 2) + 'px';
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    return {
        render: renderBigScreenPage,
        init: initBigScreen,
        destroy: destroyBigScreen,
        refreshData: refreshData,
        toggleFullscreen: toggleFullscreen,
    };
})();

function renderBigScreenPage() {
    return BigScreen.render();
}

async function initBigScreen() {
    await BigScreen.init();
}

window._bigScreenCleanup = function () {
    BigScreen.destroy();
};
