import { getFile, putFile, getDirContents, parseMarkdown, stringifyMarkdown, slugify } from './_lib.js';

export async function onRequestGet(context) {
  const { env } = context;
  try {
    const files = await getDirContents('src/content/works', env);
    const works = [];
    for (const file of files) {
      if (!file.name.endsWith('.md')) continue;
      const slug = file.name.slice(0, -3);
      const { data, body } = parseMarkdown(file.content);
      works.push({ slug, ...data, body });
    }
    return Response.json(works);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const data = await request.json();
    const slug = slugify(data.title);
    const path = `src/content/works/${slug}.md`;

    const existing = await getFile(path, env);
    if (existing) {
      return Response.json({ error: 'A work with this title already exists' }, { status: 409 });
    }

    const { body, slug: _s, ...frontmatter } = data;
    const content = stringifyMarkdown(body || '', frontmatter);
    await putFile(path, content, `Add work: ${data.title}`, null, env);

    // Prepend slug to its category in order.json
    const orderResult = await getFile('src/_data/order.json', env);
    const order = orderResult ? JSON.parse(orderResult.content) : {};
    const cat = data.category || 'painting';
    if (!order[cat]) order[cat] = [];
    if (!order[cat].includes(slug)) order[cat].unshift(slug);
    await putFile(
      'src/_data/order.json',
      JSON.stringify(order, null, 2) + '\n',
      `Update order for new work: ${slug}`,
      orderResult?.sha,
      env,
    );

    return Response.json({ slug, ...data }, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
