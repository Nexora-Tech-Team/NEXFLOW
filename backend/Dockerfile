FROM golang:1.21-alpine AS builder

RUN apk add --no-cache git gcc musl-dev ca-certificates

ENV GOPROXY=https://proxy.golang.org,direct
ENV GONOSUMDB=*
ENV GOFLAGS=-mod=mod
ENV CGO_ENABLED=0

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN go build -o main .

FROM alpine:3.18
RUN apk --no-cache add ca-certificates tzdata
WORKDIR /app

COPY --from=builder /app/main .

RUN mkdir -p /app/uploads

EXPOSE 8080
CMD ["./main"]
