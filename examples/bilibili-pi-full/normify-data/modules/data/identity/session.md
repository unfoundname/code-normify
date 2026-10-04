---
uid: fe08a42e
id: data.identity.session
parent: data.identity
state: planned
tags: [planned, "worker:W-IDENTITY", "storage:rds"]
name: {zh: "登录会话", en: "Login session"}
description:
  zh: >
      会话票据、设备与过期时间
  en: >
      Session ticket, device and expiry
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/models/session.model.sql"
apis:
  - protocol: rpc
    path: "db.table.identity_session"
    description:
      zh: >
          权威表 identity_session（唯一业务写入所有者：W-IDENTITY；RDS 方言与适配器待定）
      en: >
          Authoritative table identity_session (sole write owner: W-IDENTITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/identity/models/session.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "SessionRow"
    description: {zh: "会话票据、设备与过期时间", en: "Session ticket, device and expiry"}
    schema: {"type":"object","additionalProperties":false,"description":"会话票据、设备与过期时间 / Session ticket, device and expiry｜存储归属 RDS｜唯一写入所有者 W-IDENTITY｜表 identity_session；主键 PK(id)；唯一约束 UNIQUE(tokenHash)；索引 INDEX(userId,expireAt)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"deviceId":{"type":"string","description":"deviceId 字段 / Field deviceId"},"tokenHash":{"type":"string","description":"tokenHash 字段 / Field tokenHash"},"mfaVerified":{"type":"boolean","description":"mfaVerified 字段 / Field mfaVerified"},"expireAt":{"type":"string","format":"date-time","description":"expireAt 字段 / Field expireAt"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","userId","deviceId","tokenHash","mfaVerified","expireAt","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
