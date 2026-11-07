FROM golang:1.22-alpine AS b
WORKDIR /s
COPY . .
RUN go mod tidy && CGO_ENABLED=0 go build -o /api .
FROM alpine
COPY --from=b /api /api
CMD ["/api"]
