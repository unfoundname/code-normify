---
uid: 54dc22bd
id: bili.media.storage
parent: bili.media
state: planned
tags: [planned, "worker:W-MEDIA", leaf]
name: {zh: "OSS 存储适配", en: "OSS storage adapter"}
description:
  zh: >
      对象键规划、分片上传票据、签名 URL 与生命周期策略
  en: >
      Object key planning, multipart tickets, signed urls and lifecycle policy
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/media/storage/src/oss-adapter.ts"
  - path: "services/media/storage/tests/oss-adapter.test.ts"
apis:
  - protocol: rpc
    path: "media.storage.put-object"
    description:
      zh: >
          写入对象
      en: >
          Put an object
    input: {module: "bili.media.storage", name: "ObjectRef"}
    output: {module: "bili.media.storage", name: "ObjectRef"}
  - protocol: rpc
    path: "media.storage.sign-url"
    description:
      zh: >
          签发只读地址
      en: >
          Sign a read url
    input: {module: "bili.media.storage", name: "ObjectRef"}
types:
  - name: "ObjectRef"
    description: {zh: "对象引用", en: "Object reference"}
    schema: {"type":"object","description":"对象引用 / Object reference","additionalProperties":false,"properties":{"bucket":{"type":"string","minLength":1,"description":"OSS bucket 名 / OSS bucket name"},"objectKey":{"type":"string","minLength":1,"description":"OSS 对象键 / OSS object key"},"sizeBytes":{"type":"integer","description":"对象字节数 / Object size in bytes"},"etag":{"type":"string","minLength":1,"description":"对象 ETag / Object etag"}},"required":["bucket","objectKey"]}
  - name: "MultipartTicket"
    description: {zh: "分片上传票据", en: "Multipart ticket"}
    schema: {"type":"object","description":"分片上传票据 / Multipart ticket","additionalProperties":false,"properties":{"uploadId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 uploadId（语义见对应领域契约） / Field uploadId"},"objectKey":{"type":"string","minLength":1,"description":"OSS 对象键 / OSS object key"},"partSize":{"type":"integer","description":"字段 partSize（语义见对应领域契约） / Field partSize"},"expireAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"过期时间 / Expire time"},"partUrls":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 partUrls（语义见对应领域契约） / Field partUrls"}},"required":["uploadId","objectKey","partSize","expireAt","partUrls"]}
deps:
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一对象标识", en: "Unified object identity"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
---
