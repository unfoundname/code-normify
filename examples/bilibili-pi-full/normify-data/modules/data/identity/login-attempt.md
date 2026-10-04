---
uid: 075f275f
id: data.identity.login-attempt
parent: data.identity
state: planned
tags: [planned, "worker:W-IDENTITY", "storage:rds"]
name: {zh: "登录尝试", en: "Login attempt"}
description:
  zh: >
      风控与审计用的登录尝试记录
  en: >
      Login attempts used for risk control and audit
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/models/login_attempt.model.sql"
apis:
  - protocol: rpc
    path: "db.table.identity_login_attempt"
    description:
      zh: >
          权威表 identity_login_attempt（唯一业务写入所有者：W-IDENTITY；RDS 方言与适配器待定）
      en: >
          Authoritative table identity_login_attempt (sole write owner: W-IDENTITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/identity/models/login_attempt.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "LoginAttemptRow"
    description: {zh: "风控与审计用的登录尝试记录", en: "Login attempts used for risk control and audit"}
    schema: {"type":"object","additionalProperties":false,"description":"风控与审计用的登录尝试记录 / Login attempts used for risk control and audit｜存储归属 RDS｜唯一写入所有者 W-IDENTITY｜表 identity_login_attempt；主键 PK(id)；无唯一约束；索引 INDEX(userId,occurredAt)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"deviceId":{"type":"string","description":"deviceId 字段 / Field deviceId"},"ipRegion":{"type":"string","description":"ipRegion 字段 / Field ipRegion"},"riskLevel":{"type":"string","description":"riskLevel 字段 / Field riskLevel"},"succeeded":{"type":"boolean","description":"succeeded 字段 / Field succeeded"},"occurredAt":{"type":"string","format":"date-time","description":"occurredAt 字段 / Field occurredAt"}},"required":["id","deviceId","ipRegion","riskLevel","succeeded","occurredAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
