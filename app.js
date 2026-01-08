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
};

// 1. 初始化 ArtPlayer
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
    });
}

// 2. 搜尋功能 (聚合)
async function performSearch() {
    const wd = document.getElementById('search-input').value;
    if (!wd) return;
    
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '<div class="text-center py-10 opacity-50">搜尋中...</div>';
    
    let allResults = [];
    const promises = API_ENDPOINTS.map(api => 
        fetch(`/api/search?url=${encodeURIComponent(api.url)}&wd=${encodeURIComponent(wd)}`)
        .then(res => res.json())
        .catch(() => [])
    );

    const dataSets = await Promise.all(promises);
    dataSets.forEach((data, index) => {
        if (data && data.list) {
            data.list.forEach(item => {
                allResults.push({ ...item, sourceName: API_ENDPOINTS[index].name, apiUrl: API_ENDPOINTS[index].url });
            });
        }
    });

    displayResults(allResults);
}

function displayResults(results) {
    const container = document.getElementById('search-results');
    document.getElementById('search-count').innerText = results.length;
    
    if (results.length === 0) {
        container.innerHTML = '<div class="text-center py-10 opacity-50">未找到資源</div>';
        return;
    }

    container.innerHTML = results.map(item => `
        <div onclick="playVideo('${item.vod_id}', '${item.apiUrl}', '${item.vod_name}')" class="p-3 bg-white/30 hover:bg-white/50 rounded-xl cursor-pointer transition-all border border-white/20 group">
            <div class="font-bold text-gray-800">${item.vod_name}</div>
            <div class="text-xs text-gray-500 flex justify-between mt-1">
                <span>${item.sourceName} | ${item.vod_remarks || '高清'}</span>
                <span class="text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">點擊播放 ▶</span>
            </div>
        </div>
    `).join('');
}

// 3. 播放邏輯
async function playVideo(id, apiUrl, name) {
    try {
        const res = await fetch(`/api/detail?url=${encodeURIComponent(apiUrl)}&id=${id}`);
        const data = await res.json();
        const detail = data.list[0];
        
        // 解析播放地址 (處理多個線路，取第一個 m3u8)
        const playUrl = detail.vod_play_url.split('#').find(s => s.includes('m3u8')).split('$')[1];
        
        art.switchUrl(playUrl);
        document.getElementById('video-info').innerText = `正在播放: ${name}`;
        document.getElementById('player-placeholder').classList.add('hidden');
        
        // 儲存歷史
        saveHistory(name, playUrl);
    } catch (e) {
        alert("播放失敗，請嘗試其他資源");
    }
}

// 4. 本地上傳
document.getElementById('local-upload').onchange = function(e) {
    const file = e.target.files[0];
    const url = URL.createObjectURL(file);
    art.switchUrl(url);
    document.getElementById('video-info').innerText = `本地播放: ${file.name}`;
    document.getElementById('player-placeholder').classList.add('hidden');
};

// 5. 歷史紀錄 (D1)
async function saveHistory(name, url) {
    await fetch('/api/history', {
        method: 'POST',
        body: JSON.stringify({ name, url })
    });
    loadHistory();
}

async function loadHistory() {
    const res = await fetch('/api/history');
    const history = await res.json();
    const container = document.getElementById('history-list');
    container.innerHTML = history.map(item => `
        <div onclick="art.switchUrl('${item.url}')" class="text-sm p-2 hover:bg-white/40 rounded-lg cursor-pointer truncate">
            ${item.name}
        </div>
    `).join('');
}

// 6. 背景與安全
function toggleSettings() { document.getElementById('bg-modal').classList.toggle('hidden'); }

async function uploadBackground() {
    const file = document.getElementById('bg-upload').files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
        const base64 = e.target.result;
        await fetch('/api/background', { method: 'POST', body: JSON.stringify({ image: base64 }) });
        document.getElementById('main-body').style.backgroundImage = `url(${base64})`;
        toggleSettings();
    };
    reader.readAsDataURL(file);
}

async function loadBackground() {
    const res = await fetch('/api/background');
    const data = await res.json();
    if (data.image) document.getElementById('main-body').style.backgroundImage = `url(${data.image})`;
}

async function checkAuth() {
    const res = await fetch('/api/auth');
    const { required } = await res.json();
    if (required) document.getElementById('auth-overlay').classList.remove('hidden');
}

async function verifyPassword() {
    const pwd = document.getElementById('site-password').value;
    const res = await fetch('/api/auth', { method: 'POST', body: JSON.stringify({ pwd }) });
    if ((await res.json()).success) document.getElementById('auth-overlay').classList.add('hidden');
    else alert("密碼錯誤");
}

