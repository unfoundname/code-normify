---
uid: 13fda91a
id: bili.client.shared.design
parent: bili.client.shared
state: planned
tags: [planned, "worker:W-CONTRACT", leaf]
name: {zh: "设计系统与组件库", en: "Design system and components"}
description:
  zh: >
      基础组件、设计令牌、主题与无障碍基线
  en: >
      Base components, design tokens, themes and accessibility baseline
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/shared/design/index.ts"
  - path: "apps/web/src/shared/design/tokens.ts"
  - path: "apps/web/tests/shared/design/index.test.ts"
  - path: "apps/web/tests/shared/design/tokens.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/design-system"
    description:
      zh: >
          设计系统预览路由
      en: >
          Design system preview route
types:
  - name: "ThemeTokens"
    description: {zh: "主题令牌", en: "Theme tokens"}
    schema: {"type":"object","description":"主题令牌 / Theme tokens","additionalProperties":false,"properties":{"colorScheme":{"type":"string","enum":["light","dark","system"],"description":"字段 colorScheme（语义见对应领域契约） / Field colorScheme"},"radiusScale":{"type":"number","description":"字段 radiusScale（语义见对应领域契约） / Field radiusScale"},"fontScale":{"type":"number","description":"字段 fontScale（语义见对应领域契约） / Field fontScale"}},"required":["colorScheme","radiusScale","fontScale"]}
---
