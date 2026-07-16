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
docker build -t ping-pong-app:1.1 .
minikube image load ping-pong-app:1.1
kubectl apply -f manifests/deployment.yaml
kubectl apply -f manifests/service.yaml
```

The Ingress routing `/pingpong` to this service lives in
`log_output/manifests/ingress.yaml`.
