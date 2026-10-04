---
uid: cad888d7
id: data.live.streamer-profile
parent: data.live
state: planned
tags: [planned, "worker:W-LIVE", "storage:rds"]
name: {zh: "主播档案", en: "Streamer profile"}
description:
  zh: >
      准入状态、签约与开播权限
  en: >
      Onboarding state, contract and streaming permission
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/live/models/streamer_profile.model.sql"
apis:
  - protocol: rpc
    path: "db.table.live_streamer_profile"
    description:
      zh: >
          权威表 live_streamer_profile（唯一业务写入所有者：W-LIVE；RDS 方言与适配器待定）
      en: >
          Authoritative table live_streamer_profile (sole write owner: W-LIVE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/live/models/streamer_profile.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "StreamerProfileRow"
    description: {zh: "准入状态、签约与开播权限", en: "Onboarding state, contract and streaming permission"}
    schema: {"type":"object","additionalProperties":false,"description":"准入状态、签约与开播权限 / Onboarding state, contract and streaming permission｜存储归属 RDS｜唯一写入所有者 W-LIVE｜表 live_streamer_profile；主键 PK(id)；唯一约束 UNIQUE(userId)；索引 INDEX(status)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"status":{"type":"string","enum":["APPLYING","APPROVED","REJECTED","SUSPENDED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"category":{"type":"string","enum":["GAME","KNOWLEDGE","ENTERTAINMENT","SPORTS","OTHER"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"contractSigned":{"type":"boolean","description":"contractSigned 字段 / Field contractSigned"},"approvedAt":{"type":"string","format":"date-time","description":"approvedAt 字段 / Field approvedAt"}},"required":["id","userId","status","category","contractSigned"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
