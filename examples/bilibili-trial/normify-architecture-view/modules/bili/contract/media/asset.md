---
uid: b2e6db89
id: bili.contract.media.asset
parent: bili.contract.media
state: planned
tags: ["worker:contract-media"]
name: {zh: "媒体资产契约", en: "Media Asset Contract"}
description:
  zh: >
      媒体原件（OSS 对象）元数据与探测结果；资产只描述对象，不含业务发布状态。
      
  en: >
      Media asset metadata and probe result for OSS objects.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/contracts/src/media/asset.ts"
apis: []
types:
  - name: "MediaKind"
    description: {zh: "媒体种类", en: "Media kind"}
    schema: {"type":"string","enum":["video","audio","image","subtitle","live_record","document"],"description":"媒体对象种类"}
  - name: "MediaAsset"
    description: {zh: "媒体原件资产", en: "Media asset"}
    schema: {"type":"object","additionalProperties":false,"description":"与 Video 业务对象分离：发布状态不写在本记录上","properties":{"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"kind":{"$ref":"urn:normify:bili.contract.media.asset:MediaKind"},"ossBucket":{"type":"string","description":"OSS bucket 逻辑名"},"ossKey":{"type":"string","description":"OSS 对象键"},"sizeBytes":{"type":"integer","description":"对象字节数","minimum":0},"checksumSha256":{"type":"string","description":"内容 SHA-256","pattern":"^[a-f0-9]{64}$"},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"width":{"type":"integer","description":"像素宽","minimum":0},"height":{"type":"integer","description":"像素高","minimum":0},"ownerModule":{"type":"string","description":"唯一写入所有者模块 id"},"sourceId":{"type":"string","description":"内容获取来源 id（导入时）"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["assetId","kind","ossBucket","ossKey","sizeBytes","checksumSha256","ownerModule"]}
  - name: "MediaProbe"
    description: {zh: "媒体探测结果", en: "Media probe result"}
    schema: {"type":"object","additionalProperties":false,"properties":{"assetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"containerFormat":{"type":"string","description":"封装格式"},"videoCodec":{"type":"string","description":"视频编码"},"audioCodec":{"type":"string","description":"音频编码"},"bitrateKbps":{"type":"integer","description":"总码率","minimum":0},"frameRateMilli":{"type":"integer","description":"帧率 ×1000","minimum":0},"loudnessLufsCenti":{"type":"integer","description":"响度 ×100","minimum":-10000,"maximum":0},"probedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["assetId","containerFormat","probedAt"]}
---
