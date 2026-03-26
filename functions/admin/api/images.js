import { listDir } from './_lib.js';

const IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)$/i;

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const files = await listDir('src/images', env);
    const images = files.filter(f => IMAGE_EXT.test(f.name)).map(f => `/images/${f.name}`);
    return Response.json(images);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
