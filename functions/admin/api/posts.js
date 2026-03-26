import { getFile, putFile, listDir, parseMarkdown, stringifyMarkdown, slugify } from './_lib.js';

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const files = await listDir('src/content/posts', env);
    const posts = [];
    for (const file of files) {
      if (!file.name.endsWith('.md')) continue;
      const slug = file.name.slice(0, -3);
      const result = await getFile(`src/content/posts/${file.name}`, env);
      if (!result) continue;
      const { data, body } = parseMarkdown(result.content);
      posts.push({ slug, ...data, body });
    }
    posts.sort((a, b) => new Date(b.date) - new Date(a.date));
    return Response.json(posts);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const data = await request.json();
    const slug = slugify(data.title);
    const path = `src/content/posts/${slug}.md`;

    const existing = await getFile(path, env);
    if (existing) {
      return Response.json({ error: 'A post with this title already exists' }, { status: 409 });
    }

    const { body, slug: _s, ...frontmatter } = data;
    const content = stringifyMarkdown(body || '', frontmatter);
    await putFile(path, content, `Add post: ${data.title}`, null, env);

    return Response.json({ slug, ...data }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
