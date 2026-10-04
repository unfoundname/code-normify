---
uid: 5bd33425
id: data.publish.t-e2ace4cb
parent: data.publish
state: planned
tags: ["worker:pub-upload", "projection:data-contract"]
name: {zh: "UploadPartRequest", en: "UploadPartRequest"}
description:
  zh: >
      分片登记请求
  en: >
      Part registration
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/publish/t-e2ace4cb.json"
apis: []
types:
  - name: "UploadPartRequest"
    description: {zh: "分片登记请求", en: "Part registration"}
    schema: {"type":"object","additionalProperties":false,"properties":{"uploadId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"partNumber":{"type":"integer","description":"分片序号","minimum":1},"sizeBytes":{"type":"integer","description":"字节数","minimum":1},"etag":{"type":"string","description":"OSS 返回的 ETag"},"checksumSha256":{"type":"string","description":"分片校验和"}},"required":["uploadId","partNumber","sizeBytes","etag"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
---
