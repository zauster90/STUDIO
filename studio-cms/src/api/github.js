/**
 * GitHub API wrapper for reading/writing content files in the STUDIO repo.
 * Uses the Octokit REST client with the OAuth token from our auth flow.
 */

import { Octokit } from '@octokit/rest';
import { getToken } from '../auth/github';

const REPO_OWNER = import.meta.env.VITE_GITHUB_REPO.split('/')[0];
const REPO_NAME = import.meta.env.VITE_GITHUB_REPO.split('/')[1];
const BRANCH = import.meta.env.VITE_GITHUB_BRANCH;

function getOctokit() {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  return new Octokit({ auth: token });
}

/**
 * Fetch a single file's content from the repo.
 */
export async function fetchFile(path) {
  const octokit = getOctokit();
  const { data } = await octokit.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    ref: BRANCH,
  });
  const content = atob(data.content);
  return { content, sha: data.sha, path: data.path };
}

/**
 * List files in a directory.
 */
export async function listFiles(path) {
  const octokit = getOctokit();
  const { data } = await octokit.repos.getContent({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    ref: BRANCH,
  });
  return Array.isArray(data) ? data : [data];
}

/**
 * Create or update a file in the repo.
 */
export async function writeFile(path, content, message, sha = null) {
  const octokit = getOctokit();
  const params = {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    message,
    content: btoa(unescape(encodeURIComponent(content))),
    branch: BRANCH,
  };
  if (sha) params.sha = sha;
  const { data } = await octokit.repos.createOrUpdateFileContents(params);
  return data;
}

/**
 * Batch-update multiple files in a single commit using the Git tree API.
 * This is used for reordering (updating order in many .md files at once).
 */
export async function batchCommit(files, message) {
  const octokit = getOctokit();

  // Get the latest commit SHA on the branch
  const { data: ref } = await octokit.git.getRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `heads/${BRANCH}`,
  });
  const latestCommitSha = ref.object.sha;

  // Get the tree SHA from the latest commit
  const { data: commit } = await octokit.git.getCommit({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    commit_sha: latestCommitSha,
  });
  const baseTreeSha = commit.tree.sha;

  // Create blobs for each file
  const treeItems = await Promise.all(
    files.map(async (file) => {
      const { data: blob } = await octokit.git.createBlob({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        content: file.content,
        encoding: 'utf-8',
      });
      return {
        path: file.path,
        mode: '100644',
        type: 'blob',
        sha: blob.sha,
      };
    })
  );

  // Create new tree
  const { data: newTree } = await octokit.git.createTree({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  // Create commit
  const { data: newCommit } = await octokit.git.createCommit({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    message,
    tree: newTree.sha,
    parents: [latestCommitSha],
  });

  // Update branch ref
  await octokit.git.updateRef({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: `heads/${BRANCH}`,
    sha: newCommit.sha,
  });

  return newCommit;
}

/**
 * Delete a file from the repo.
 */
export async function deleteFile(path, message, sha) {
  const octokit = getOctokit();
  await octokit.repos.deleteFile({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    message,
    sha,
    branch: BRANCH,
  });
}

/**
 * Upload an image file (as base64) to the repo.
 */
export async function uploadImage(filename, base64Content, message) {
  const octokit = getOctokit();
  const path = `src/images/${filename}`;

  // Check if file exists (to get SHA for update)
  let sha = null;
  try {
    const { data } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path,
      ref: BRANCH,
    });
    sha = data.sha;
  } catch {
    // File doesn't exist yet — that's fine
  }

  const params = {
    owner: REPO_OWNER,
    repo: REPO_NAME,
    path,
    message: message || `Upload ${filename}`,
    content: base64Content,
    branch: BRANCH,
  };
  if (sha) params.sha = sha;

  const { data } = await octokit.repos.createOrUpdateFileContents(params);
  return { path: `/images/${filename}`, data };
}
