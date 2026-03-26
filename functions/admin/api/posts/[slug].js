import { getFile, putFile, deleteFile, parseMarkdown, stringifyMarkdown, slugify } from '../_lib.js';

export async function onRequestGet(context) {
  const { params, env } = context;
  const { slug } = params;
  try {
    const result = await getFile(`src/content/posts/${slug}.md`, env);
    if (!result) return Response.json({ error: 'Post not found' }, { status: 404 });
    const { data, body } = parseMarkdown(result.content);
    return Response.json({ slug, ...data, body });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPut(context) {
  const { params, request, env } = context;
  const oldSlug = params.slug;
  try {
    const data = await request.json();
    const newSlug = slugify(data.title);

    if (newSlug !== oldSlug) {
      await deleteFile(
        `src/content/posts/${oldSlug}.md`,
        `Rename post: ${oldSlug} → ${newSlug}`,
        env,
      );
    }

    const { body, slug: _s, ...frontmatter } = data;
    const content = stringifyMarkdown(body || '', frontmatter);
    await putFile(
      `src/content/posts/${newSlug}.md`,
      content,
      `Update post: ${data.title}`,
      null,
      env,
    );

    return Response.json({ slug: newSlug, ...data });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestDelete(context) {
  const { params, env } = context;
  const { slug } = params;
  try {
    await deleteFile(`src/content/posts/${slug}.md`, `Delete post: ${slug}`, env);
    return Response.json({ deleted: slug });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
