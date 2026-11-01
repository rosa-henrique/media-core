
#!/usr/bin/env bash

set -euo pipefail

# Fail-safe: if Git history or commit information is unavailable,
# allow the deployment instead of risking a skipped build.

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 1

PREVIOUS_SHA="${VERCEL_GIT_PREVIOUS_SHA:-}"
CURRENT_SHA="${VERCEL_GIT_COMMIT_SHA:-HEAD}"

if [[ -z "$PREVIOUS_SHA" ]]; then
  exit 1
fi

git cat-file -e "${PREVIOUS_SHA}^{commit}" 2>/dev/null || exit 1
git cat-file -e "${CURRENT_SHA}^{commit}" 2>/dev/null || exit 1

CHANGED_FILES="$(mktemp)"
trap 'rm -f "$CHANGED_FILES"' EXIT

git -C "$REPO_ROOT" diff \
  --no-renames \
  --name-only \
  -z \
  "$PREVIOUS_SHA" \
  "$CURRENT_SHA" \
  -- > "$CHANGED_FILES" || exit 1

has_relevant_changes=false

while IFS= read -r -d '' file; do
  # Only frontend changes can trigger this deployment.
  [[ "$file" == frontend/* ]] || continue

  relative_path="${file#frontend/}"
  lower_path="${relative_path,,}"
  filename="${lower_path##*/}"

  # Documentation files.
  case "$filename" in
    *.md|*.mdx|*.rst|*.adoc|*.txt)
      continue
      ;;
  esac

  # Documentation and AI-related directories.
  case "/$lower_path/" in
    */docs/*|*/documentation/*|*/.github/*|*/.cursor/*|*/.claude/*|*/.codex/*|*/.windsurf/*|*/.opencode/*|*/.aider/*|*/agents/*|*/prompts/*|*/ai/*|*/.ai/*)
      continue
      ;;
  esac

  # AI assistant instructions and prompt files.
  case "$filename" in
    agents.md|agent.md|claude.md|gemini.md|copilot.md|\
    *.prompt|*.prompt.*|*.instructions.md)
      continue
      ;;
  esac

  # Relevant source code, configuration, dependencies and assets.
  case "$filename" in
    *.ts|*.tsx|*.js|*.jsx|*.mjs|*.cjs|*.mts|*.cts|\
    *.json|*.jsonc|*.yaml|*.yml|*.toml|*.lock|\
    *.css|*.scss|*.sass|*.less|*.html|*.svg|\
    *.sh|*.bash|*.py|*.tsbuildinfo|\
    *.png|*.jpg|*.jpeg|*.webp|*.avif|*.gif|*.ico|\
    *.woff|*.woff2|*.ttf|*.otf)
      has_relevant_changes=true
      break
      ;;
  esac

  # Important extensionless or special configuration files.
  case "$filename" in
    dockerfile|.dockerignore|.npmrc|.nvmrc|.node-version|\
    makefile|procfile|nginx.conf|\
    .env|.env.*|.browserslistrc)
      has_relevant_changes=true
      break
      ;;
  esac
done < "$CHANGED_FILES"

if [[ "$has_relevant_changes" == true ]]; then
  # Exit 1: Vercel continues with the deployment.
  exit 1
fi

# Exit 0: Vercel skips the deployment.
exit 0
