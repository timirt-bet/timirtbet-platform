# Run your own Timirtbet

This guide sets up a complete copy of Timirtbet for your school: your own GitHub organization for learners, and your own Google Cloud project for the website, API and grader. Do the steps in order; each one says where to do it.

In the commands below, replace **`<org>`** with your GitHub organization's name (for example `adama-school-code`) and **`<project-id>`** with your Google Cloud project ID.

## Keep these notes as you go

| What | Where you get it | Value |
|---|---|---|
| Project ID | Step 2 | |
| Billing account ID | Step 3 | |
| GitHub App ID | Step 6 | |
| GitHub App Client ID | Step 6 | |
| GitHub App client secret | Step 6 (shown once) | |
| Installation ID | Step 7 | |
| Private key file (.pem) | Step 6 (downloads) | |

## Step 1 — GitHub organization settings (browser)

Create a free organization at `github.com/organizations/plan` if you don't have one. Learners join it automatically on their first sign-in.

1. Go to `github.com/<org>` → **Settings** → **Member privileges**.
2. **Base permissions:** No permission. Under **Repository creation**, untick both boxes.
3. **Teams** tab → **New team** → name `learners`, visibility **Secret** → **Create team**. Leave it empty.

## Step 2 — Google Cloud project (browser)

1. `console.cloud.google.com` → project picker at the top → **New project**.
2. Name: `timirtbet`. Click **Edit** next to Project ID and choose one, e.g. `timirtbet-prod`. It becomes the web address `https://<project-id>.web.app`.
3. Organization: **No organization** → **Create** → select the new project in the picker.

## Step 3 — Billing (browser)

1. Menu ☰ → **Billing** → **Link a billing account** (add a card if asked).
2. Copy the **Billing account ID** (like `01AB23-45CD67-89EF01`).

## Step 4 — Open Cloud Shell and get the code

1. In the Google Cloud console, click the **>_** icon (top right) to open Cloud Shell.
2. Run:

```sh
git clone https://github.com/timirt-bet/timirtbet-platform.git
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
gh auth login        # GitHub.com → HTTPS → Yes → Login with a web browser; paste the code shown
```

## Step 5 — Create the three GitHub repositories (Cloud Shell)

```sh
cd ~/timirtbet-platform
for r in challenges student-template; do
  rm -rf ~/$r && cp -r $r ~/$r
  (cd ~/$r && git init -q -b main && git add . && git commit -qm "Initial commit" \
    && gh repo create <org>/$r --public --source=. --push)
done
gh repo edit <org>/student-template --template=true

rm -rf .git && git init -q -b main && git add . && git commit -qm "Initial commit"
gh repo create <org>/timirtbet-platform --public --source=. --push
```

The platform push starts a GitHub Actions run. Its tests pass, and it skips the deploy until Step 8 has set the repository variables. Your copy of the platform can be public (Actions is free for public repositories) or private.

## Step 6 — Create the GitHub App (browser)

Go to `github.com/organizations/<org>/settings/apps/new`:

- **GitHub App name:** for example `<org>-timirtbet` (must be unique on GitHub)
- **Homepage URL:** `https://<project-id>.web.app`
- **Callback URL:** `https://<project-id>.web.app/api/auth/github/callback`
- **Expire user authorization tokens:** leave as is. **Request user authorization during installation:** unticked
- **Webhook → Active:** **untick** for now
- **Repository permissions:** Administration: Read and write · Contents: Read-only · Commit statuses: Read and write · Issues: Read and write · Pull requests: Read and write
- **Organization permissions:** Members: Read and write
- **Account permissions:** none
- **Where can this GitHub App be installed?** Only on this account

Click **Create GitHub App**. On the next page:

1. Note the **App ID** and **Client ID**.
2. **Generate a new client secret** → copy it now (shown once).
3. Scroll down → **Generate a private key** → a `.pem` file downloads.

## Step 7 — Install the app (browser)

1. Left menu of the app page → **Install App** → **Install** next to your organization → **All repositories** → **Install**.
2. The page address ends in `/installations/12345678`. That number is the **Installation ID**.

## Step 8 — Fill in the config and run setup (Cloud Shell)

1. Upload the `.pem` file (⋮ → Upload), then:

```sh
mv ~/*.pem ~/timirtbet-platform/github-app.pem
cd ~/timirtbet-platform
cp deploy/config.env.example deploy/config.env
nano deploy/config.env
```

2. Fill in `PROJECT_ID`, `BILLING_ACCOUNT`, `PLATFORM_REPO` (`<org>/timirtbet-platform`), `GITHUB_ORG`, `GITHUB_APP_ID`, `GITHUB_APP_INSTALLATION_ID`, `GITHUB_CLIENT_ID`. Leave the other lines. Save with **Ctrl+O, Enter**, exit with **Ctrl+X**.
3. Run:

```sh
gcloud config set project <project-id>
gcloud auth application-default login
bash deploy/setup.sh
```

- It asks for the **client secret** (typing is hidden; paste and press Enter).
- It prints a **Webhook secret** — copy it.
- It sets the GitHub repository variables for you, and prints the **Webhook URL** at the end.

## Step 9 — Turn on the webhook (browser)

GitHub App settings (`github.com/organizations/<org>/settings/apps/<app-name>`):

1. **Webhook → Active:** tick.
2. **Webhook URL:** the one printed in Step 8. **Webhook secret:** the one printed in Step 8.
3. **Subscribe to events** (under Permissions & events): tick **Push** and **Pull request** → **Save changes**.

## Step 10 — Deploy (browser)

`github.com/<org>/timirtbet-platform` → **Actions** → **test-and-deploy** → **Run workflow** → branch `main`. It takes about 10 minutes. When it is green, open `https://<project-id>.web.app`.

If GitHub Actions is not available to you, deploy from Cloud Shell instead: `bash deploy/deploy-now.sh`.

## Step 11 — Check it works

1. Sign in with GitHub. You get an invitation email to your organization — accept it.
2. `github.com/<org>/<your-username>-code` should exist.
3. Solve a challenge in the web editor.
4. Push a solution to your repository; the commit gets a `timirtbet/tests` check.

## Before real students

- Block the grader's internet access (VPC with a deny-all egress rule).
- Run `npm run test:firestore` once.

## Answers for your challenges

The reference answers are not public. Your deployment does not need them: learners' code is checked against the tests only. If you add or change challenges, write your own answers in `solutions/` so `node authoring/build.mjs` can check them (see `CONTRIBUTING.md`).

## Updating

Pull new versions from `timirt-bet/timirtbet-platform` into your copy, push to `main`, and it deploys. If a challenge changed, also copy `challenges/` to your `<org>/challenges` repository.

If a step fails, open an issue with the error text.
