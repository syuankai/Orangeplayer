export async function onRequest(context) {
    const url = new URL(context.request.url);
    const targetBase = url.searchParams.get('url');
    const wd = url.searchParams.get('wd');
    const ids = url.searchParams.get('ids');
    const ac = url.searchParams.get('ac') || 'videolist';

    if (!targetBase) return new Response("Missing URL", { status: 400 });

    let targetUrl = `${targetBase}?ac=${ac}`;
    if (wd) targetUrl += `&wd=${encodeURIComponent(wd)}`;
    if (ids) targetUrl += `&ids=${ids}`;

    try {
        const response = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(10000)
        });
        const data = await response.text();
        return new Response(data, { headers: { 'Content-Type': 'application/json' } });
    } catch (e) {
        return new Response(JSON.stringify({ list: [] }), { status: 200 });
    }
}

