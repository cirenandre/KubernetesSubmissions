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
