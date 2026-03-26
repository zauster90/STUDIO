import { getFile, putFile, deleteFile, parseMarkdown, stringifyMarkdown, slugify } from '../_lib.js';

export async function onRequestGet(context) {
  const { params, env } = context;
  const { slug } = params;
  try {
    const result = await getFile(`src/content/works/${slug}.md`, env);
    if (!result) return Response.json({ error: 'Work not found' }, { status: 404 });
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
        `src/content/works/${oldSlug}.md`,
        `Rename work: ${oldSlug} → ${newSlug}`,
        env,
      );

      // Update slugs in order.json
      const orderResult = await getFile('src/_data/order.json', env);
      if (orderResult) {
        const order = JSON.parse(orderResult.content);
        for (const cat of Object.keys(order)) {
          const idx = order[cat].indexOf(oldSlug);
          if (idx !== -1) order[cat][idx] = newSlug;
        }
        await putFile(
          'src/_data/order.json',
          JSON.stringify(order, null, 2) + '\n',
          `Update order for renamed work: ${newSlug}`,
          orderResult.sha,
          env,
        );
      }
    }

    const { body, slug: _s, ...frontmatter } = data;
    const content = stringifyMarkdown(body || '', frontmatter);
    await putFile(
      `src/content/works/${newSlug}.md`,
      content,
      `Update work: ${data.title}`,
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
    await deleteFile(`src/content/works/${slug}.md`, `Delete work: ${slug}`, env);

    // Remove from order.json
    const orderResult = await getFile('src/_data/order.json', env);
    if (orderResult) {
      const order = JSON.parse(orderResult.content);
      for (const cat of Object.keys(order)) {
        order[cat] = order[cat].filter(s => s !== slug);
      }
      await putFile(
        'src/_data/order.json',
        JSON.stringify(order, null, 2) + '\n',
        `Update order after deleting work: ${slug}`,
        orderResult.sha,
        env,
      );
    }

    return Response.json({ deleted: slug });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
