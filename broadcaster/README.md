# broadcaster

Exercise 4.6 of the DevOps with Kubernetes course.

Subscribes to NATS todo events (published by `todo-backend` whenever a todo
is created or marked done) and forwards them to an external chat service.

Uses a NATS **queue group** subscription (`NATS_QUEUE_GROUP`, default
`broadcaster`): when scaled to multiple replicas, NATS delivers each message
to exactly one replica in the group, so scaling never causes duplicate
messages. A message can occasionally be missed (e.g. if the only connected
replica is mid-restart), which is acceptable per the exercise; a duplicate
is not.

Forwards messages to a generic webhook as:

```json
{
  "user": "bot",
  "message": "A todo was created: Learn Kubernetes basics"
}
```

## Environment variables

- `PORT` (default `3000`)
- `NATS_URL` (default `nats://nats-svc:4222`)
- `NATS_SUBJECT` (default `todos`)
- `NATS_QUEUE_GROUP` (default `broadcaster`)
- `WEBHOOK_URL` — the external service URL to POST messages to

## Running

```bash
npm install
NATS_URL=nats://localhost:4222 WEBHOOK_URL=https://webhook.site/your-id node app.js
```

## Running with Docker

```bash
docker build -t broadcaster .
docker run --rm -p 3000:3000 -e NATS_URL=nats://host.docker.internal:4222 -e WEBHOOK_URL=... broadcaster
```
