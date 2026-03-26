import { getFile, putFile } from './_lib.js';

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const result = await getFile('src/_data/order.json', env);
    if (!result) return Response.json({});
    return Response.json(JSON.parse(result.content));
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { request, env } = context;
  try {
    const body = await request.json();
    await putFile(
      'src/_data/order.json',
      JSON.stringify(body, null, 2) + '\n',
      'Update work order',
      null,
      env,
    );
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
