# ping-pong

Exercise 1.9 of the DevOps with Kubernetes course.

Responds to `GET /pingpong` with `pong N`, where `N` is an in-memory counter
that increases by one on every request (starting at 0). The counter resets
if the application restarts.

Shares an Ingress with the `log_output` application: requests to `/pingpong`
are routed to this app.

## Running

Requires Node.js (no external dependencies).

```bash
node app.js
```

or

```bash
npm start
```

## Running with Docker

```bash
docker build -t ping-pong-app .
docker run --rm -p 3000:3000 ping-pong-app
```

## Deploying to Kubernetes

```bash
eval $(minikube docker-env)
docker build -t ping-pong-app:1.1 .
kubectl apply -f manifests/service.yaml
kubectl apply -f manifests/analysistemplate.yaml
kubectl apply -f manifests/rollout.yaml
```

The Ingress routing `/pingpong` to this service lives in
`log_output/manifests/ingress.yaml`.

## Canary deployments with Argo Rollouts (Exercise 4.4)

`manifests/rollout.yaml` replaces the plain `Deployment` with an Argo
Rollouts `Rollout` using a canary strategy: it shifts to 50% weight, then
runs `manifests/analysistemplate.yaml` as a gating analysis step before
going to 100%.

The `cpu-usage` AnalysisTemplate queries Prometheus (installed locally via
Helm, see `../monitoring/README.md`) for the total CPU usage rate across all
containers in the `exercises` namespace over a 5 minute window:

```
scalar(sum(rate(container_cpu_usage_seconds_total{namespace="exercises"}[5m])))
```

If that value is `>= 0.2` cores, the analysis fails and Argo Rollouts
automatically aborts the update, scaling down the canary and leaving the
previous stable revision running — no manual rollback needed. This was
verified on the live cluster: a normal update (low CPU) completes and
promotes to stable, while a deliberately-too-strict threshold reliably
blocks the update and keeps the prior stable version serving traffic.

Requires the Argo Rollouts controller and `kubectl argo rollouts` plugin:

```bash
kubectl create namespace argo-rollouts
kubectl apply -n argo-rollouts -f https://github.com/argoproj/argo-rollouts/releases/latest/download/install.yaml
```

Watch a rollout live with:

```bash
kubectl argo rollouts get rollout ping-pong-app -n exercises --watch
```
