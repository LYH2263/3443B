function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function getVisitorFingerprint() {
    let fp = localStorage.getItem('flipbook_fp');
    if (fp) return fp;
    const raw = [
        screen.width, screen.height, screen.colorDepth,
        new Date().getTimezoneOffset(),
        navigator.language, navigator.platform,
        navigator.hardwareConcurrency || 0
    ].join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        const char = raw.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    fp = 'fp_' + Math.abs(hash).toString(36) + '_' + Date.now().toString(36);
    localStorage.setItem('flipbook_fp', fp);
    return fp;
}

function getAbVariant(albumId) {
    const fp = getVisitorFingerprint();
    const key = `flipbook_ab_${albumId}`;
    const cached = localStorage.getItem(key);
    if (cached) return cached;
    let hash = 0;
    const str = albumId + '_' + fp;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    const variant = Math.abs(hash) % 2 === 0 ? 'a' : 'b';
    localStorage.setItem(key, variant);
    return variant;
}

function getAbAssignment(albumId) {
    const key = `flipbook_ab_assign_${albumId}`;
    const cached = localStorage.getItem(key);
    if (cached) {
        try { return JSON.parse(cached); } catch(e) {}
    }
    return null;
}

function setAbAssignment(albumId, assignment) {
    const key = `flipbook_ab_assign_${albumId}`;
    localStorage.setItem(key, JSON.stringify(assignment));
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDateTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    const weeks = Math.floor(days / 7);
    const months = Math.floor(days / 30);
    const years = Math.floor(days / 365);

    if (seconds < 60) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    if (days < 7) return `${days}天前`;
    if (weeks < 5) return `${weeks}周前`;
    if (months < 12) return `${months}个月前`;
    return `${years}年前`;
}

function getImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    return path.startsWith('/') ? path : '/uploads/' + path;
}

function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

function validateEmail(email) {
    if (!email) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    if (!phone) return true;
    return /^1[3-9]\d{9}$/.test(phone);
}

function renderPagination(total, page, limit, onPageChange) {
    const totalPages = Math.ceil(total / limit);
    if (totalPages <= 1) return '';

    let html = '<div class="pagination">';
    html += `<button class="page-btn" onclick="${onPageChange}(1)" ${page <= 1 ? 'disabled' : ''}>&laquo;</button>`;
    html += `<button class="page-btn" onclick="${onPageChange}(${page - 1})" ${page <= 1 ? 'disabled' : ''}>&lsaquo;</button>`;

    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + 4);
    if (end - start < 4) start = Math.max(1, end - 4);

    for (let i = start; i <= end; i++) {
        html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="${onPageChange}(${i})">${i}</button>`;
    }

    html += `<button class="page-btn" onclick="${onPageChange}(${page + 1})" ${page >= totalPages ? 'disabled' : ''}>&rsaquo;</button>`;
    html += `<button class="page-btn" onclick="${onPageChange}(${totalPages})" ${page >= totalPages ? 'disabled' : ''}>&raquo;</button>`;
    html += `<span class="page-info">${page}/${totalPages} 共${total}条</span>`;
    html += '</div>';
    return html;
}

function showConfirmModal(title, message, onConfirm) {
    const container = document.getElementById('modal-container');
    container.innerHTML = `
        <div class="modal-overlay" onclick="closeModal(event)">
            <div class="modal-content" onclick="event.stopPropagation()" style="max-width:420px">
                <div class="modal-header">
                    <h3>${escapeHtml(title)}</h3>
                    <button class="modal-close" onclick="document.getElementById('modal-container').innerHTML=''">&times;</button>
                </div>
                <div class="modal-body">
                    <p style="color:var(--gray-600);font-size:14px">${message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="document.getElementById('modal-container').innerHTML=''">取消</button>
                    <button class="btn btn-danger" id="confirm-btn">确认</button>
                </div>
            </div>
        </div>
    `;
    document.getElementById('confirm-btn').onclick = () => {
        document.getElementById('modal-container').innerHTML = '';
        onConfirm();
    };
}

function closeModal(event) {
    if (event.target.classList.contains('modal-overlay')) {
        document.getElementById('modal-container').innerHTML = '';
    }
}

function getLogoSvg() {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="M8 7h6"/><path d="M8 11h8"/></svg>`;
}

function getPlaceholderImage() {
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect fill='%23f3f4f6' width='400' height='300'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='18' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3E暂无图片%3C/text%3E%3C/svg%3E`;
}

class AudioManager {
    constructor() {
        this.bgmAudio = null;
        this.narrationAudio = null;
        this.bgmVolume = 0.8;
        this.bgmDuckedVolume = 0.2;
        this.currentBgmVolume = 0.8;
        this.isMuted = false;
        this.isBgmPlaying = false;
        this.isNarrationPlaying = false;
        this.isUnlocked = false;
        this.bgmUrl = '';
        this.bgmEnabled = true;
        this.pendingBgmPlay = false;
        this.fadeDuration = 500;
        this.ducking = false;
        this._eventListeners = [];
        this._userInteractionHandler = null;
    }

    init(bgmUrl, bgmVolume = 80, bgmEnabled = true) {
        this.bgmUrl = bgmUrl || '';
        this.bgmVolume = Math.max(0, Math.min(1, bgmVolume / 100));
        this.currentBgmVolume = this.bgmVolume;
        this.bgmEnabled = bgmEnabled;
        this.isMuted = false;
        
        this._setupUserInteraction();
        
        if (this.bgmUrl && this.bgmEnabled && this.isUnlocked) {
            this._playBgm();
        } else if (this.bgmUrl && this.bgmEnabled) {
            this.pendingBgmPlay = true;
        }
    }

    _setupUserInteraction() {
        if (this._userInteractionHandler) return;
        
        this._userInteractionHandler = () => {
            if (!this.isUnlocked) {
                this.isUnlocked = true;
                
                const tempAudio = new Audio();
                tempAudio.volume = 0;
                tempAudio.src = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleMc0OEeWmqxGO8T/+/sA';
                tempAudio.play().then(() => {
                    tempAudio.pause();
                    tempAudio.currentTime = 0;
                }).catch(() => {});
                
                if (this.pendingBgmPlay && this.bgmUrl && this.bgmEnabled) {
                    this.pendingBgmPlay = false;
                    this._playBgm();
                }
            }
        };
        
        ['click', 'touchstart', 'keydown', 'scroll'].forEach(event => {
            document.addEventListener(event, this._userInteractionHandler, { passive: true, once: false });
            this._eventListeners.push({ event, handler: this._userInteractionHandler });
        });
    }

    _playBgm() {
        if (!this.bgmUrl || !this.bgmEnabled || this.isBgmPlaying) return;
        
        try {
            if (this.bgmAudio) {
                this.bgmAudio.pause();
                this.bgmAudio.currentTime = 0;
            }
            
            this.bgmAudio = new Audio(this.bgmUrl);
            this.bgmAudio.loop = true;
            this.bgmAudio.volume = this.isMuted ? 0 : this.currentBgmVolume;
            this.bgmAudio.preload = 'auto';
            
            this.bgmAudio.addEventListener('error', (e) => {
                console.warn('BGM load failed:', e);
                this.isBgmPlaying = false;
                this.bgmAudio = null;
            });
            
            this.bgmAudio.addEventListener('ended', () => {
                this.isBgmPlaying = false;
            });
            
            this.bgmAudio.play().then(() => {
                this.isBgmPlaying = true;
            }).catch((e) => {
                console.warn('BGM play failed:', e);
                this.isBgmPlaying = false;
            });
        } catch (e) {
            console.warn('BGM init failed:', e);
            this.isBgmPlaying = false;
            this.bgmAudio = null;
        }
    }

    playNarration(audioUrl) {
        if (!audioUrl) {
            this.stopNarration();
            return;
        }
        
        if (this.narrationAudio) {
            this.narrationAudio.pause();
            this.narrationAudio.currentTime = 0;
            this.narrationAudio = null;
        }
        
        try {
            this.narrationAudio = new Audio(audioUrl);
            this.narrationAudio.volume = this.isMuted ? 0 : 1;
            this.narrationAudio.preload = 'auto';
            
            this.narrationAudio.addEventListener('loadeddata', () => {
                this._startDucking();
            });
            
            this.narrationAudio.addEventListener('ended', () => {
                this._stopDucking();
                this.isNarrationPlaying = false;
                this.narrationAudio = null;
            });
            
            this.narrationAudio.addEventListener('error', (e) => {
                console.warn('Narration load failed:', e);
                this._stopDucking();
                this.isNarrationPlaying = false;
                this.narrationAudio = null;
            });
            
            this.narrationAudio.play().then(() => {
                this.isNarrationPlaying = true;
            }).catch((e) => {
                console.warn('Narration play failed:', e);
                this._stopDucking();
                this.isNarrationPlaying = false;
                this.narrationAudio = null;
            });
        } catch (e) {
            console.warn('Narration init failed:', e);
            this._stopDucking();
            this.isNarrationPlaying = false;
            this.narrationAudio = null;
        }
    }

    stopNarration() {
        if (this.narrationAudio) {
            this.narrationAudio.pause();
            this.narrationAudio.currentTime = 0;
            this.narrationAudio = null;
        }
        this.isNarrationPlaying = false;
        this._stopDucking();
    }

    _startDucking() {
        if (this.ducking || !this.bgmAudio || !this.isBgmPlaying) return;
        
        this.ducking = true;
        this._fadeVolume(this.bgmAudio, this.currentBgmVolume, this.bgmDuckedVolume, this.fadeDuration);
    }

    _stopDucking() {
        if (!this.ducking || !this.bgmAudio) {
            this.ducking = false;
            return;
        }
        
        this.ducking = false;
        const targetVolume = this.isMuted ? 0 : this.bgmVolume;
        this._fadeVolume(this.bgmAudio, this.bgmAudio.volume, targetVolume, this.fadeDuration);
        this.currentBgmVolume = targetVolume;
    }

    _fadeVolume(audio, from, to, duration) {
        if (!audio) return;
        
        const startTime = performance.now();
        const delta = to - from;
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeProgress = 1 - Math.pow(1 - progress, 3);
            
            audio.volume = from + (delta * easeProgress);
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        
        if (this.bgmAudio) {
            if (this.isMuted) {
                this._fadeVolume(this.bgmAudio, this.bgmAudio.volume, 0, 200);
            } else {
                const targetVolume = this.ducking ? this.bgmDuckedVolume : this.bgmVolume;
                this._fadeVolume(this.bgmAudio, 0, targetVolume, 200);
                this.currentBgmVolume = targetVolume;
            }
        }
        
        if (this.narrationAudio) {
            this.narrationAudio.volume = this.isMuted ? 0 : 1;
        }
        
        return this.isMuted;
    }

    setBgmVolume(volume) {
        this.bgmVolume = Math.max(0, Math.min(1, volume / 100));
        if (this.bgmAudio && !this.ducking && !this.isMuted) {
            this.bgmAudio.volume = this.bgmVolume;
            this.currentBgmVolume = this.bgmVolume;
        }
    }

    resumeBgm() {
        if (this.bgmUrl && this.bgmEnabled && !this.isBgmPlaying) {
            this._playBgm();
        }
    }

    pauseBgm() {
        if (this.bgmAudio && this.isBgmPlaying) {
            this.bgmAudio.pause();
            this.isBgmPlaying = false;
        }
    }

    destroy() {
        this.stopNarration();
        
        if (this.bgmAudio) {
            this.bgmAudio.pause();
            this.bgmAudio.currentTime = 0;
            this.bgmAudio = null;
        }
        
        this.isBgmPlaying = false;
        this.isNarrationPlaying = false;
        this.pendingBgmPlay = false;
        this.ducking = false;
        
        this._eventListeners.forEach(({ event, handler }) => {
            document.removeEventListener(event, handler);
        });
        this._eventListeners = [];
        this._userInteractionHandler = null;
    }
}
