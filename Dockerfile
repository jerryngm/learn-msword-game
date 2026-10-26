FROM alpine:3.22

ARG PB_VERSION=0.40.6
ARG TARGETARCH
RUN apk add --no-cache ca-certificates unzip \
    && case "${TARGETARCH}" in amd64|arm64) ;; *) echo "Unsupported architecture: ${TARGETARCH}" >&2; exit 1 ;; esac \
    && wget -O /tmp/pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${TARGETARCH}.zip" \
    && unzip /tmp/pocketbase.zip pocketbase -d /pb \
    && rm /tmp/pocketbase.zip

WORKDIR /pb
COPY pb_public/ /pb/pb_public/
COPY pb_migrations/ /pb/pb_migrations/
EXPOSE 8090
CMD ["/pb/pocketbase", "serve", "--http=0.0.0.0:8090"]
