// Minimal GitHub REST client. No dependencies: uses the global fetch.
// Auth: pass a token provider (GitHub App installation token recommended; see app-auth.mjs).
export class GitHubError extends Error {
  constructor(status, method, path, body) {
    super(`GitHub ${method} ${path} failed with ${status}: ${body && body.message ? body.message : ""}`);
    this.status = status; this.body = body;
  }
}

export function createGitHub({ token, baseUrl = "https://api.github.com", fetchImpl = globalThis.fetch }) {
  const getToken = typeof token === "function" ? token : async () => token;
  async function request(method, path, body) {
    const res = await fetchImpl(baseUrl + path, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${await getToken()}`,
        "x-github-api-version": "2022-11-28",
        "user-agent": "timirtbet-platform",
        ...(body ? { "content-type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) throw new GitHubError(res.status, method, path, data);
    return data;
  }
  const enc = encodeURIComponent;
  return {
    request,
    getUser: (username) => request("GET", `/users/${enc(username)}`),
    // Adds the user to a team. GitHub emails an organization invitation if they are not a member yet.
    addToTeam: (org, team, username) => request("PUT", `/orgs/${enc(org)}/teams/${enc(team)}/memberships/${enc(username)}`, { role: "member" }),
    createFromTemplate: (org, template, name, description) =>
      request("POST", `/repos/${enc(org)}/${enc(template)}/generate`, { owner: org, name, description, private: true, include_all_branches: false }),
    getRepo: (owner, repo) => request("GET", `/repos/${enc(owner)}/${enc(repo)}`),
    // One file on a branch, as text, with the commit it is at (null if the file doesn't exist).
    async getFileAt(owner, repo, filePath, branch = "main") {
      const head = await request("GET", `/repos/${enc(owner)}/${enc(repo)}/branches/${enc(branch)}`);
      try {
        const f = await request("GET", `/repos/${enc(owner)}/${enc(repo)}/contents/${filePath.split("/").map(enc).join("/")}?ref=${enc(head.commit.sha)}`);
        return { text: Buffer.from(f.content || "", "base64").toString("utf8"), sha: head.commit.sha };
      } catch (e) { if (e.status === 404) return { text: null, sha: head.commit.sha }; throw e; }
    },
    addCollaborator: (owner, repo, username, permission = "push") =>
      request("PUT", `/repos/${enc(owner)}/${enc(repo)}/collaborators/${enc(username)}`, { permission }),
    setStatus: (owner, repo, sha, { state, description, context, target_url }) =>
      request("POST", `/repos/${enc(owner)}/${enc(repo)}/statuses/${enc(sha)}`, { state, description: description.slice(0, 140), context, target_url }),
    createIssue: (owner, repo, title, body) => request("POST", `/repos/${enc(owner)}/${enc(repo)}/issues`, { title, body }),
    commentOnPR: (owner, repo, number, body) => request("POST", `/repos/${enc(owner)}/${enc(repo)}/issues/${number}/comments`, { body }),
    listPRFiles: (owner, repo, number) => request("GET", `/repos/${enc(owner)}/${enc(repo)}/pulls/${number}/files?per_page=100`),
    deleteRepo: (owner, repo) => request("DELETE", `/repos/${enc(owner)}/${enc(repo)}`),
    removeFromOrg: (org, username) => request("DELETE", `/orgs/${enc(org)}/members/${enc(username)}`),
    tarballUrl: (owner, repo, sha) => `${baseUrl}/repos/${enc(owner)}/${enc(repo)}/tarball/${enc(sha)}`,
    getToken,
  };
}
