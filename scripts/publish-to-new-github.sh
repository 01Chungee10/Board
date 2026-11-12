#!/usr/bin/env bash
# Publish the prepared Board 'main' branch and its prebuilt site to the authorized GitHub account.
# This script intentionally never reuses the suspended account's credentials.
set -euo pipefail

cd "$(dirname "$0")/.."
owner="01Chungee10"
repo="Board"
target="$owner/$repo"
remote="origin"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required." >&2
  exit 2
fi

signed_in_as="$(gh api user --jq .login 2>/dev/null || true)"
if [[ "$(printf "%s" "$signed_in_as" | tr "[:upper:]" "[:lower:]")" != "$(printf "%s" "$owner" | tr "[:upper:]" "[:lower:]")" ]]; then
  echo "Login required: authorize GitHub CLI as $owner." >&2
  echo "Run: gh auth login -h github.com -p https --web" >&2
  echo "Then rerun: bash scripts/publish-to-new-github.sh" >&2
  exit 3
fi

if [[ "$(git branch --show-current)" != "main" ]]; then
  echo "Switch to the prepared 'main' branch before publishing." >&2
  exit 4
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Uncommitted changes exist; review and commit them before publishing." >&2
  exit 5
fi

node - <<'NODE'
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
const files = [...html.matchAll(/(?:src|href)="(\/Board\/(?:assets|brand)\/[^"]+)"/g)]
  .map(m => m[1].replace(/^\/Board\//, ''));
if (!files.length || files.some(p => !fs.existsSync(p))) {
  throw new Error('Published root index.html references missing local assets');
}
console.log('Validated public HTML assets: ' + files.length);
NODE

if ! gh repo view "$target" >/dev/null 2>&1; then
  echo "Creating $target as a public GitHub repository..."
  gh repo create "$target" --public --description "CEO-CL online workshop question board"
fi

expected="https://github.com/$target.git"
if ! git remote get-url "$remote" >/dev/null 2>&1; then
  git remote add "$remote" "$expected"
fi
remote_url="$(git remote get-url "$remote")"
if [[ "$(printf "%s" "$remote_url" | tr "[:upper:]" "[:lower:]")" != "$(printf "%s" "$expected" | tr "[:upper:]" "[:lower:]")" ]]; then
  echo "Refusing to push: remote '$remote' points to unexpected URL." >&2
  exit 6
fi

# Do not use stale credentials for the suspended legacy GitHub account.
# This push uses the identity selected and verified above by gh.
git -c credential.helper= -c credential.https://github.com.helper="!gh auth git-credential" push --set-upstream "$remote" main:main

# GitHub Pages serves the checked-in compiled root index.html from main:/.
if gh api "repos/$target/pages" >/dev/null 2>&1; then
  gh api --method PUT "repos/$target/pages" --input - >/dev/null <<'JSON'
{"build_type":"legacy","source":{"branch":"main","path":"/"}}
JSON
else
  gh api --method POST "repos/$target/pages" --input - >/dev/null <<'JSON'
{"build_type":"legacy","source":{"branch":"main","path":"/"}}
JSON
fi

echo "Repository: https://github.com/$target"
echo "Pages address (after GitHub finishes publishing): https://01chungee10.github.io/Board/"
gh api "repos/$target/pages" --jq '{status,html_url,source}'
