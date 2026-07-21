# Istio ambient service mesh (Exercise 5.2)

Standalone exercise — doesn't depend on any other app/exercise in this repo.
Follows Istio's ["Getting started with ambient mode"](https://istio.io/latest/docs/ambient/getting-started/)
guide with the Bookinfo sample app, through every step up to (not including)
Clean up: deploy, secure & visualize, enforce authorization policies, manage
traffic.

## Cluster

The exercise instructions point at k3d's own prerequisites page for this,
but we used a **separate, dedicated minikube profile** instead
(`minikube start -p dwk-istio --driver=docker`) — Istio's ambient mode
installs cluster-wide components (CNI plugin, `ztunnel` node agent) that
reprogram node-level iptables, so running it isolated from the main
`minikube` profile (which carries every other exercise's live workloads)
avoids any risk of that touching unrelated apps.

```bash
minikube start -p dwk-istio --driver=docker --cpus=4 --memory=6144
```

## Install Istio (ambient profile)

```bash
curl -L https://istio.io/downloadIstio | sh -
export PATH="$PATH:$(pwd)/istio-1.30.3/bin"
istioctl install --set profile=ambient --skip-confirmation
```

This installs Istio core, Istiod, the Istio CNI plugin, and `ztunnel` — no
sidecars are injected in ambient mode.

Gateway API CRDs (needed for the `Gateway`/`HTTPRoute` resources used
below):

```bash
kubectl apply --server-side -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.5.1/experimental-install.yaml
```

## Prometheus (required by Kiali)

Same Helm setup as [`monitoring/`](../monitoring/README.md) from Exercise
4.3, in its own `monitoring` namespace on this cluster:

```bash
helm install prom prometheus-community/prometheus -n monitoring
helm install grafana grafana/grafana -n monitoring
```

## Deploy the Bookinfo sample app

```bash
kubectl apply -f samples/bookinfo/platform/kube/bookinfo-versions.yaml
kubectl apply -f samples/bookinfo/platform/kube/bookinfo.yaml
kubectl apply -f samples/bookinfo/gateway-api/bookinfo-gateway.yaml
kubectl annotate gateway bookinfo-gateway networking.istio.io/service-type=ClusterIP --namespace=default
```

Verified `productpage` was reachable (`200 OK`) through the gateway before
touching the mesh at all.

## Secure and visualize

Enroll the `default` namespace in the ambient mesh:

```bash
kubectl label namespace default istio.io/dataplane-mode=ambient
```

`productpage` kept returning `200 OK` after enrollment — traffic now flows
through `ztunnel` transparently.

Install Kiali, pointed at the Prometheus installed above instead of
deploying Istio's own bundled addon Prometheus (`samples/addons/kiali.yaml`,
`external_services.prometheus.url` set to
`http://prom-prometheus-server.monitoring:80`):

```bash
kubectl apply -f samples/addons/kiali.yaml
```

Generated traffic and confirmed Kiali's traffic graph API
(`/kiali/api/namespaces/graph?namespaces=default`) returns real nodes/edges
with live request rates sourced from our own Prometheus. The Kiali Overview
page confirms the same thing visually — one healthy `Ambient` data plane and
live per-service latency/throughput numbers — see
`screenshots/kiali-overview.png`.

## Enforce authorization policies

L4 (`ztunnel`-enforced) policy restricting `productpage` to only the
ingress gateway's identity, then a `curl` pod deployed to test it — direct
access was denied (connection reset) as expected.

L7 policy via a waypoint proxy (`istioctl waypoint apply --enroll-namespace --wait`),
allowing only `GET` from the `curl` service account. Verified:

| Request | Expected | Result |
|---|---|---|
| `DELETE /productpage` from `curl` | denied | `403` |
| `GET /productpage` from `reviews-v1`'s identity | denied | `403` |
| `GET /productpage` from `curl` | allowed | `200`, page title returned |

## Manage traffic

Weighted `HTTPRoute` splitting `reviews` traffic 90/10 between `v1`/`v2`.
100 requests through `productpage` came back 180/20 hits across the two
`reviews` pods (regex matched twice per response) — a clean 9:1 ratio,
matching the configured weights.

## Verification

- `screenshots/productpage.png` — Bookinfo `productpage` in the browser.
- `screenshots/kiali-overview.png` — Kiali Overview, showing the `Ambient`
  data plane and live per-service latency/throughput for the mesh.
