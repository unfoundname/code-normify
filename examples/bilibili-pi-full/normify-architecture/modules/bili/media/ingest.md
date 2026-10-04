---
uid: 214a87ae
id: bili.media.ingest
parent: bili.media
state: planned
tags: [planned, "worker:W-MEDIA", leaf]
name: {zh: "分片上传与断点续传", en: "Chunked upload and resume"}
description:
  zh: >
      分片会话、断点续传、合并与完整性校验
  en: >
      Chunk sessions, resume, merge and integrity verification
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/ingest/src/upload-session.ts"
  - path: "services/media/ingest/tests/upload-session.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/media/upload-sessions"
    description:
      zh: >
          初始化分片上传
      en: >
          Init a chunked upload
    input: {module: "bili.media.ingest", name: "InitUploadRequest"}
    output: {module: "bili.media.ingest", name: "UploadSession"}
  - protocol: http
    method: POST
    path: "/api/v1/media/upload-sessions/parts"
    description:
      zh: >
          上报分片并续传
      en: >
          Report a part and resume
    input: {module: "bili.media.ingest", name: "UploadRequest"}
    output: {module: "bili.media.ingest", name: "UploadSession"}
  - protocol: http
    method: POST
    path: "/api/v1/media/upload-sessions/completion"
    description:
      zh: >
          合并分片并登记原件
      en: >
          Complete and register the original
    input: {module: "bili.media.ingest", name: "CompleteUploadRequest"}
    output: {module: "bili.media.asset", name: "MediaAssetView"}
types:
  - name: "UploadSession"
    description: {zh: "上传会话", en: "Upload session"}
    schema: {"type":"object","description":"上传会话 / Upload session","additionalProperties":false,"properties":{"sessionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"会话 ID / Session id"},"ownerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"所有者用户 ID / Owner user id"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"uploadedParts":{"type":"array","items":{"type":"integer"},"description":"字段 uploadedParts（语义见对应领域契约） / Field uploadedParts"},"partCount":{"type":"integer","description":"字段 partCount（语义见对应领域契约） / Field partCount"},"sha256":{"type":"string","minLength":1,"description":"内容 SHA-256 / Content sha-256"},"expireAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"过期时间 / Expire time"},"status":{"type":"string","enum":["OPEN","COMPLETED","ABORTED","EXPIRED"],"description":"状态 / Status"}},"required":["sessionId","ownerId","assetId","uploadedParts","partCount","expireAt","status"]}
  - name: "InitUploadRequest"
    description: {zh: "初始化上传请求", en: "Init upload request"}
    schema: {"type":"object","description":"初始化上传请求 / Init upload request","additionalProperties":false,"properties":{"fileName":{"type":"string","minLength":1,"description":"字段 fileName（语义见对应领域契约） / Field fileName"},"sizeBytes":{"type":"integer","description":"对象字节数 / Object size in bytes"},"sha256":{"type":"string","minLength":1,"description":"内容 SHA-256 / Content sha-256"},"mimeType":{"type":"string","minLength":1,"description":"MIME 类型 / Mime type"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["fileName","sizeBytes","sha256","mimeType","idempotencyKey","requestContext"]}
  - name: "CompleteUploadRequest"
    description: {zh: "完成分片上传请求", en: "Complete upload request"}
    schema: {"type":"object","description":"完成分片上传请求 / Complete upload request","additionalProperties":false,"properties":{"sessionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"会话 ID / Session id"},"sha256":{"type":"string","minLength":1,"description":"内容 SHA-256 / Content sha-256"},"partCount":{"type":"integer","description":"字段 partCount（语义见对应领域契约） / Field partCount"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["sessionId","sha256","partCount","idempotencyKey","requestContext"]}
  - name: "UploadRequest"
    description: {zh: "上传会话写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Upload session write request carrying only client-provided fields"}
    schema: {"type":"object","description":"上传会话写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Upload session write request carrying only client-provided fields","additionalProperties":false,"properties":{"sessionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"会话 ID / Session id"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"uploadedParts":{"type":"array","items":{"type":"integer"},"description":"字段 uploadedParts（语义见对应领域契约） / Field uploadedParts"},"partCount":{"type":"integer","description":"字段 partCount（语义见对应领域契约） / Field partCount"},"sha256":{"type":"string","minLength":1,"description":"内容 SHA-256 / Content sha-256"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["sessionId","assetId","uploadedParts","partCount","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.media.storage
    label: {zh: "申请分片票据与对象键", en: "Request multipart ticket and"}
  - kind: call
    to: bili.media.probe
    label: {zh: "合并后触发探测", en: "Trigger probing after merge"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
