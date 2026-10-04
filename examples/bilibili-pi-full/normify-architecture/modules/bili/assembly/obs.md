---
uid: 684d233c
id: bili.assembly.obs
parent: bili.assembly
state: planned
tags: [planned, "worker:W-ASSEMBLY", leaf]
name: {zh: "可观测装配", en: "Observability wiring"}
description:
  zh: >
      日志、指标、追踪 SDK 的统一接入与采样策略
  en: >
      Unified logging, metrics and tracing SDK wiring with sampling policy
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/api/src/observability.ts"
  - path: "apps/api/tests/observability.test.ts"
apis:
  - protocol: file
    path: "apps/api/src/observability.ts"
    description:
      zh: >
          可观测装配入口
      en: >
          Observability wiring entry
types:
  - name: "ObservabilityOptions"
    description: {zh: "可观测参数", en: "Observability options"}
    schema: {"type":"object","description":"可观测参数 / Observability options","additionalProperties":false,"properties":{"serviceName":{"type":"string","minLength":1,"description":"字段 serviceName（语义见对应领域契约） / Field serviceName"},"sampleRate":{"type":"number","description":"字段 sampleRate（语义见对应领域契约） / Field sampleRate"},"logLevel":{"type":"string","enum":["debug","info","warn","error"],"description":"字段 logLevel（语义见对应领域契约） / Field logLevel"}},"required":["serviceName","sampleRate","logLevel"]}
deps:
  - kind: call
    to: bili.infra.observe
    label: {zh: "上报指标与日志", en: "Report metrics and logs"}
---
