---
uid: c7513b63
id: data.client.ui-preference
parent: data.client
state: planned
tags: [planned, "worker:W-WEB-CORE", "storage:rds"]
name: {zh: "客户端界面偏好", en: "Client UI preference"}
description:
  zh: >
      跨端同步的界面偏好（仅偏好）
  en: >
      Cross-device UI preferences only
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/ui_preference.model.sql"
apis:
  - protocol: rpc
    path: "db.table.client_ui_preference"
    description:
      zh: >
          权威表 client_ui_preference（唯一业务写入所有者：W-WEB-CORE；RDS 方言与适配器待定）
      en: >
          Authoritative table client_ui_preference (sole write owner: W-WEB-CORE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/ui_preference.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "UiPreferenceRow"
    description: {zh: "跨端同步的界面偏好（仅偏好）", en: "Cross-device UI preferences only"}
    schema: {"type":"object","additionalProperties":false,"description":"跨端同步的界面偏好（仅偏好） / Cross-device UI preferences only｜存储归属 RDS｜唯一写入所有者 W-WEB-CORE｜表 client_ui_preference；主键 PK(id)；唯一约束 UNIQUE(userId)；无二级索引；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"theme":{"type":"string","description":"theme 字段 / Field theme"},"locale":{"type":"string","description":"locale 字段 / Field locale"},"playerDefaultsJson":{"type":"object","additionalProperties":true,"description":"playerDefaultsJson 字段 / Field playerDefaultsJson"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","userId","theme","locale","playerDefaultsJson","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
