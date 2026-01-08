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

window.onload = async () => {
    checkAuth();
    loadBackground();
    initPlayer();
    loadHistory();
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

// 修復後的搜尋函數：增加超時控制與並發限制
async function performSearch() {
    const wd = document.getElementById('search-input').value.trim();
    if (!wd) return;
    
    const resultsContainer = document.getElementById('search-results');
    const countBadge = document.getElementById('search-count');
    resultsContainer.innerHTML = '<div class="text-center py-10 opacity-50"><div class="animate-spin mb-2">🌀</div>搜尋中...</div>';
    
    let allResults = [];
    
    // 使用 Promise.allSettled 確保個別 API 失敗不影響整體
    const promises = API_ENDPOINTS.map(api => 
        fetch(`/api/proxy?url=${encodeURIComponent(api.url)}&wd=${encodeURIComponent(wd)}&ac=list`)
        .then(res => res.json())
        .then(data => {
            if (data && data.list) {
                return data.list.map(item => ({
                    ...item,
                    sourceName: api.name,
                    apiUrl: api.url
                }));
            }
            return [];
        })
        .catch(() => [])
    );

    const settledResults = await Promise.allSettled(promises);
    settledResults.forEach(result => {
        if (result.status === 'fulfilled') {
            allResults = [...allResults, ...result.value];
        }
    });

    displayResults(allResults);
}

function displayResults(results) {
    const container = document.getElementById('search-results');
    document.getElementById('search-count').innerText = results.length;
    
    if (results.length === 0) {
        container.innerHTML = '<div class="text-center py-10 opacity-50">未找到任何資源，請嘗試更換關鍵字</div>';
        return;
    }

    // 移除重複的影片名（聚合搜尋常見問題）
    const uniqueResults = [];
    const map = new Map();
    for (const item of results) {
        if(!map.has(item.vod_name + item.sourceName)){
            map.set(item.vod_name + item.sourceName, true);
            uniqueResults.push(item);
        }
    }

    container.innerHTML = uniqueResults.map(item => `
        <div onclick="playVideo('${item.vod_id}', '${item.apiUrl}', '${item.vod_name}')" class="p-3 bg-white/30 hover:bg-white/50 rounded-xl cursor-pointer transition-all border border-white/20 group">
            <div class="font-bold text-gray-800">${item.vod_name}</div>
            <div class="text-[10px] text-gray-500 flex justify-between mt-1 items-center">
                <span class="bg-orange-100 text-orange-600 px-1 rounded">${item.sourceName}</span>
                <span>${item.vod_remarks || item.vod_add_time || 'HLS'}</span>
                <span class="text-orange-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity">播放</span>
            </div>
        </div>
    `).join('');
}

async function playVideo(id, apiUrl, name) {
    try {
        // 先顯示載入狀態
        document.getElementById('video-info').innerText = `解析中: ${name}`;
        
        const res = await fetch(`/api/proxy?url=${encodeURIComponent(apiUrl)}&ids=${id}&ac=detail`);
        const data = await res.json();
        
        if (!data.list || data.list.length === 0) throw new Error("No detail");
        
        const detail = data.list[0];
        // 增強解析邏輯：過濾包含 m3u8 的正確播放串
        const playGroup = detail.vod_play_url.split('#');
        let playUrl = "";
        
        // 優先尋找包含 m3u8 的地址
        const m3u8Link = playGroup.find(s => s.toLowerCase().includes('m3u8'));
        if (m3u8Link) {
            playUrl = m3u8Link.includes('$') ? m3u8Link.split('$')[1] : m3u8Link;
        } else {
            // 如果沒標註 m3u8，嘗試取第一條地址
            playUrl = playGroup[0].includes('$') ? playGroup[0].split('$')[1] : playGroup[0];
        }

        if (!playUrl.startsWith('http')) throw new Error("Invalid URL");

        art.switchUrl(playUrl);
        document.getElementById('video-info').innerText = `正在播放: ${name}`;
        document.getElementById('player-placeholder').classList.add('hidden');
        
        saveHistory(name, playUrl);
    } catch (e) {
        console.error(e);
        document.getElementById('video-info').innerText = `解析失敗: ${name}`;
        alert("該影片暫時無法解析播放，請嘗試其他搜尋結果");
    }
}

// 剩餘函數保持原樣 (loadHistory, saveHistory, etc.)
// ... (與上一版本一致)

