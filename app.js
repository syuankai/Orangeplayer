let art = null;
const API_ENDPOINTS = [
    { name: '量子資源', url: 'https://cj.lziapi.com/api.php/provide/vod/' },
    { name: '索尼資源', url: 'https://suoniapi.com/api.php/provide/vod/' },
    { name: '非凡資源', url: 'https://cj.ffzyapi.com/api.php/provide/vod/' },
    { name: '紅牛資源', url: 'https://www.hongniuzy2.com/api.php/provide/vod/' },
    { name: '影視資源', url: 'https://api.yshzyapi.com/api.php/provide/vod/' },
    { name: '虎牙資源', url: 'https://www.huyaapi.com/api.php/provide/vod/' },
    { name: '暴風資源', url: 'https://bfzyapi.com/api.php/provide/vod/' },
    { name: '櫻花資源', url: 'https://m3u8.ykhdm.com/api.php/provide/vod/' },
    { name: '快車資源', url: 'https://caiji.kczyapi.com/api.php/provide/vod/' },
    { name: '金鷹資源', url: 'https://jyzyapi.com/api.php/provide/vod/' },
    { name: '臥龍資源', url: 'https://wolongzyw.com/api.php/provide/vod/' },
    { name: '百度資源', url: 'https://api.apibdzy.com/api.php/provide/vod/' },
    { name: '極速資源', url: 'https://jszyapi.com/api.php/provide/vod/' },
    { name: '恆星資源', url: 'https://hxzyapi.com/api.php/provide/vod/' },
    { name: '森林資源', url: 'https://slapizyw.com/api.php/provide/vod/' }
];

// 初始化
window.onload = async () => {
    checkAuth();
    loadBackground();
    initPlayer();
    loadHistory();
    // 監聽 Enter 鍵搜尋
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
};

function initPlayer() {
    art = new ArtPlayer({
        container: '#artplayer',
        url: '',
        type: 'm3u8',
        customType: {
            m3u8: function (video, url) {
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
        aspectRatio: true,
        setting: true,
        hotkey: true,
        pip: true,
        mutex: true,
        autoOrientation: true,
        lock: true,
    });
}

// 切換側邊欄
function toggleSidebar() {
    const sb = document.getElementById('nav-sidebar');
    const icon = document.getElementById('sidebar-icon');
    const isClosed = sb.classList.contains('w-20');
    
    if (isClosed) {
        sb.classList.remove('w-20');
        sb.classList.add('w-64');
        icon.style.transform = "rotate(0deg)";
    } else {
        sb.classList.remove('w-64');
        sb.classList.add('w-20');
        icon.style.transform = "rotate(180deg)";
    }
}

// 切換標籤頁
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    
    document.getElementById('tab-' + tabId).classList.remove('hidden');
    event.currentTarget.classList.add('active');
}

// 核心播放邏輯修復
async function playVideo(id, api, name) {
    try {
        document.getElementById('video-title').innerText = `解析中: ${name}`;
        document.getElementById('player-status').innerText = 'PARSING';
        
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(api)}&ids=${id}&ac=detail`);
        const data = await res.json();
        
        if (!data.list || data.list.length === 0) throw new Error("無效的資料");
        
        const detail = data.list[0];
        const playSourceString = detail.vod_play_url;
        
        // 更穩健的解析方法
        // 格式通常是: 來源A$URL#來源B$URL 或是 單純的 URL
        let finalUrl = "";
        const parts = playSourceString.split('#');
        
        // 1. 優先尋找包含 m3u8 的部分
        const m3u8Part = parts.find(p => p.toLowerCase().includes('m3u8'));
        if (m3u8Part) {
            finalUrl = m3u8Part.includes('$') ? m3u8Part.split('$')[1] : m3u8Part;
        } else {
            // 2. 如果沒有標註 m3u8，嘗試取第一個 http 地址
            const firstPart = parts[0];
            finalUrl = firstPart.includes('$') ? firstPart.split('$')[1] : firstPart;
        }

        finalUrl = finalUrl.trim();
        if (!finalUrl.startsWith('http')) throw new Error("解析出的 URL 不合法");

        art.switchUrl(finalUrl);
        document.getElementById('video-title').innerText = `正在播放: ${name}`;
        document.getElementById('player-status').innerText = 'PLAYING';
        document.getElementById('player-placeholder').classList.add('hidden');
        
        saveHistory(name, finalUrl);
    } catch (e) {
        console.error("Play Error:", e);
        document.getElementById('player-status').innerText = 'ERROR';
        alert("播放解析失敗，可能該線路已失效，請嘗試更換來源。");
    }
}

// 搜尋功能
async function performSearch() {
    const wd = document.getElementById('search-input').value.trim();
    if (!wd) return;
    
    const container = document.getElementById('search-results');
    container.innerHTML = '<div class="col-span-full text-center py-20 opacity-50"><div class="animate-spin text-3xl mb-4">🌀</div>聚合搜尋中，請稍候...</div>';
    
    const searchPromises = API_ENDPOINTS.map(api => 
        fetch(`/api/proxy?url=${encodeURIComponent(api.url)}&wd=${encodeURIComponent(wd)}&ac=list`)
        .then(res => res.json())
        .then(data => (data.list || []).map(item => ({...item, source: api.name, apiUrl: api.url})))
        .catch(() => [])
    );

    const resultsArray = await Promise.allSettled(searchPromises);
    const allResults = resultsArray.filter(r => r.status === 'fulfilled').flatMap(r => r.value);
    
    displayResults(allResults);
}

function displayResults(results) {
    const container = document.getElementById('search-results');
    if (!results.length) {
        container.innerHTML = '<div class="col-span-full text-center py-20 text-gray-400">未找到相關影片，請更換關鍵字搜尋</div>';
        return;
    }

    container.innerHTML = results.map(item => `
        <div onclick="playVideo('${item.vod_id}', '${item.apiUrl}', '${item.vod_name}')" class="group bg-white/20 hover:bg-white/40 p-4 rounded-2xl border border-white/20 cursor-pointer transition-all hover:scale-[1.02] active:scale-95 shadow-sm">
            <div class="font-bold text-gray-800 line-clamp-1">${item.vod_name}</div>
            <div class="flex justify-between items-center mt-2">
                <span class="text-[10px] bg-orange-500/20 text-orange-700 px-2 py-0.5 rounded-full font-bold">${item.source}</span>
                <span class="text-[10px] text-gray-500">${item.vod_remarks || '高清'}</span>
            </div>
        </div>
    `).join('');
}

// 本地播放
document.getElementById('local-upload').onchange = function(e) {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    art.switchUrl(url);
    document.getElementById('video-title').innerText = `本地播放: ${file.name}`;
    document.getElementById('player-placeholder').classList.add('hidden');
    document.getElementById('player-status').innerText = 'LOCAL';
};

// ...其餘歷史紀錄、背景與驗證邏輯與先前一致...
async function saveHistory(name, url) { fetch('/api/history', { method: 'POST', body: JSON.stringify({ name, url }) }); loadHistory(); }
async function loadHistory() {
    const res = await fetch('/api/history');
    const data = await res.json();
    document.getElementById('history-list').innerHTML = data.map(i => `
        <div onclick="art.switchUrl('${i.url}')" class="group flex items-center justify-between bg-white/10 hover:bg-white/30 p-3 rounded-xl cursor-pointer transition-all">
            <span class="text-sm truncate pr-4">${i.name}</span>
            <span class="text-[10px] text-orange-500 font-bold opacity-0 group-hover:opacity-100 italic">REPLAY</span>
        </div>
    `).join('');
}
async function checkAuth() { const r = await (await fetch('/api/auth')).json(); if(r.required) document.getElementById('auth-overlay').classList.remove('hidden'); }
async function verifyPassword() {
    const pwd = document.getElementById('site-password').value;
    const r = await (await fetch('/api/auth', { method: 'POST', body: JSON.stringify({ pwd }) })).json();
    r.success ? document.getElementById('auth-overlay').classList.add('hidden') : alert("密碼錯誤");
}
function toggleSettings() { document.getElementById('bg-modal').classList.toggle('hidden'); }
async function uploadBackground() {
    const file = document.getElementById('bg-upload').files[0];
    if (!file) return;
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

