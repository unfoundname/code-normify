---
uid: 9da98834
id: bili.infra.cache
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "缓存适配", en: "Cache adapter"}
description:
  zh: >
      读写缓存、过期策略、击穿保护与键命名
  en: >
      Read/write cache, expiry policy, stampede protection and key naming
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/platform/cache/src/cache-adapter.ts"
  - path: "services/platform/cache/tests/cache-adapter.test.ts"
apis:
  - protocol: rpc
    path: "cache.get"
    description:
      zh: >
          读取缓存
      en: >
          Read cache
  - protocol: rpc
    path: "cache.set"
    description:
      zh: >
          写入缓存
      en: >
          Write cache
    input: {module: "bili.infra.cache", name: "CacheKeyPolicy"}
types:
  - name: "CacheKeyPolicy"
    description: {zh: "缓存键策略", en: "Cache key policy"}
    schema: {"type":"object","description":"缓存键策略 / Cache key policy","additionalProperties":false,"properties":{"pattern":{"type":"string","minLength":1,"description":"字段 pattern（语义见对应领域契约） / Field pattern"},"ttlSec":{"type":"integer","description":"字段 ttlSec（语义见对应领域契约） / Field ttlSec"},"staleWhileRevalidate":{"type":"boolean","description":"字段 staleWhileRevalidate（语义见对应领域契约） / Field staleWhileRevalidate"}},"required":["pattern","ttlSec","staleWhileRevalidate"]}
deps:
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一键与值契约", en: "Unified key and value"}
---
