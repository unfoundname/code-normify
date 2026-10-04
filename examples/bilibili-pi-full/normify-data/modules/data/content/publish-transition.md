---
uid: 5a4d7a3a
id: data.content.publish-transition
parent: data.content
state: planned
tags: [planned, "worker:W-CONTENT", "storage:rds"]
name: {zh: "发布状态迁移", en: "Publish transition"}
description:
  zh: >
      发布状态机迁移日志（审计权威）
  en: >
      Publish state machine transition log (audit authority)
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/content/models/publish_transition.model.sql"
apis:
  - protocol: rpc
    path: "db.table.content_publish_transition"
    description:
      zh: >
          权威表 content_publish_transition（唯一业务写入所有者：W-CONTENT；RDS 方言与适配器待定）
      en: >
          Authoritative table content_publish_transition (sole write owner: W-CONTENT; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/content/models/publish_transition.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "PublishTransitionRow"
    description: {zh: "发布状态机迁移日志（审计权威）", en: "Publish state machine transition log (audit authority)"}
    schema: {"type":"object","additionalProperties":false,"description":"发布状态机迁移日志（审计权威） / Publish state machine transition log (audit authority)｜存储归属 RDS｜唯一写入所有者 W-CONTENT｜表 content_publish_transition；主键 PK(id)；无唯一约束；索引 INDEX(bvid,changedAt)；外键 FK(bvid→data.content.video.id, operatorId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"bvid":{"type":"string","description":"外键指向 data.content.video.id（多对一，由 RDS 实施） / Foreign key to data.content.video.id (many-to-one, enforced by RDS)"},"fromState":{"type":"string","description":"fromState 字段 / Field fromState"},"toState":{"type":"string","description":"toState 字段 / Field toState"},"reason":{"type":"string","enum":["PUBLISH","PRIVATE","PUBLIC","REMOVE","DELETE","SCHEDULE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"operatorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"changedAt":{"type":"string","format":"date-time","description":"changedAt 字段 / Field changedAt"}},"required":["id","bvid","fromState","toState","reason","operatorId","changedAt"]}
deps:
  - kind: reference
    to: data.content.video
    label: {zh: "bvid→video.id，多对一", en: "bvid->video.id, many-to-one"}
  - kind: reference
    to: data.identity.user
    label: {zh: "operatorId→user.id，多对一", en: "operatorId->user.id,"}
---
