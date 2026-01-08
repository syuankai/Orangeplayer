let art = null;
const API_ENDPOINTS = [
    { name: '量子資源', url: 'https://cj.lziapi.com/api.php/provide/vod/' },
    { name: '索尼資源', url: 'https://suoniapi.com/api.php/provide/vod/' },
    { name: '非凡資源', url: 'https://cj.ffzyapi.com/api.php/provide/vod/' },
    { name: '紅牛資源', url: 'https://www.hongniuzy2.com/api.php/provide/vod/' },
    { name: '影視資源', url: 'https://api.yshzyapi.com/api.php/provide/vod/' },
    { name: '虎牙資源', url: 'https://www.huyaapi.com/api.php/provide/vod/' },
    { name: '暴風資源', url: 'https://bfzyapi.com/api.php/provide/vod/' },
    { name: '快車資源', url: 'https://caiji.kczyapi.com/api.php/provide/vod/' },
    { name: '金鷹資源', url: 'https://jyzyapi.com/api.php/provide/vod/' },
    { name: '臥龍資源', url: 'https://wolongzyw.com/api.php/provide/vod/' },
    { name: '百度資源', url: 'https://api.apibdzy.com/api.php/provide/vod/' },
    { name: '極速資源', url: 'https://jszyapi.com/api.php/provide/vod/' },
    { name: '恆星資源', url: 'https://hxzyapi.com/api.php/provide/vod/' },
    { name: '森林資源', url: 'https://slapizyw.com/api.php/provide/vod/' },
    { name: '酷點資源', url: 'https://api.kudianzy.com/api.php/provide/vod/' }
];

window.onload = () => {
    initPlayer();
    loadBackground();
    checkAuth();
    loadHistory();
    measureLatency();
    
    // 移除加載畫面
    setTimeout(() => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => document.getElementById('loading-screen').remove(), 700);
    }, 500);

    document.getElementById('search-input').addEventListener('keypress', (e) => e.key === 'Enter' && performSearch());
    document.getElementById('quick-url').addEventListener('keypress', (e) => e.key === 'Enter' && quickPlay());
};

function initPlayer() {
    art = new ArtPlayer({
        container: '#artplayer',
        url: '',
        type: 'm3u8',
        customType: {
            m3u8: function (video, url) {
                if (Hls.isSupported()) {
                    const hls = new Hls({
                        maxBufferSize: 10 * 1024 * 1024, // 10MB 緩衝
                        maxBufferLength: 30,
                        enableWorker: true,
                        lowLatencyMode: true,
                    });
                    hls.loadSource(url);
                    hls.attachMedia(video);
                    
                    // 深度優化：錯誤自動重連
                    hls.on(Hls.Events.ERROR, (event, data) => {
                        if (data.fatal) {
                            switch (data.type) {
                                case Hls.ErrorTypes.NETWORK_ERROR:
                                    hls.startLoad();
                                    break;
                                case Hls.ErrorTypes.MEDIA_ERROR:
                                    hls.recoverMediaError();
                                    break;
                                default:
                                    console.error("不可恢復的播放錯誤");
                                    break;
                            }
                        }
                    });
                    art.on('destroy', () => hls.destroy());
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = url;
                }
            },
        },
        autoSize: true,
        fullscreen: true,
        playbackRate: true,
        setting: true,
        hotkey: true,
        pip: true,
        lock: true,
        fastForward: true,
        autoOrientation: true,
    });
}

// 萬能解析播放
async function quickPlay() {
    const url = document.getElementById('quick-url').value.trim();
    if (!url) return;
    
    try {
        document.getElementById('player-placeholder').classList.remove('hidden');
        art.switchUrl(url);
        document.getElementById('player-placeholder').classList.add('hidden');
        saveHistory("手動解析: " + url.substring(0, 20) + "...", url);
    } catch (e) {
        alert("無效的連結格式");
    }
}

async function playVideo(id, api, name) {
    try {
        const placeholder = document.getElementById('player-placeholder');
        placeholder.classList.remove('hidden');
        
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(api)}&ids=${id}&ac=detail`);
        const data = await res.json();
        
        if (!data.list?.[0]) throw new Error("API Data Empty");
        
        const rawUrl = data.list[0].vod_play_url;
        const lines = rawUrl.split('#');
        const bestSource = lines.find(l => l.toLowerCase().includes('m3u8')) || lines[0];
        const finalUrl = bestSource.includes('$') ? bestSource.split('$')[1] : bestSource;

        art.switchUrl(finalUrl.trim());
        placeholder.classList.add('hidden');
        saveHistory(name, finalUrl.trim());
    } catch (e) {
        console.error(e);
        alert("解析失敗，請嘗試其他源");
    }
}

async function performSearch() {
    const wd = document.getElementById('search-input').value.trim();
    if (!wd) return;
    
    const container = document.getElementById('search-results');
    container.innerHTML = `<div class="col-span-full h-40 flex items-center justify-center opacity-50 animate-pulse">正在調度資源庫...</div>`;
    
    const results = await Promise.allSettled(API_ENDPOINTS.map(api => 
        fetch(`/api/proxy?url=${encodeURIComponent(api.url)}&wd=${encodeURIComponent(wd)}&ac=list`)
        .then(res => res.json())
        .then(d => d.list?.map(i => ({...i, source: api.name, apiUrl: api.url})) || [])
        .catch(() => [])
    ));

    const all = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    
    if (!all.length) {
        container.innerHTML = `<div class="col-span-full text-center py-20 text-gray-400">未找到相關資源</div>`;
        return;
    }

    container.innerHTML = all.map(item => `
        <div onclick="playVideo('${item.vod_id}', '${item.apiUrl}', '${item.vod_name}')" class="bg-white/10 hover:bg-white/40 p-4 rounded-2xl border border-white/20 cursor-pointer transition-all hover:-translate-y-1 active:scale-95 shadow-sm group">
            <h4 class="font-bold text-gray-800 line-clamp-1 text-sm">${item.vod_name}</h4>
            <div class="flex justify-between items-center mt-3">
                <span class="text-[9px] font-black bg-orange-500/10 text-orange-600 px-2 py-0.5 rounded-md uppercase">${item.source}</span>
                <span class="text-[10px] text-gray-400">${item.vod_remarks || 'HD'}</span>
            </div>
        </div>
    `).join('');
}

function toggleSidebar() {
    const sb = document.getElementById('nav-sidebar');
    const isClosed = sb.classList.contains('w-20');
    sb.classList.toggle('w-20', !isClosed);
    sb.classList.toggle('w-72', isClosed);
    document.getElementById('sidebar-icon').style.transform = isClosed ? "rotate(0deg)" : "rotate(180deg)";
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('tab-' + id).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

async function measureLatency() {
    const start = Date.now();
    try {
        await fetch('/api/history');
        const diff = Date.now() - start;
        document.getElementById('d1-delay').innerText = diff + 'ms';
        document.getElementById('latency-bar').style.width = Math.min(diff / 5, 100) + '%';
    } catch(e) {
        document.getElementById('d1-delay').innerText = 'Offline';
    }
}

// 其餘功能（背景、認證、歷史紀錄）...
async function saveHistory(name, url) { fetch('/api/history', { method: 'POST', body: JSON.stringify({ name, url }) }); loadHistory(); }
async function loadHistory() {
    const res = await fetch('/api/history');
    const data = await res.json();
    document.getElementById('history-list').innerHTML = data.map(i => `
        <div onclick="art.switchUrl('${i.url}')" class="flex items-center justify-between bg-white/10 hover:bg-white/30 p-3 rounded-2xl cursor-pointer transition-all border border-white/10">
            <span class="text-sm truncate pr-4 text-gray-700">${i.name}</span>
            <span class="text-[10px] font-bold text-orange-500">REPLAY</span>
        </div>
    `).join('');
}
function toggleSettings() { document.getElementById('bg-modal').classList.toggle('hidden'); }
async function uploadBackground() {
    const file = document.getElementById('bg-upload').files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        await fetch('/api/background', { method: 'POST', body: JSON.stringify({ image: e.target.result }) });
        document.getElementById('main-body').style.backgroundImage = `url(${e.target.result})`;
        toggleSettings();
    };
    reader.readAsDataURL(file);
}
async function loadBackground() {
    const r = await (await fetch('/api/background')).json();
    if(r.image) document.getElementById('main-body').style.backgroundImage = `url(${r.image})`;
}
async function checkAuth() { const r = await (await fetch('/api/auth')).json(); if(r.required) document.getElementById('auth-overlay').classList.remove('hidden'); }

