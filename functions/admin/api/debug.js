export async function onRequestGet(context) {
  const { env } = context;
  const repo = env.GITHUB_REPO || '(not set)';
  const branch = env.GITHUB_BRANCH || '(not set)';
  const hasToken = !!env.GITHUB_TOKEN;

  const url = `https://api.github.com/repos/${repo}/contents/src/content/works?ref=${branch}`;
  let ghStatus = null;
  let ghBody = null;

  try {
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        'User-Agent': 'STUDIO-Admin',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });
    ghStatus = res.status;
    ghBody = await res.json().catch(() => null);
  } catch (err) {
    ghBody = { fetchError: err.message };
  }

  return Response.json({
    env: { repo, branch, hasToken },
    githubUrl: url,
    githubStatus: ghStatus,
    githubResponse: ghBody,
  });
}
