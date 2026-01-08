// 極簡加載解鎖
(function() {
    const loader = document.getElementById('loading-screen');
    const status = document.getElementById('loading-status');
    
    let countdown = 0;
    const interval = setInterval(() => {
        countdown += 100;
        if (countdown >= 1500) {
            status.innerText = "System Ready";
            loader.style.opacity = '0';
            loader.style.pointerEvents = 'none';
            setTimeout(() => {
                loader.remove();
                clearInterval(interval);
            }, 700);
        }
    }, 100);
})();

let art = null;
const API_ENDPOINTS = [
    { name: '量子', url: 'https://cj.lziapi.com/api.php/provide/vod/' },
    { name: '索尼', url: 'https://suoniapi.com/api.php/provide/vod/' },
    { name: '非凡', url: 'https://cj.ffzyapi.com/api.php/provide/vod/' },
    { name: '紅牛', url: 'https://www.hongniuzy2.com/api.php/provide/vod/' },
    { name: '影視', url: 'https://api.yshzyapi.com/api.php/provide/vod/' },
    { name: '暴風', url: 'https://bfzyapi.com/api.php/provide/vod/' },
    { name: '櫻花', url: 'https://m3u8.ykhdm.com/api.php/provide/vod/' },
    { name: '酷點', url: 'https://api.kudianzy.com/api.php/provide/vod/' }
];

document.addEventListener('DOMContentLoaded', async () => {
    initPlayer();
    
    // 背景與歷史加載
    try { await loadBackground(); } catch(e) {}
    try { await loadHistory(); } catch(e) {}
    
    // 事件綁定
    document.getElementById('search-input').addEventListener('keypress', (e) => e.key === 'Enter' && performSearch());
    document.getElementById('quick-url').addEventListener('keypress', (e) => e.key === 'Enter' && quickPlay());
});

function initPlayer() {
    art = new ArtPlayer({
        container: '#artplayer',
        url: '',
        type: 'm3u8',
        customType: {
            m3u8: function (video, url) {
                if (Hls.isSupported()) {
                    const hls = new Hls({
                        maxBufferSize: 30 * 1024 * 1024,
                        enableWorker: true
                    });
                    hls.loadSource(url);
                    hls.attachMedia(video);
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
        theme: '#f97316',
    });
}

// 萬能解析播放
async function quickPlay() {
    const url = document.getElementById('quick-url').value.trim();
    if (!url) return;
    
    const overlay = document.getElementById('player-overlay');
    overlay.classList.remove('hidden');
    overlay.style.opacity = "1";

    setTimeout(() => {
        art.switchUrl(url);
        overlay.style.opacity = "0";
        setTimeout(() => overlay.classList.add('hidden'), 500);
        saveHistory("手動解析: " + url.substring(url.lastIndexOf('/') + 1), url);
    }, 300);
}

async function performSearch() {
    const wd = document.getElementById('search-input').value.trim();
    if (!wd) return;
    
    const container = document.getElementById('search-results');
    container.innerHTML = `<div class="col-span-full h-40 flex flex-col items-center justify-center gap-6">
        <div class="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
        <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Searching Databases</p>
    </div>`;
    
    const tasks = API_ENDPOINTS.map(api => 
        fetch(`/api/proxy?url=${encodeURIComponent(api.url)}&wd=${encodeURIComponent(wd)}&ac=list`)
        .then(res => res.json())
        .then(d => d.list?.map(i => ({...i, source: api.name, apiUrl: api.url})) || [])
        .catch(() => [])
    );

    const results = await Promise.all(tasks);
    const all = results.flat();
    
    if (!all.length) {
        container.innerHTML = `<div class="col-span-full py-20 text-center text-gray-400 font-black tracking-tighter">找不到資源，請更換關鍵字</div>`;
        return;
    }

    container.innerHTML = all.map(item => `
        <div onclick="playVideo('${item.vod_id}', '${item.apiUrl}', '${item.vod_name}')" class="bg-white/40 hover:bg-white p-5 rounded-[32px] border border-white/20 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 active:scale-95 group">
            <h4 class="font-bold text-gray-800 line-clamp-1 text-sm group-hover:text-orange-600 transition-colors">${item.vod_name}</h4>
            <div class="flex justify-between items-center mt-4">
                <span class="text-[9px] font-black bg-orange-100 text-orange-600 px-3 py-1 rounded-xl uppercase">${item.source}</span>
                <span class="text-[10px] text-gray-400 font-bold">${item.vod_remarks || 'HD'}</span>
            </div>
        </div>
    `).join('');
}

async function playVideo(id, api, name) {
    try {
        const overlay = document.getElementById('player-overlay');
        overlay.classList.remove('hidden');
        overlay.style.opacity = "1";
        
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(api)}&ids=${id}&ac=detail`);
        const data = await res.json();
        
        if (!data.list?.[0]) throw new Error();
        
        const rawUrl = data.list[0].vod_play_url;
        const best = rawUrl.split('#').find(s => s.toLowerCase().includes('m3u8')) || rawUrl.split('#')[0];
        const url = best.includes('$') ? best.split('$')[1] : best;

        art.switchUrl(url.trim());
        overlay.style.opacity = "0";
        setTimeout(() => overlay.classList.add('hidden'), 500);
        
        saveHistory(name, url.trim());
    } catch (e) {
        alert("播放解析失敗");
        document.getElementById('player-overlay').classList.add('hidden');
    }
}

// UI 切換邏輯
function toggleSidebar() {
    const sb = document.getElementById('nav-sidebar');
    const isClosed = sb.classList.contains('w-20');
    sb.classList.toggle('w-20', !isClosed);
    sb.classList.toggle('w-80', isClosed);
    document.getElementById('sidebar-icon').style.transform = isClosed ? "rotate(0deg)" : "rotate(180deg)";
}

function switchTab(id) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => {
        n.classList.remove('bg-white', 'shadow-sm', 'text-orange-600');
        n.classList.add('hover:bg-white/40', 'text-gray-500');
    });
    
    document.getElementById('tab-' + id).classList.remove('hidden');
    const activeBtn = document.getElementById('btn-' + id);
    activeBtn.classList.add('bg-white', 'shadow-sm', 'text-orange-600');
    activeBtn.classList.remove('hover:bg-white/40', 'text-gray-500');
}

function toggleSettings() { document.getElementById('bg-modal').classList.toggle('hidden'); }

// 儲存與同步
async function saveHistory(name, url) { try { await fetch('/api/history', { method: 'POST', body: JSON.stringify({ name, url }) }); loadHistory(); } catch(e){} }
async function loadHistory() {
    try {
        const res = await fetch('/api/history');
        const data = await res.json();
        document.getElementById('history-list').innerHTML = data.map(i => `
            <div onclick="art.switchUrl('${i.url}')" class="bg-white/40 hover:bg-white p-6 rounded-[32px] cursor-pointer transition-all border border-white/20 group flex items-center justify-between">
                <span class="text-sm font-bold truncate pr-4 text-gray-700">${i.name}</span>
                <div class="w-10 h-10 bg-orange-500/10 rounded-2xl flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-all text-orange-500">
                    <svg class="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"></path></svg>
                </div>
            </div>
        `).join('');
    } catch(e){}
}
async function uploadBackground() {
    const file = document.getElementById('bg-upload').files[0];
    const reader = new FileReader();
    reader.onload = async (e) => {
        document.body.style.backgroundImage = `url(${e.target.result})`;
        document.body.style.backgroundSize = "cover";
        try { await fetch('/api/background', { method: 'POST', body: JSON.stringify({ image: e.target.result }) }); } catch(e){}
        toggleSettings();
    };
    reader.readAsDataURL(file);
}
async function loadBackground() {
    try {
        const r = await (await fetch('/api/background')).json();
        if(r.image) {
            document.body.style.backgroundImage = `url(${r.image})`;
            document.body.style.backgroundSize = "cover";
        }
    } catch(e){}
}

