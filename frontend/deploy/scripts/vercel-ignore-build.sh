
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

git -C "$REPO_ROOT" cat-file -e "${PREVIOUS_SHA}^{commit}" 2>/dev/null || exit 1
git -C "$REPO_ROOT" cat-file -e "${CURRENT_SHA}^{commit}" 2>/dev/null || exit 1

CHANGED_FILES="$(mktemp)"
trap 'rm -f "$CHANGED_FILES"' EXIT

# Use NUL separators to safely handle filenames containing spaces
# or special characters.
git -C "$REPO_ROOT" diff \
  --no-renames \
  --name-only \
  -z \
  "$PREVIOUS_SHA" \
  "$CURRENT_SHA" \
  -- > "$CHANGED_FILES" || exit 1

has_relevant_changes=false

# Bash 3.2 compatible: read NUL-separated paths byte by byte.
while IFS= read -r -d "$(printf '\0')" file; do
  # Only frontend changes can trigger this deployment.
  [[ "$file" == frontend/* ]] || continue

  relative_path="${file#frontend/}"
  lower_path="$(printf '%s' "$relative_path" | tr '[:upper:]' '[:lower:]')"
  filename="${lower_path##*/}"

  # Documentation files.
  case "$filename" in
    *.md|*.mdx|*.rst|*.adoc|*.txt)
      continue
      ;;
  esac

  # Documentation and AI-related directories.
  case "/$lower_path/" in
    */docs/*|*/documentation/*|\
    */.cursor/*|*/.claude/*|*/.codex/*|\
    */.windsurf/*|*/.opencode/*|*/.aider/*|\
    */agents/*|*/prompts/*|*/ai/*|*/.ai/*)
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

  # Fail-safe: any other frontend file is relevant.
  has_relevant_changes=true
  break

done < "$CHANGED_FILES"

if [[ "$has_relevant_changes" == true ]]; then
  # Exit 1: Vercel continues with the deployment.
  exit 1
fi

# Exit 0: Vercel skips the deployment.
exit 0
