# todo-app

The course project, started in exercise 1.2 of the DevOps with Kubernetes
course. Will grow into a todo application over the course.

Currently a web server that:

- Logs `Server started in port NNNN` on startup.
- Responds to `GET /` with a simple HTML page.
- The port is configurable via the `PORT` environment variable (defaults to
  `3000`).

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
docker build -t todo-app .
docker run --rm -p 3000:3000 todo-app
```

## Deploying to Kubernetes

```bash
docker build -t todo-app:latest .
minikube image load todo-app:latest
kubectl apply -f manifests/deployment.yaml
```
