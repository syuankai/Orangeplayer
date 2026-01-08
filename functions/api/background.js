export async function onRequest(context) {
    const { request, env } = context;
    const kv = env.KV; // 需綁定 KV 名稱為 KV

    if (request.method === 'POST') {
        const { image } = await request.json();
        await kv.put('user_bg', image);
        return new Response(JSON.stringify({ success: true }));
    }

    const image = await kv.get('user_bg');
    return new Response(JSON.stringify({ image }));
}

