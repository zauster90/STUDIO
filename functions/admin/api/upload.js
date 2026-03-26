const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const GITHUB_API = 'https://api.github.com';

export async function onRequestPost(context) {
  const { request, env } = context;
  try {
    const form = await request.formData();
    const file = form.get('image');

    if (!file || typeof file === 'string') {
      return Response.json({ error: 'No file uploaded' }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { error: 'Invalid file type. Allowed: jpeg, png, gif, webp' },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) {
      return Response.json({ error: 'File exceeds 10 MB limit' }, { status: 413 });
    }

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-').toLowerCase();
    const repoPath = `src/images/${safeName}`;

    // Encode binary directly to base64 (no UTF-8 re-encoding)
    const bytes = new Uint8Array(buffer);
    let binary = '';
    bytes.forEach(b => (binary += String.fromCharCode(b)));
    const base64Content = btoa(binary);

    // Check for existing file to get its SHA (needed for updates)
    const existingRes = await fetch(
      `${GITHUB_API}/repos/${env.GITHUB_REPO}/contents/${repoPath}?ref=${env.GITHUB_BRANCH}`,
      {
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          'User-Agent': 'STUDIO-Admin',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    const body = {
      message: `Upload image: ${safeName}`,
      content: base64Content,
      branch: env.GITHUB_BRANCH,
    };
    if (existingRes.ok) {
      const existing = await existingRes.json();
      body.sha = existing.sha;
    }

    const putRes = await fetch(
      `${GITHUB_API}/repos/${env.GITHUB_REPO}/contents/${repoPath}`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${env.GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'STUDIO-Admin',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify(body),
      },
    );

    if (!putRes.ok) {
      const err = await putRes.json().catch(() => ({}));
      return Response.json(
        { error: `GitHub API error: ${err.message || putRes.status}` },
        { status: 500 },
      );
    }

    return Response.json({ path: `/images/${safeName}` });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
