FROM alpine:3.20 AS downloader

ARG POCKETBASE_VERSION=0.22.15
ARG POCKETBASE_ARCHIVE=linux_amd64

RUN apk add --no-cache curl unzip ca-certificates \
  && mkdir -p /tmp/pocketbase \
  && curl -L -o /tmp/pocketbase/pocketbase.zip "https://github.com/pocketbase/pocketbase/releases/download/v${POCKETBASE_VERSION}/pocketbase_${POCKETBASE_VERSION}_${POCKETBASE_ARCHIVE}.zip" \
  && unzip /tmp/pocketbase/pocketbase.zip -d /tmp/pocketbase \
  && chmod +x /tmp/pocketbase/pocketbase

FROM alpine:3.20

RUN addgroup -S pocketbase && adduser -S pocketbase -G pocketbase

COPY --from=downloader /tmp/pocketbase/pocketbase /pb/pocketbase

WORKDIR /pb

RUN mkdir -p /pb/pb_data /pb/pb_public /pb/pb_migrations && \
  chown -R pocketbase:pocketbase /pb

USER pocketbase

EXPOSE 8090

ENTRYPOINT ["./pocketbase"]
CMD ["serve", "--http=0.0.0.0:8090"]
