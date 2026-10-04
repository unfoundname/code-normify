---
uid: 16cc8509
id: data.infra.t-de788f2a
parent: data.infra
state: planned
tags: ["worker:infra-gateway", "projection:data-contract"]
name: {zh: "HealthReport", en: "HealthReport"}
description:
  zh: >
      健康报告
  en: >
      Health report
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/infra/t-de788f2a.json"
apis: []
types:
  - name: "HealthReport"
    description: {zh: "健康报告", en: "Health report"}
    schema: {"type":"object","additionalProperties":false,"properties":{"service":{"type":"string","description":"服务名"},"status":{"type":"string","enum":["ok","degraded","down"],"description":"状态"},"dependencies":{"type":"array","description":"依赖状态","items":{"type":"object","additionalProperties":false,"properties":{"name":{"type":"string","description":"依赖名"},"status":{"type":"string","description":"状态"},"latencyMs":{"type":"integer","description":"耗时毫秒","minimum":0}},"required":["name","status"]}},"checkedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["service","status","checkedAt"]}
deps:
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
