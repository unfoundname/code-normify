---
uid: 8a97207a
id: bili.client.app.shell
parent: bili.client.app
state: planned
tags: [planned, "worker:W-WEB-CORE", leaf]
name: {zh: "全局布局壳", en: "Global layout shell"}
description:
  zh: >
      顶栏、侧栏、搜索入口、通知红点与页脚
  en: >
      Top bar, side navigation, search entry, notification badge and footer
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/app/shell.tsx"
  - path: "apps/web/src/app/nav-model.ts"
  - path: "apps/web/tests/app/shell.test.tsx"
  - path: "apps/web/tests/app/nav-model.test.ts"
apis:
  - protocol: file
    path: "apps/web/src/app/shell.tsx"
    description:
      zh: >
          布局壳入口
      en: >
          Layout shell entry
types:
  - name: "NavModel"
    description: {zh: "导航模型", en: "Navigation model"}
    schema: {"type":"object","description":"导航模型 / Navigation model","additionalProperties":false,"properties":{"sections":{"type":"array","items":{"$ref":"urn:normify:bili.client.app.shell:NavSection"},"description":"字段 sections（语义见对应领域契约） / Field sections"}},"required":["sections"]}
  - name: "NavSection"
    description: {zh: "导航分组", en: "Navigation section"}
    schema: {"type":"object","description":"导航分组 / Navigation section","additionalProperties":false,"properties":{"sectionId":{"type":"string","minLength":1,"description":"字段 sectionId（语义见对应领域契约） / Field sectionId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"entries":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 entries（语义见对应领域契约） / Field entries"}},"required":["sectionId","title","entries"]}
deps:
  - kind: call
    to: bili.message.unread
    label: {zh: "未读红点", en: "Unread badge"}
  - kind: call
    to: bili.client.shared.design
    label: {zh: "布局栅格与组件", en: "Layout grid and components"}
---
