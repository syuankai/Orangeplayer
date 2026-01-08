export async function onRequest(context) {
    const { request, env } = context;
    const db = env.DB; // 需綁定 D1 名稱為 DB

    if (request.method === 'POST') {
        const { name, url } = await request.json();
        await db.prepare("INSERT INTO history (name, url) VALUES (?, ?)").bind(name, url).run();
        return new Response(JSON.stringify({ success: true }));
    }

    const { results } = await db.prepare("SELECT * FROM history ORDER BY id DESC LIMIT 20").all();
    return new Response(JSON.stringify(results));
}

