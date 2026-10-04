---
uid: 2f77c72f
id: data.contract.t-7d26cab4
parent: data.contract
state: planned
tags: ["worker:contract-adapters", "projection:data-contract"]
name: {zh: "UploadSession", en: "UploadSession"}
description:
  zh: >
      分片直传会话
  en: >
      Multipart upload session
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-7d26cab4.json"
apis: []
types:
  - name: "UploadSession"
    description: {zh: "分片直传会话", en: "Multipart upload session"}
    schema: {"type":"object","additionalProperties":false,"description":"断点续传依据已上传分片列表恢复","properties":{"uploadId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"key":{"type":"string","description":"对象键"},"partSizeBytes":{"type":"integer","description":"分片大小","minimum":1048576},"partUrls":{"type":"array","description":"分片签名地址","items":{"type":"object","additionalProperties":false,"properties":{"partNumber":{"type":"integer","description":"分片序号","minimum":1},"url":{"type":"string","description":"签名地址"}},"required":["partNumber","url"]}},"expiresAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"uploadedParts":{"type":"array","description":"已上传分片号","items":{"type":"integer","description":"分片号","minimum":1}}},"required":["uploadId","key","partSizeBytes","expiresAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
