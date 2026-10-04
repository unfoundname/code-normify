---
uid: bfed1be1
id: bili.publish.upload
parent: bili.publish
state: planned
tags: ["worker:pub-upload"]
name: {zh: "分片与断点上传", en: "Chunked and Resumable Upload"}
description:
  zh: >
      初始化上传会话、分片直传 OSS、断点续传位置、合并完成与校验和比对；大文件不经过应用内存。
      
  en: >
      Init upload session, direct-to-OSS parts, resume offset, complete merge and checksum verification.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/publish/upload/src/service.ts"
  - path: "services/publish/upload/src/resume.ts"
  - path: "services/publish/upload/migrations/0001_upload.sql"
  - path: "services/publish/upload/tests/upload.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/uploads"
    description:
      zh: >
          初始化上传会话
          
      en: >
          Init upload session
          
    input: {module: "bili.publish.upload", name: "UploadTicket"}
    output: {module: "bili.publish.upload", name: "UploadTicket"}
  - protocol: http
    method: GET
    path: "/api/v1/uploads/{id}"
    description:
      zh: >
          读取断点续传状态
          
      en: >
          Get resume state
          
    output: {module: "bili.publish.upload", name: "UploadResumeState"}
  - protocol: http
    method: POST
    path: "/api/v1/uploads/{id}/parts"
    description:
      zh: >
          登记已完成分片
          
      en: >
          Register uploaded part
          
    input: {module: "bili.publish.upload", name: "UploadPartRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/uploads/{id}/complete"
    description:
      zh: >
          完成合并并登记原件
          
      en: >
          Complete upload
          
    input: {module: "bili.publish.upload", name: "UploadCompleteRequest"}
    output: {module: "bili.contract.media.asset", name: "MediaAsset"}
  - protocol: mysql
    path: "upload_session"
    description:
      zh: >
          上传会话表（唯一写入所有者：上传服务）
          
      en: >
          upload_session table
          
types:
  - name: "UploadTicket"
    description: {zh: "上传会话", en: "Upload session"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 upload_session；分片数据只存在 OSS","properties":{"uploadId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ossKey":{"type":"string","description":"目标对象键"},"partSizeBytes":{"type":"integer","description":"分片大小","minimum":1048576},"checksumSha256":{"type":"string","description":"整文件校验和（可选）"},"state":{"type":"string","enum":["created","uploading","assembling","completed","aborted","expired"],"description":"状态"},"uploadedParts":{"type":"array","description":"已完成分片号","items":{"type":"integer","description":"分片号","minimum":1}},"bytesReceived":{"type":"integer","description":"已接收字节","minimum":0},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["uploadId","ownerId","ossKey","partSizeBytes","state","expiresAt"]}
  - name: "UploadPartRequest"
    description: {zh: "分片登记请求", en: "Part registration"}
    schema: {"type":"object","additionalProperties":false,"properties":{"uploadId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"partNumber":{"type":"integer","description":"分片序号","minimum":1},"sizeBytes":{"type":"integer","description":"字节数","minimum":1},"etag":{"type":"string","description":"OSS 返回的 ETag"},"checksumSha256":{"type":"string","description":"分片校验和"}},"required":["uploadId","partNumber","sizeBytes","etag"]}
  - name: "UploadCompleteRequest"
    description: {zh: "完成上传请求", en: "Complete upload"}
    schema: {"type":"object","additionalProperties":false,"properties":{"uploadId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"parts":{"type":"array","description":"分片列表","items":{"$ref":"urn:normify:bili.publish.upload:UploadPartRequest"},"minItems":1},"declaredSizeBytes":{"type":"integer","description":"声明总字节数","minimum":1},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["uploadId","parts","idempotencyKey"]}
  - name: "UploadResumeState"
    description: {zh: "断点续传状态", en: "Resume state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"uploadId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"nextOffsetBytes":{"type":"integer","description":"下一分片起始字节","minimum":0},"missingParts":{"type":"array","description":"缺失分片号","items":{"type":"integer","description":"分片号","minimum":1}},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["uploadId","nextOffsetBytes","missingParts"]}
deps:
  - kind: call
    to: bili.contract.adapters.oss
    from_api: "POST /api/v1/uploads"
    label: {zh: "获取分片签名地址", en: "Get part signed urls"}
  - kind: call
    to: bili.media.asset
    from_api: "POST /api/v1/uploads/{id}/complete"
    to_api: "POST /api/v1/media/assets"
    label: {zh: "完成后登记媒体原件", en: "Register asset on complete"}
  - kind: call
    to: bili.contract.adapters.rds
    label: {zh: "分片进度与幂等写在同一事务", en: "Persist part progress in trans"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "上传完成事件触发处理", en: "Upload completed event"}
---
