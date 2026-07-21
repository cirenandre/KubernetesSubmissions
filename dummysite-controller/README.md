# dummysite-controller

Exercise 5.1: a `DummySite` custom resource plus a controller for it, written
in Go with [client-go](https://github.com/kubernetes/client-go). Standalone —
doesn't depend on any other exercise/app in this repo.

## What it does

`DummySite` is a namespaced custom resource with one spec field,
`website_url`. The controller watches for `DummySite` objects being created
in the `dummysite` namespace and, for each one, creates:

- a `Deployment` (`dummysite-<name>`) running an `nginx` container that
  serves a copy of `website_url`, fetched by a `curl` init container into a
  shared `emptyDir` — the copy doesn't need to be pixel-perfect (external
  CSS/JS may not load), just the HTML. (Plain busybox `wget` gets blocked
  with a 403 by Cloudflare-fronted sites like `example.com`, so the init
  container uses `curlimages/curl` instead.)
- a `Service` (`dummysite-<name>`, `NodePort`) in front of that Deployment.

Both are created with an `ownerReference` back to the `DummySite`, so
deleting the `DummySite` garbage-collects its Deployment and Service too.

## Files

- `main.go` — the controller. Uses a `dynamic.Interface` to watch
  `dummysites.dwk.cirenandre.com` and a typed `kubernetes.Interface` to
  create the Deployment/Service.
- `manifests/crd.yaml` — the `DummySite` CustomResourceDefinition.
- `manifests/namespace.yaml` — the `dummysite` namespace.
- `manifests/serviceaccount.yaml`, `role.yaml`, `rolebinding.yaml` — RBAC
  letting the controller's ServiceAccount watch `dummysites` and manage
  Deployments/Services, scoped to the `dummysite` namespace only.
- `manifests/deployment.yaml` — runs the controller itself.
- `manifests/example-dummysite.yaml` — a sample `DummySite` pointing at
  `https://example.com/`.

## Running locally (minikube)

Build the image directly into minikube's Docker daemon:

```bash
eval $(minikube docker-env)
docker build -t dummysite-controller:local .
```

Then, in order:

```bash
kubectl apply -f manifests/namespace.yaml
kubectl apply -f manifests/crd.yaml
kubectl apply -f manifests/serviceaccount.yaml
kubectl apply -f manifests/role.yaml
kubectl apply -f manifests/rolebinding.yaml
kubectl apply -f manifests/deployment.yaml
kubectl apply -f manifests/example-dummysite.yaml
```

Check the controller logs and the resources it created:

```bash
kubectl logs -n dummysite deployment/dummysite-controller
kubectl get deployment,service -n dummysite -l app=dummysite-example
```

View the copied site:

```bash
minikube service dummysite-example -n dummysite
```
