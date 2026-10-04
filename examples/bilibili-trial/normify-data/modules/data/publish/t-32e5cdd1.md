---
uid: 635bdfd2
id: data.publish.t-32e5cdd1
parent: data.publish
state: planned
tags: ["worker:pub-upload", "projection:data-contract"]
name: {zh: "UploadTicket", en: "UploadTicket"}
description:
  zh: >
      上传会话
  en: >
      Upload session
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/publish/t-32e5cdd1.json"
apis: []
types:
  - name: "UploadTicket"
    description: {zh: "上传会话", en: "Upload session"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 upload_session；分片数据只存在 OSS","properties":{"uploadId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"ownerId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"ossKey":{"type":"string","description":"目标对象键"},"partSizeBytes":{"type":"integer","description":"分片大小","minimum":1048576},"checksumSha256":{"type":"string","description":"整文件校验和（可选）"},"state":{"type":"string","enum":["created","uploading","assembling","completed","aborted","expired"],"description":"状态"},"uploadedParts":{"type":"array","description":"已完成分片号","items":{"type":"integer","description":"分片号","minimum":1}},"bytesReceived":{"type":"integer","description":"已接收字节","minimum":0},"expiresAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["uploadId","ownerId","ossKey","partSizeBytes","state","expiresAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
