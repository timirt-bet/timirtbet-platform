// Runs when a learner first signs in to Timirtbet with GitHub:
// 1. check the GitHub account exists (skipped when sign-in already returned its id)
// 2. add them to the students team (GitHub emails the organization invitation)
// 3. create their private repository from the student template
// 4. give them push access to that repository only
// Every step is safe to repeat, so a failed onboarding is simply retried at the next sign-in.
import { GitHubError } from "./github.mjs";

export function repoNameFor(student) {
  return `${student.githubUsername.toLowerCase()}-code`;
}

export async function onboardStudent({ gh, store, config, student, log = () => {} }) {
  const { org, studentsTeam, templateRepo } = config;
  const username = student.githubUsername;
  if (!/^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i.test(username)) throw new Error(`"${username}" is not a valid GitHub username`);

  const githubId = student.githubId ?? (await gh.getUser(username)).id;
  await gh.addToTeam(org, studentsTeam, username);
  log(`added ${username} to ${org}/${studentsTeam}`);

  const name = repoNameFor(student);
  try {
    await gh.createFromTemplate(org, templateRepo, name, `Timirtbet exercises for @${username}`);
    log(`created ${org}/${name} from ${templateRepo}`);
  } catch (e) {
    if (!(e instanceof GitHubError && e.status === 422)) throw e;
    await gh.getRepo(org, name); // 422 means it already exists: confirm and continue
    log(`${org}/${name} already exists`);
  }
  await gh.addCollaborator(org, name, username, "push");

  // Only what GitHub already shows publicly: no name, email, phone or age.
  return store.upsertLearner(student.id, { githubUsername: username, githubId, repo: `${org}/${name}`, onboardedAt: new Date().toISOString() });
}

// Account deletion: remove the learner from the organization and delete their repository.
export async function offboardLearner({ gh, config, learner }) {
  const [owner, repo] = (learner.repo || "").split("/");
  if (owner && repo) await gh.deleteRepo(owner, repo).catch((e) => { if (e.status !== 404) throw e; });
  if (learner.githubUsername) await gh.removeFromOrg(config.org, learner.githubUsername).catch((e) => { if (e.status !== 404) throw e; });
}
