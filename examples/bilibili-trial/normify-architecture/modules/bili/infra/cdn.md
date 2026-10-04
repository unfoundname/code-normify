---
uid: 28f539b6
id: bili.infra.cdn
parent: bili.infra
state: planned
tags: ["worker:infra-cdn"]
name: {zh: "CDN 与回源", en: "CDN and Origin"}
description:
  zh: >
      CDN 未提供：定义回源策略、签名播放地址与刷新，播放授权票据到期后由 CDN 校验签名。
      
  en: >
      CDN not provided: origin policy, signed playback urls, purge; signature enforced at edge.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/cdn/src/policy.ts"
  - path: "services/cdn/src/purge.ts"
apis:
  - protocol: http
    method: POST
    path: "/internal/cdn/purge"
    description:
      zh: >
          提交换刷
          
      en: >
          Submit purge
          
    input: {module: "bili.infra.cdn", name: "CdnPurgeRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
types:
  - name: "CdnOriginPolicy"
    description: {zh: "回源策略", en: "Origin policy"}
    schema: {"type":"object","additionalProperties":false,"properties":{"assetClass":{"type":"string","enum":["video_segment","cover","subtitle","live_hls","static_asset"],"description":"资源类别"},"origin":{"type":"string","description":"回源地址（服务器上自建或对象存储）"},"cacheTtlSeconds":{"type":"integer","description":"边缘缓存秒数","minimum":0},"signedRequired":{"type":"boolean","description":"是否强制签名"},"hotlinkProtection":{"type":"string","enum":["referer","token","none"],"description":"防盗链"}},"required":["assetClass","origin","cacheTtlSeconds","signedRequired"]}
  - name: "CdnPurgeRequest"
    description: {zh: "刷新请求", en: "Purge request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"assetClass":{"type":"string","description":"资源类别"},"paths":{"type":"array","description":"刷新路径","items":{"type":"string","description":"路径"}},"reason":{"type":"string","description":"原因（下架/替换）"},"requestedBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"requestedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["paths","reason","requestedBy"]}
deps:
  - kind: reference
    to: bili.contract.adapters.oss
    label: {zh: "回源对象来自 OSS", en: "Origin objects from OSS"}
  - kind: reference
    to: bili.contract.adapters.capabilities
    label: {zh: "CDN 待接入", en: "CDN is pending capability"}
---
