---
uid: ae966e2c
id: data.content.publish-schedule
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "发布排期", en: "Publish schedule"}
description:
  zh: >
      预约发布的时间与状态
  en: >
      Scheduled publish time and state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/publish_schedule.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_publish_schedule"
    description:
      zh: >
          权威表 content_publish_schedule（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_publish_schedule (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/publish_schedule.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "PublishScheduleRow"
    description: {zh: "预约发布的时间与状态", en: "Scheduled publish time and state"}
    schema: {"type":"object","additionalProperties":false,"description":"预约发布的时间与状态 / Scheduled publish time and state｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_publish_schedule；主键 PK(id)；无唯一约束；索引 INDEX(scheduledAt,status)；外键 FK(draftId→data.content.video-draft.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"draftId":{"type":"string","description":"外键指向 data.content.video-draft.id（多对一，由 RDS 实施） / Foreign key to data.content.video-draft.id (many-to-one, enforced by RDS)"},"scheduledAt":{"type":"string","format":"date-time","description":"scheduledAt 字段 / Field scheduledAt"},"timezone":{"type":"string","description":"timezone 字段 / Field timezone"},"status":{"type":"string","enum":["PENDING","FIRED","CANCELLED","FAILED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"firedAt":{"type":"string","format":"date-time","description":"firedAt 字段 / Field firedAt"}},"required":["id","draftId","scheduledAt","timezone","status"]}
deps:
  - kind: reference
    to: data.content.video-draft
    label: {zh: "draftId→video-draft.id，多对一", en: "draftId->video-draft.id,"}
---
