---
uid: bab88cd1
id: data.identity.credential
parent: data.identity
state: planned
tags: [planned, "worker:W-IDENTITY", "storage:rds"]
name: {zh: "账号凭据", en: "Account credential"}
description:
  zh: >
      密码哈希与二次验证因子（不落明文）
  en: >
      Password hash and second factor references, never plaintext
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/models/credential.model.sql"
apis:
  - protocol: rpc
    path: "db.table.identity_credential"
    description:
      zh: >
          权威表 identity_credential（唯一业务写入所有者：W-IDENTITY；RDS 方言与适配器待定）
      en: >
          Authoritative table identity_credential (sole write owner: W-IDENTITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/identity/models/credential.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CredentialRow"
    description: {zh: "密码哈希与二次验证因子（不落明文）", en: "Password hash and second factor references, never plaintext"}
    schema: {"type":"object","additionalProperties":false,"description":"密码哈希与二次验证因子（不落明文） / Password hash and second factor references, never plaintext｜存储归属 RDS｜唯一写入所有者 W-IDENTITY｜表 identity_credential；主键 PK(id)；唯一约束 UNIQUE(userId)；索引 INDEX(lockedUntil)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"passwordHash":{"type":"string","description":"passwordHash 字段 / Field passwordHash"},"totpSecretRef":{"type":"string","description":"totpSecretRef 字段 / Field totpSecretRef"},"failedAttempts":{"type":"integer","description":"failedAttempts 字段 / Field failedAttempts"},"lockedUntil":{"type":"string","format":"date-time","description":"lockedUntil 字段 / Field lockedUntil"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","userId","passwordHash","failedAttempts","updatedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
