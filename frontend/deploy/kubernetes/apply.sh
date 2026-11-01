#!/usr/bin/env bash
set -Eeuo pipefail

# Apply all Kubernetes manifests from deploy/kubernetes.
#
# Usage:
#   ./deploy/kubernetes/apply.sh

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MANIFEST_DIR="${ROOT_DIR}/deploy/kubernetes"

KUBE_CONTEXT="${KUBE_CONTEXT:-kind-desktop}"
NAMESPACE="${KUBE_NAMESPACE:-default}"

if ! command -v kubectl >/dev/null 2>&1; then
  echo "Error: kubectl is required but was not found." >&2
  exit 1
fi

if [[ ! -d "$MANIFEST_DIR" ]]; then
  echo "Error: Kubernetes manifest directory not found: $MANIFEST_DIR" >&2
  exit 1
fi

if ! kubectl --context "$KUBE_CONTEXT" get nodes >/dev/null 2>&1; then
  echo "Error: Kubernetes context '$KUBE_CONTEXT' is unavailable." >&2
  exit 1
fi

echo "==> Applying Kubernetes manifests from ${MANIFEST_DIR}"
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" \
  apply -f "$MANIFEST_DIR"

echo
echo "==> Current workloads"
kubectl --context "$KUBE_CONTEXT" -n "$NAMESPACE" get deployments,pods,services,ingress

echo
echo "Manifests applied. Use deploy-images.sh to rebuild and roll out updated app images."
