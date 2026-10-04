---
uid: 2c5bb206
id: data.projection.fan-overview
parent: data.projection
state: planned
tags: [planned, "worker:W-CREATOR", "storage:search"]
name: {zh: "粉丝概览投影", en: "Fan overview projection"}
description:
  zh: >
      粉丝增长与活跃分层快照
  en: >
      Fan growth and activity tier snapshots
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/fan_overview.model.sql"
apis:
  - protocol: rpc
    path: "db.table.projection_fan_overview"
    description:
      zh: >
          权威表 projection_fan_overview（唯一业务写入所有者：W-CREATOR；RDS 方言与适配器待定）
      en: >
          Authoritative table projection_fan_overview (sole write owner: W-CREATOR; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/fan_overview.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "FanOverviewRow"
    description: {zh: "粉丝增长与活跃分层快照", en: "Fan growth and activity tier snapshots"}
    schema: {"type":"object","additionalProperties":false,"description":"粉丝增长与活跃分层快照 / Fan growth and activity tier snapshots｜存储归属 SEARCH｜唯一写入所有者 W-CREATOR｜表 projection_fan_overview；主键 PK(id)；唯一约束 UNIQUE(creatorId,snapshotAt)；无二级索引；外键 FK(creatorId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"creatorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"followerCount":{"type":"integer","description":"followerCount 字段 / Field followerCount"},"newFollowers":{"type":"integer","description":"newFollowers 字段 / Field newFollowers"},"activeRate":{"type":"number","description":"activeRate 字段 / Field activeRate"},"regions":{"type":"array","items":{"type":"string"},"description":"regions 字段 / Field regions"},"snapshotAt":{"type":"string","format":"date-time","description":"snapshotAt 字段 / Field snapshotAt"}},"required":["id","creatorId","followerCount","newFollowers","activeRate","regions","snapshotAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "creatorId→user.id，多对一", en: "creatorId->user.id,"}
---
