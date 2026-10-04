---
uid: 1f5d27c6
id: bili.client.app.providers
parent: bili.client.app
state: planned
tags: [planned, "worker:W-WEB-CORE", leaf]
name: {zh: "全局 Provider", en: "Global providers"}
description:
  zh: >
      查询缓存、鉴权态、主题、播放器上下文与错误上报
  en: >
      Query cache, auth state, theme, player context and error reporting
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/app/providers.tsx"
  - path: "apps/web/tests/app/providers.test.tsx"
apis:
  - protocol: file
    path: "apps/web/src/app/providers.tsx"
    description:
      zh: >
          Provider 装配入口
      en: >
          Provider assembly entry
types:
  - name: "AppProvidersProps"
    description: {zh: "Provider 属性", en: "App providers props"}
    schema: {"type":"object","description":"Provider 属性 / App providers props","additionalProperties":false,"properties":{"children":{"type":"string","minLength":1,"description":"字段 children（语义见对应领域契约） / Field children"},"initialAuthState":{"type":"string","minLength":1,"description":"字段 initialAuthState（语义见对应领域契约） / Field initialAuthState"},"themeTokens":{"type":"string","minLength":1,"description":"字段 themeTokens（语义见对应领域契约） / Field themeTokens"}},"required":["children"]}
deps:
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
