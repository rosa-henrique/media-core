#!/usr/bin/env bash
set -Eeuo pipefail

# Build local Docker images, load them into the Kind cluster and restart
# only the selected Kubernetes Deployments.
#
# Usage:
#   ./deploy/kubernetes/deploy-images.sh web
#   ./deploy/kubernetes/deploy-images.sh admin
#   ./deploy/kubernetes/deploy-images.sh proxy
#   ./deploy/kubernetes/deploy-images.sh all

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

CLUSTER_NAME="${KIND_CLUSTER_NAME:-desktop}"
KUBE_CONTEXT="${KUBE_CONTEXT:-kind-${CLUSTER_NAME}}"
NAMESPACE="${KUBE_NAMESPACE:-default}"

APPS=()

usage() {
  echo "Usage: $0 {web|admin|proxy|all}"
  exit 1
}

[[ $# -eq 1 ]] || usage

case "$1" in
  web|admin|proxy)
    APPS=("$1")
    ;;
  all)
    APPS=(web admin proxy)
    ;;
  *)
    usage
    ;;
esac

for command in docker kind kubectl; do
  if ! command -v "$command" >/dev/null 2>&1; then
    echo "Error: required command not found: $command" >&2
    exit 1
  fi
done

if ! kind get clusters | grep -Fxq "$CLUSTER_NAME"; then
  echo "Error: Kind cluster '$CLUSTER_NAME' was not found." >&2
  echo "Available clusters:" >&2
  kind get clusters >&2
  exit 1
fi

if ! kubectl --context "$KUBE_CONTEXT" get nodes >/dev/null 2>&1; then
  echo "Error: Kubernetes context '$KUBE_CONTEXT' is unavailable." >&2
  exit 1
fi

for app in "${APPS[@]}"; do
  image="media-core-${app}:local"
  dockerfile="apps/${app}/Dockerfile"

  if [[ ! -f "$dockerfile" ]]; then
    echo "Error: Dockerfile not found: $dockerfile" >&2
    exit 1
  fi

  echo
  echo "==> Building ${image}"
  docker build -f "$dockerfile" -t "$image" .

  echo
  echo "==> Loading ${image} into Kind cluster '${CLUSTER_NAME}'"
  kind load docker-image "$image" --name "$CLUSTER_NAME"

  echo
  echo "==> Restarting Deployment '${app}'"
  kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" \
    rollout restart "deployment/${app}"

  echo
  echo "==> Waiting for Deployment '${app}'"
  kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" \
    rollout status "deployment/${app}" --timeout=180s
done

echo
echo "Deployment completed successfully."
