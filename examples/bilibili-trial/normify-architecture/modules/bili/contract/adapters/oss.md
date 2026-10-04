---
uid: d308a230
id: bili.contract.adapters.oss
parent: bili.contract.adapters
state: planned
tags: ["worker:contract-adapters"]
name: {zh: "对象存储适配器", en: "OSS Adapter"}
description:
  zh: >
      对象写入/签名地址/生命周期/直传会话接口；bucket 与连接参数待配置。
      
  en: >
      Object put, signed url, lifecycle and direct-upload session interfaces; bucket params pending.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/adapters/src/oss/index.ts"
apis: []
types:
  - name: "ObjectPutRequest"
    description: {zh: "对象写入请求", en: "Object put request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"bucketPurpose":{"type":"string","enum":["media-origin","media-transcoded","cover","subtitle","live-record","attachment","export"],"description":"逻辑 bucket 用途"},"key":{"type":"string","description":"对象键"},"contentType":{"type":"string","description":"MIME 类型"},"sizeBytes":{"type":"integer","description":"字节数","minimum":0},"checksumSha256":{"type":"string","description":"SHA-256"},"storageClass":{"type":"string","enum":["standard","infrequent","archive"],"description":"存储级别"}},"required":["bucketPurpose","key","contentType","sizeBytes"]}
  - name: "SignedUrlRequest"
    description: {zh: "签名地址请求", en: "Signed url request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"key":{"type":"string","description":"对象键"},"method":{"type":"string","enum":["GET","PUT"],"description":"HTTP 方法"},"expiresInSeconds":{"type":"integer","description":"有效秒数","minimum":30,"maximum":86400},"ipBound":{"type":"boolean","description":"绑定来源 IP"},"responseDisposition":{"type":"string","description":"下载文件名策略"}},"required":["key","method","expiresInSeconds"]}
  - name: "UploadSession"
    description: {zh: "分片直传会话", en: "Multipart upload session"}
    schema: {"type":"object","additionalProperties":false,"description":"断点续传依据已上传分片列表恢复","properties":{"uploadId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"key":{"type":"string","description":"对象键"},"partSizeBytes":{"type":"integer","description":"分片大小","minimum":1048576},"partUrls":{"type":"array","description":"分片签名地址","items":{"type":"object","additionalProperties":false,"properties":{"partNumber":{"type":"integer","description":"分片序号","minimum":1},"url":{"type":"string","description":"签名地址"}},"required":["partNumber","url"]}},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"uploadedParts":{"type":"array","description":"已上传分片号","items":{"type":"integer","description":"分片号","minimum":1}}},"required":["uploadId","key","partSizeBytes","expiresAt"]}
  - name: "BucketBinding"
    description: {zh: "Bucket 绑定（待配置）", en: "Bucket binding (pending)"}
    schema: {"type":"object","additionalProperties":false,"description":"当前 state=planned，未访问真实 OSS","properties":{"purpose":{"type":"string","description":"逻辑用途"},"bucketName":{"type":"string","description":"bucket 名称，待用户提供"},"region":{"type":"string","description":"地域，待确认"},"endpoint":{"type":"string","description":"访问端点，待确认"},"lifecycleRule":{"type":"string","description":"生命周期规则"},"configured":{"type":"boolean","description":"是否已完成连接参数配置"}},"required":["purpose","configured"]}
---
