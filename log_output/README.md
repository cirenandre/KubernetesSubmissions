# log_output

Started in exercise 1.1 of the DevOps with Kubernetes course. Since exercise
1.10, it's split into two applications sharing a volume:

- `writer/` — generates a random UUID on startup and overwrites a status
  file with the UUID and the current timestamp every 5 seconds.
- `reader/` — reads that status file and serves its content on `GET /`.

Both run as separate containers in the same pod, sharing a volume mounted at
`/usr/src/app/files` (see `manifests/deployment.yaml`).

## Running locally

Requires Node.js (no external dependencies). Both apps read/write the file
at the path in `FILE_PATH` (defaults to `/usr/src/app/files/status.txt`).

```bash
FILE_PATH=/tmp/status.txt node writer/app.js
FILE_PATH=/tmp/status.txt PORT=3000 node reader/app.js
```

## Running with Docker

```bash
docker build -t writer writer/
docker build -t reader reader/
```

## Deploying to Kubernetes

```bash
docker build -t writer:1.1 writer/
docker build -t reader:1.1 reader/
minikube image load writer:1.1
minikube image load reader:1.1
kubectl apply -f manifests/deployment.yaml
kubectl apply -f manifests/service.yaml
kubectl apply -f manifests/ingress.yaml
```

## GitOps on GKE (Exercise 4.7)

`manifests/gke` is a Kustomize base whose images come from GCP Artifact
Registry. `.github/workflows/log-output.yaml` builds and pushes new
`reader`/`writer` images (tagged with the commit SHA) on every push under
`log_output/**`, runs `kustomize edit set image`, and commits the updated
`kustomization.yaml` back to the repo using the workflow's default
`GITHUB_TOKEN` — pushes made with that token don't re-trigger the workflow,
so this doesn't create an infinite loop.

ArgoCD (installed in the `argocd` namespace on the GKE cluster, `Application`
defined in `manifests/argocd/application.yaml`) watches `manifests/gke` on
`main` and auto-syncs the cluster whenever that commit lands — no manual
`kubectl apply` needed after the initial bootstrap:

```bash
kubectl apply -f manifests/argocd/application.yaml
```

The Deployment uses `strategy: type: Recreate` since `reader` and `writer`
share a `ReadWriteOnce` PVC — without it, a rolling update deadlocks (the new
pod can't attach the volume while the old one still holds it), which matters
more here than in a manually-applied setup since nobody's watching to
unstick it.
