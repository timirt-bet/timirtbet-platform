#!/usr/bin/env bash
# Checks that the GitHub App settings the API uses actually work:
# the private key in Secret Manager, the App ID and the installation ID.
#   cd ~/timirtbet-platform && bash deploy/check-github-app.sh
set -uo pipefail
cd "$(dirname "$0")/.."
source deploy/config.env
REGION=${REGION:-us-central1}
echo "== What the running API uses"
gcloud run services describe timirtbet-api --region "$REGION" --format=json 2>/dev/null \
  | node -e 'const s=JSON.parse(require("fs").readFileSync(0));const e=s.spec.template.spec.containers[0].env||[];for(const v of e)if(/GITHUB_(APP_ID|APP_INSTALLATION_ID|ORG|CLIENT_ID)/.test(v.name))console.log("  "+v.name+"="+JSON.stringify(v.value))'
echo "== Checking the private key against GitHub"
KEY=$(gcloud secrets versions access latest --secret=github-app-key) || { echo "  cannot read secret github-app-key"; exit 1; }
KEY="$KEY" APP_ID="$GITHUB_APP_ID" INST="$GITHUB_APP_INSTALLATION_ID" ORG="$GITHUB_ORG" node --input-type=module -e '
import crypto from "node:crypto";
const b=(x)=>Buffer.from(x).toString("base64url"), now=Math.floor(Date.now()/1000);
const h=b(JSON.stringify({alg:"RS256",typ:"JWT"})), p=b(JSON.stringify({iat:now-60,exp:now+540,iss:process.env.APP_ID.trim()}));
let jwt; try { jwt=`${h}.${p}.${b(crypto.createSign("RSA-SHA256").update(`${h}.${p}`).sign(process.env.KEY))}`; }
catch (e) { console.log("  ✗ the secret is not a valid private key (.pem):", e.message); process.exit(1); }
const gh=(u,m="GET")=>fetch("https://api.github.com"+u,{method:m,headers:{authorization:"Bearer "+jwt,accept:"application/vnd.github+json","user-agent":"timirtbet-check"}});
let r=await gh("/app");
if(!r.ok){ console.log(`  ✗ GitHub rejected the key for App ID ${process.env.APP_ID}: ${r.status} ${(await r.json()).message}`);
  console.log("    Fix: GitHub App settings → Private keys → Generate a private key, then run:");
  console.log("    gcloud secrets versions add github-app-key --data-file=PATH-TO-THE-NEW.pem   and redeploy (bash deploy/deploy-now.sh)");
  console.log("    Also check the App ID on the app settings page matches GITHUB_APP_ID in deploy/config.env."); process.exit(1); }
const app=await r.json(); console.log(`  ✓ key and App ID match: app "${app.slug}" (id ${app.id})`);
const inst=await (await gh("/app/installations")).json();
for(const i of inst) console.log(`    installed on ${i.account.login}: installation id ${i.id}`);
if(!inst.some(i=>String(i.id)===process.env.INST.trim())) { console.log(`  ✗ installation id ${process.env.INST} is not one of these. Put the right one in GITHUB_APP_INSTALLATION_ID and redeploy.`); process.exit(1); }
r=await gh(`/app/installations/${process.env.INST.trim()}/access_tokens`,"POST");
console.log(r.ok?"  ✓ installation token works":`  ✗ installation token failed: ${r.status} ${(await r.json()).message}`);
const perms=inst.find(i=>String(i.id)===process.env.INST.trim()).permissions; console.log("    permissions:", JSON.stringify(perms));
'
