---
uid: b7bc5b27
id: bili.infra.cache
parent: bili.infra
state: planned
tags: ["worker:infra-cache"]
name: {zh: "缓存接入", en: "Cache Adapter"}
description:
  zh: >
      Redis 未在资源清单内：登记为待接入适配器，进程内 LRU 为临时实现，禁用静默降级。
      
  en: >
      Redis not user-provided: registered as pending adapter; in-process LRU is the interim implementation.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/cache/src/index.ts"
  - path: "services/cache/src/invalidation.ts"
apis:
  - protocol: redis
    path: "cache:{namespace}:{key}"
    description:
      zh: >
          缓存读写
          
      en: >
          Cache read/write
          
    output: {module: "bili.infra.cache", name: "CacheEntry"}
types:
  - name: "CacheEntry"
    description: {zh: "缓存条目", en: "Cache entry"}
    schema: {"type":"object","additionalProperties":false,"description":"缓存不是权威数据源","properties":{"key":{"type":"string","description":"缓存键"},"namespace":{"type":"string","description":"命名空间"},"ttlSeconds":{"type":"integer","description":"存活秒数","minimum":1},"valueJson":{"type":"string","description":"序列化值"},"sourceOfTruth":{"type":"string","description":"权威模块 id"},"invalidatedBy":{"type":"array","description":"失效事件","items":{"type":"string","description":"事件类型"}}},"required":["key","namespace","ttlSeconds","sourceOfTruth"]}
  - name: "CacheInvalidationRule"
    description: {zh: "失效规则", en: "Invalidation rule"}
    schema: {"type":"object","additionalProperties":false,"properties":{"namespace":{"type":"string","description":"命名空间"},"onEvent":{"type":"string","description":"触发事件类型"},"keyPattern":{"type":"string","description":"键模式"},"strategy":{"type":"string","enum":["delete","write_through","soft_ttl"],"description":"失效策略"}},"required":["namespace","onEvent","keyPattern","strategy"]}
deps:
  - kind: reference
    to: bili.contract.adapters.capabilities
    label: {zh: "登记缓存能力状态", en: "Cache capability registry"}
---
