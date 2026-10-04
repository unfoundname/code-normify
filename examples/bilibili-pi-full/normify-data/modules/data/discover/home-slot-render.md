---
uid: dfcfb1ba
id: data.discover.home-slot-render
parent: data.discover
state: planned
tags: [planned, "worker:W-DISCOVER", "storage:rds"]
name: {zh: "首页渲染快照", en: "Home render snapshot"}
description:
  zh: >
      首页推荐位的渲染缓存与过期
  en: >
      Rendered home slots cache with expiry
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/home_slot_render.model.sql"
apis:
  - protocol: rpc
    path: "db.table.discover_home_slot_render"
    description:
      zh: >
          权威表 discover_home_slot_render（唯一业务写入所有者：W-DISCOVER；RDS 方言与适配器待定）
      en: >
          Authoritative table discover_home_slot_render (sole write owner: W-DISCOVER; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/home_slot_render.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "HomeSlotRenderRow"
    description: {zh: "首页推荐位的渲染缓存与过期", en: "Rendered home slots cache with expiry"}
    schema: {"type":"object","additionalProperties":false,"description":"首页推荐位的渲染缓存与过期 / Rendered home slots cache with expiry｜存储归属 RDS｜唯一写入所有者 W-DISCOVER｜表 discover_home_slot_render；主键 PK(id)；无唯一约束；索引 INDEX(userId,slotId)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"slotId":{"type":"string","description":"slotId 字段 / Field slotId"},"resourceIdsJson":{"type":"object","additionalProperties":true,"description":"resourceIdsJson 字段 / Field resourceIdsJson"},"expireAt":{"type":"string","format":"date-time","description":"expireAt 字段 / Field expireAt"},"generatedAt":{"type":"string","format":"date-time","description":"generatedAt 字段 / Field generatedAt"}},"required":["id","slotId","resourceIdsJson","expireAt","generatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
