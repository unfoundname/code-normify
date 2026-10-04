---
uid: a4975782
id: bili.client.app.bootstrap
parent: bili.client.app
state: planned
tags: [planned, "worker:W-WEB-CORE", leaf]
name: {zh: "应用启动", en: "App bootstrap"}
description:
  zh: >
      挂载、错误边界、首屏预算与运行时配置注入
  en: >
      Mounting, error boundary, first-paint budget and runtime configuration injection
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/main.tsx"
  - path: "apps/web/src/runtime-config.ts"
  - path: "apps/web/tests/main.test.tsx"
  - path: "apps/web/tests/runtime-config.test.ts"
apis:
  - protocol: file
    path: "apps/web/src/main.tsx"
    description:
      zh: >
          应用启动入口
      en: >
          App bootstrap entry
types:
  - name: "RuntimeConfig"
    description: {zh: "运行时配置", en: "Runtime config"}
    schema: {"type":"object","description":"运行时配置 / Runtime config","additionalProperties":false,"properties":{"apiBaseUrl":{"type":"string","minLength":1,"format":"uri","description":"字段 apiBaseUrl（语义见对应领域契约） / Field apiBaseUrl"},"locale":{"type":"string","enum":["zh-CN","en-US"],"description":"字段 locale（语义见对应领域契约） / Field locale"},"featureFlags":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 featureFlags（语义见对应领域契约） / Field featureFlags"}},"required":["apiBaseUrl","locale","featureFlags"]}
deps:
  - kind: call
    to: bili.client.app.providers
    label: {zh: "装载全局 Provider", en: "Mount global providers"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
