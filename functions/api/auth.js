export async function onRequest(context) {
    const { request, env } = context;
    const password = env.PASSWORD;

    if (request.method === 'POST') {
        const { pwd } = await request.json();
        return new Response(JSON.stringify({ success: pwd === password }));
    }

    return new Response(JSON.stringify({ required: !!password }));
}

