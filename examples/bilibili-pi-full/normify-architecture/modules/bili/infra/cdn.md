---
uid: 6b2febad
id: bili.infra.cdn
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "CDN 接入", en: "CDN integration"}
description:
  zh: >
      签名地址、防盗链、刷新预热与回源策略
  en: >
      Signed urls, anti-leech, purge and preload, origin policies
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/platform/cdn/src/cdn.ts"
  - path: "services/platform/cdn/tests/cdn.test.ts"
apis:
  - protocol: rpc
    path: "cdn.sign-url"
    description:
      zh: >
          签发 CDN 地址
      en: >
          Sign a CDN url
    input: {module: "bili.infra.cdn", name: "SignedUrlRequest"}
  - protocol: rpc
    path: "cdn.purge"
    description:
      zh: >
          刷新缓存
      en: >
          Purge CDN cache
types:
  - name: "SignedUrlRequest"
    description: {zh: "签名地址请求", en: "Signed url request"}
    schema: {"type":"object","description":"签名地址请求 / Signed url request","additionalProperties":false,"properties":{"objectKey":{"type":"string","minLength":1,"description":"OSS 对象键 / OSS object key"},"expiresInSec":{"type":"integer","description":"有效期（秒） / Ttl in seconds"},"clientIp":{"type":"string","minLength":1,"description":"字段 clientIp（语义见对应领域契约） / Field clientIp"}},"required":["objectKey","expiresInSec"]}
deps:
  - kind: call
    to: bili.media.storage
    label: {zh: "回源对象存储", en: "Origin fetch from object"}
---
