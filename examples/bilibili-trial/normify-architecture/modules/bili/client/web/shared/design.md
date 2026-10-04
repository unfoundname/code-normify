---
uid: a1897bc5
id: bili.client.web.shared.design
parent: bili.client.web.shared
state: planned
tags: ["worker:web-shell"]
name: {zh: "设计系统组件", en: "Design System"}
description:
  zh: >
      基础组件、布局原语、图标与主题令牌；不含领域语义。
      
  en: >
      Primitives, layout, icons and theme tokens without domain semantics.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/shared/ui/index.ts"
  - path: "apps/web/src/shared/ui/theme.css"
  - path: "apps/web/tests/ui.test.tsx"
apis: []
types:
  - name: "ThemeToken"
    description: {zh: "主题令牌", en: "Theme token"}
    schema: {"type":"object","additionalProperties":false,"properties":{"name":{"type":"string","description":"令牌名"},"value":{"type":"string","description":"值"},"category":{"type":"string","enum":["color","spacing","radius","typography","shadow","zIndex"],"description":"类别"}},"required":["name","value","category"]}
---
