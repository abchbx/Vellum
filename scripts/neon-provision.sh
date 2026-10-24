#!/usr/bin/env bash
# Claimable Neon provisioning: identity -> token -> credentials
set -e
cd "$(dirname "$0")/.."
mkdir -p .secrets

curl -s -m 30 -X POST https://claimable.neon.tech/v1/agent/identity \
  -H "Content-Type: application/json" \
  -d '{"type":"anonymous","capabilities":["postgres"],"source":"qoder-agent"}' > .secrets/neon_identity.json

ASSERT=$(node -p "require('./.secrets/neon_identity.json').identity_assertion")
curl -s -m 30 -X POST https://claimable.neon.tech/v1/oauth2/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer" \
  --data-urlencode "assertion=$ASSERT" \
  --data-urlencode "resource=https://claimable.neon.tech/" > .secrets/neon_token.json

ACCESS=$(node -p "require('./.secrets/neon_token.json').access_token")
PID=$(node -p "require('./.secrets/neon_identity.json').project.id")
curl -s -m 30 "https://claimable.neon.tech/v1/projects/$PID/credentials" \
  -H "Authorization: Bearer $ACCESS" > .secrets/neon_creds.json

node -e "
const c = require('./.secrets/neon_creds.json');
const url = c.database_url;
if (!url) { console.error('no database_url in creds'); process.exit(1); }
require('fs').appendFileSync('.env.local', '\nDATABASE_URL=' + url + '\n');
console.log('[neon] DATABASE_URL written');
console.log('[neon] project_id=' + (require('./.secrets/neon_identity.json').project.id || ''));
"
