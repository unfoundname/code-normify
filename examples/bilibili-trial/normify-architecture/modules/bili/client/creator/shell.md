---
uid: 92a93eb2
id: bili.client.creator.shell
parent: bili.client.creator
state: planned
tags: ["worker:web-studio-shell"]
name: {zh: "创作中心装配", en: "Studio Shell"}
description:
  zh: >
      创作中心路由、UP 主身份守卫与统一数据看板布局。
      
  en: >
      Studio routing, uploader guard and unified dashboard layout.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/studio/src/app/StudioShell.tsx"
  - path: "apps/studio/src/app/routes.tsx"
apis: []
types:
  - name: "StudioRoute"
    description: {zh: "创作中心路由条目", en: "Studio route entry"}
    schema: {"type":"object","additionalProperties":false,"properties":{"path":{"type":"string","description":"路径"},"featureModule":{"type":"string","description":"功能模块 id"},"uploaderOnly":{"type":"boolean","description":"是否仅 UP 主可见"}},"required":["path","featureModule"]}
---
