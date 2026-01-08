/**
 * 此檔案為 Cloudflare Pages Functions 示例，需部署於 /functions 目錄
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname;

  // 1. D1 播放歷史存儲 (SQLite)
  if (path === '/api/history') {
    if (request.method === 'POST') {
      const { name, url: videoUrl, time } = await request.json();
      await env.DB.prepare(
        "INSERT INTO history (name, url, time) VALUES (?, ?, ?)"
      ).bind(name, videoUrl, time).run();
      return new Response(JSON.stringify({ success: true }));
    }
    const { results } = await env.DB.prepare(
      "SELECT * FROM history ORDER BY time DESC LIMIT 20"
    ).all();
    return new Response(JSON.stringify(results));
  }

  // 2. KV 背景圖存儲
  if (path === '/api/background') {
    if (request.method === 'POST') {
      const { image } = await request.json();
      await env.KV.put('USER_BG', image);
      return new Response(JSON.stringify({ success: true }));
    }
    const image = await env.KV.get('USER_BG');
    return new Response(JSON.stringify({ image }));
  }

  // 3. API 代理 (解決跨域問題)
  if (path === '/api/proxy') {
    const target = url.searchParams.get('url');
    const wd = url.searchParams.get('wd');
    const ids = url.searchParams.get('ids');
    const ac = url.searchParams.get('ac');
    
    let apiUrl = `${target}?ac=${ac}`;
    if (wd) apiUrl += `&wd=${encodeURIComponent(wd)}`;
    if (ids) apiUrl += `&ids=${ids}`;

    const res = await fetch(apiUrl);
    const data = await res.text();
    return new Response(data, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response("Not Found", { status: 404 });
}

