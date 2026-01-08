let art = null;
const SOURCES = [
    { name: '量子', url: 'https://cj.lziapi.com/api.php/provide/vod/' },
    { name: '索尼', url: 'https://suoniapi.com/api.php/provide/vod/' },
    { name: '非凡', url: 'https://cj.ffzyapi.com/api.php/provide/vod/' },
    { name: '紅牛', url: 'https://www.hongniuzy2.com/api.php/provide/vod/' },
    { name: '酷點', url: 'https://api.kudianzy.com/api.php/provide/vod/' },
    { name: '暴風', url: 'https://bfzyapi.com/api.php/provide/vod/' },
    { name: '櫻花', url: 'https://m3u8.ykhdm.com/api.php/provide/vod/' },
    { name: '優酷', url: 'https://api.zyukapi.com/api.php/provide/vod/' },
    { name: '木耳', url: 'https://api.muerzy.com/api.php/provide/vod/' },
    { name: '大師', url: 'https://api.dszyapi.com/api.php/provide/vod/' },
    { name: '極限', url: 'https://api.jiandaozy.com/api.php/provide/vod/' },
    { name: '快車', url: 'https://caiji.kczyapi.com/api.php/provide/vod/' },
    { name: '百度', url: 'https://api.apibdzy.com/api.php/provide/vod/' },
    { name: '臥龍', url: 'https://collect.wolongzyw.com/api.php/provide/vod/' },
    { name: '虎牙', url: 'https://www.huyaapi.com/api.php/provide/vod/' }
];

document.addEventListener('DOMContentLoaded', () => {
    initPlayer();
    initTheme();
    loadHistory();
    
    document.getElementById('search-keyword').addEventListener('keypress', e => e.key === 'Enter' && searchAll());
});

function initPlayer() {
    art = new ArtPlayer({
        container: '#artplayer',
        url: '',
        type: 'm3u8',
        customType: {
            m3u8: (video, url) => {
                if (Hls.isSupported()) {
                    const hls = new Hls();
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
        pip: true,
        theme: '#f97316',
    });
}

function toggleSidebar() {
    const sb = document.getElementById('sidebar');
    const icon = document.getElementById('collapse-icon');
    const isCollapsed = sb.classList.toggle('sidebar-collapsed');
    sb.classList.toggle('sidebar-expanded', !isCollapsed);
    icon.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
}

function switchTab(tabId) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    document.getElementById(`nav-${tabId}`).classList.add('active');
}

async function searchAll() {
    const wd = document.getElementById('search-keyword').value.trim();
    if (!wd) return;

    const grid = document.getElementById('results-grid');
    grid.innerHTML = '<div class="col-span-full py-20 flex justify-center"><div class="loader"></div></div>';

    const tasks = SOURCES.map(s => 
        fetch(`/api/proxy?url=${encodeURIComponent(s.url)}&wd=${encodeURIComponent(wd)}&ac=list`)
        .then(res => res.json())
        .then(d => d.list?.map(v => ({...v, api: s.url, sourceName: s.name})) || [])
        .catch(() => [])
    );

    const all = (await Promise.all(tasks)).flat();
    grid.innerHTML = all.length ? all.map(item => `
        <div onclick="playVideo('${item.vod_id}', '${item.api}', '${item.vod_name}')" class="video-item">
            <div class="aspect-[3/4] bg-white/20 rounded-2xl mb-3 flex items-center justify-center">
                <svg class="w-8 h-8 text-white/40" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
            <h4 class="text-xs font-bold truncate">${item.vod_name}</h4>
            <span class="text-[9px] font-black text-orange-600 bg-orange-100 px-2 py-0.5 rounded-md mt-2 inline-block">${item.sourceName}</span>
        </div>
    `).join('') : '<p class="col-span-full text-center py-20 opacity-40 font-bold">未找到資源</p>';
}

async function playVideo(id, api, name) {
    document.getElementById('player-loading').classList.remove('hidden');
    try {
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(api)}&ids=${id}&ac=detail`);
        const data = await res.json();
        const vod = data.list[0];
        const playUrl = vod.vod_play_url.split('#').find(s => s.includes('m3u8'))?.split('$')[1] || vod.vod_play_url.split('$')[1];
        
        art.switchUrl(playUrl);
        saveHistory(name, playUrl);
    } catch (e) { console.error(e); }
    finally { document.getElementById('player-loading').classList.add('hidden'); }
}

function handleQuickPlay() {
    const url = document.getElementById('quick-url').value.trim();
    if(url) {
        art.switchUrl(url);
        saveHistory("外部連結", url);
    }
}

// D1 存儲功能
async function saveHistory(name, url) {
    await fetch('/api/history', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, url, time: Date.now() }) 
    });
    loadHistory();
}

async function loadHistory() {
    const res = await fetch('/api/history');
    const data = await res.json();
    document.getElementById('history-grid').innerHTML = data.map(item => `
        <div onclick="art.switchUrl('${item.url}')" class="bg-white/40 p-5 rounded-3xl flex justify-between items-center group cursor-pointer hover:bg-white transition-all">
            <div class="min-w-0 flex-1">
                <p class="font-bold text-sm truncate">${item.name}</p>
                <p class="text-[10px] text-gray-400 mt-1 uppercase font-black">History</p>
            </div>
            <div class="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all">
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </div>
        </div>
    `).join('');
}

// KV 背景功能
function triggerBgUpload() { document.getElementById('bg-input').click(); }
function uploadBackground(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = async (event) => {
        const base64 = event.target.result;
        setBg(base64);
        await fetch('/api/background', { method: 'POST', body: JSON.stringify({ image: base64 }) });
    };
    reader.readAsDataURL(file);
}

function setBg(img) { document.getElementById('app-bg').style.backgroundImage = `url(${img})`; document.getElementById('app-bg').style.backgroundSize = "cover"; }
async function initTheme() {
    const r = await fetch('/api/background');
    const d = await r.json();
    if(d.image) setBg(d.image);
}

