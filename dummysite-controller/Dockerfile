FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY main.go ./
RUN CGO_ENABLED=0 go build -o dummysite-controller .

FROM alpine:3.20
RUN adduser -D -u 1000 controller
USER controller
COPY --from=build /app/dummysite-controller /usr/local/bin/dummysite-controller
ENTRYPOINT ["dummysite-controller"]
