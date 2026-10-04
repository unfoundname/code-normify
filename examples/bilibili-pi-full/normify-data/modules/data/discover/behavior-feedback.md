---
uid: 5c79302d
id: data.discover.behavior-feedback
parent: data.discover
state: planned
tags: [planned, "worker:W-DISCOVER", "storage:rds"]
name: {zh: "行为反馈", en: "Behavior feedback"}
description:
  zh: >
      曝光/点击/播放/不感兴趣回传
  en: >
      Exposure, click, play and not-interested feedback
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/behavior_feedback.model.sql"
apis:
  - protocol: rpc
    path: "db.table.discover_behavior_feedback"
    description:
      zh: >
          权威表 discover_behavior_feedback（唯一业务写入所有者：W-DISCOVER；RDS 方言与适配器待定）
      en: >
          Authoritative table discover_behavior_feedback (sole write owner: W-DISCOVER; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/behavior_feedback.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "BehaviorFeedbackRow"
    description: {zh: "曝光/点击/播放/不感兴趣回传", en: "Exposure, click, play and not-interested feedback"}
    schema: {"type":"object","additionalProperties":false,"description":"曝光/点击/播放/不感兴趣回传 / Exposure, click, play and not-interested feedback｜存储归属 RDS｜唯一写入所有者 W-DISCOVER｜表 discover_behavior_feedback；主键 PK(id)；无唯一约束；索引 INDEX(resourceId,feedbackType,occurredAt)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"resourceId":{"type":"string","description":"resourceId 字段 / Field resourceId"},"feedbackType":{"type":"string","description":"feedbackType 字段 / Field feedbackType"},"scene":{"type":"string","description":"scene 字段 / Field scene"},"occurredAt":{"type":"string","format":"date-time","description":"occurredAt 字段 / Field occurredAt"}},"required":["id","resourceId","feedbackType","scene","occurredAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
