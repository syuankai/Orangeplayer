// 這裡展示如何處理 Cloudflare Pages Functions
// 在實際部署時，你可以拆分為多個文件如 search.js, detail.js, history.js 等

export async function onRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const path = url.pathname;

    // 1. 安全驗證
    if (path === '/api/auth') {
        if (request.method === 'POST') {
            const { pwd } = await request.json();
            if (pwd === env.PASSWORD) return new Response(JSON.stringify({ success: true }));
            return new Response(JSON.stringify({ success: false }));
        }
        return new Response(JSON.stringify({ required: !!env.PASSWORD }));
    }

    // 2. 聚合搜尋轉發 (繞過 CORS)
    if (path === '/api/search') {
        const target = url.searchParams.get('url');
        const wd = url.searchParams.get('wd');
        const res = await fetch(`${target}?ac=videolist&wd=${encodeURIComponent(wd)}`);
        return new Response(res.body, { headers: { 'Content-Type': 'application/json' } });
    }

    if (path === '/api/detail') {
        const target = url.searchParams.get('url');
        const id = url.searchParams.get('id');
        const res = await fetch(`${target}?ac=detail&ids=${id}`);
        return new Response(res.body, { headers: { 'Content-Type': 'application/json' } });
    }

    // 3. D1 歷史紀錄
    if (path === '/api/history') {
        if (request.method === 'POST') {
            const { name, url } = await request.json();
            await env.DB.prepare("INSERT INTO history (name, url) VALUES (?, ?)").bind(name, url).run();
            return new Response(JSON.stringify({ success: true }));
        }
        const { results } = await env.DB.prepare("SELECT * FROM history ORDER BY id DESC LIMIT 20").all();
        return new Response(JSON.stringify(results));
    }

    // 4. KV 背景儲存
    if (path === '/api/background') {
        if (request.method === 'POST') {
            const { image } = await request.json();
            await env.KV.put('user_bg', image);
            return new Response(JSON.stringify({ success: true }));
        }
        const image = await env.KV.get('user_bg');
        return new Response(JSON.stringify({ image }));
    }

    return new Response("Not Found", { status: 404 });
}

