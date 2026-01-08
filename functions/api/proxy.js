export async function onRequest(context) {
    const { request } = context;
    const url = new URL(request.url);
    
    const targetBase = url.searchParams.get('url');
    const wd = url.searchParams.get('wd');
    const ac = url.searchParams.get('ac') || 'videolist';
    const ids = url.searchParams.get('ids');

    if (!targetBase) {
        return new Response(JSON.stringify({ error: "Missing URL" }), { status: 400 });
    }

    // 構建目標 API 地址
    let targetUrl = `${targetBase}?ac=${ac}`;
    if (wd) targetUrl += `&wd=${encodeURIComponent(wd)}`;
    if (ids) targetUrl += `&ids=${ids}`;

    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36',
                'Referer': targetBase,
                'Accept': 'application/json'
            },
            // 設定 10 秒超時
            signal: AbortSignal.timeout(10000)
        });

        if (!response.ok) {
            return new Response(JSON.stringify({ list: [] }), { status: 200 });
        }

        const data = await response.text();
        
        // 有些老舊 API 會返回 XML，這裡我們強制讓它以 JSON 處理或回傳錯誤
        try {
            JSON.parse(data);
            return new Response(data, {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            // 如果是 XML 格式，Cloudflare fetch 預設可能不會幫你轉換
            // 提醒：若資源站僅支援 XML，建議更換為支援 JSON 的接口（目前代碼中提供的皆支援 JSON）
            return new Response(JSON.stringify({ list: [], error: "Format mismatch" }));
        }

    } catch (error) {
        return new Response(JSON.stringify({ list: [], error: error.message }), { status: 200 });
    }
}

