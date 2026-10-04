---
uid: 1cf52297
id: data.identity.profile
parent: data.identity
state: planned
tags: [planned, "worker:W-IDENTITY", "storage:rds"]
name: {zh: "个人资料", en: "Profile"}
description:
  zh: >
      昵称头像签名与官方认证标识
  en: >
      Nickname, avatar, signature and official badge
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/models/profile.model.sql"
apis:
  - protocol: rpc
    path: "db.table.identity_profile"
    description:
      zh: >
          权威表 identity_profile（唯一业务写入所有者：W-IDENTITY；RDS 方言与适配器待定）
      en: >
          Authoritative table identity_profile (sole write owner: W-IDENTITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/identity/models/profile.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ProfileRow"
    description: {zh: "昵称头像签名与官方认证标识", en: "Nickname, avatar, signature and official badge"}
    schema: {"type":"object","additionalProperties":false,"description":"昵称头像签名与官方认证标识 / Nickname, avatar, signature and official badge｜存储归属 RDS｜唯一写入所有者 W-IDENTITY｜表 identity_profile；主键 PK(id)；唯一约束 UNIQUE(userId)；索引 INDEX(nickname)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"nickname":{"type":"string","description":"nickname 字段 / Field nickname"},"avatarUrl":{"type":"string","description":"avatarUrl 字段 / Field avatarUrl"},"signature":{"type":"string","description":"signature 字段 / Field signature"},"officialBadge":{"type":"string","description":"officialBadge 字段 / Field officialBadge"},"spacePinnedIdsJson":{"type":"object","additionalProperties":true,"description":"spacePinnedIdsJson 字段 / Field spacePinnedIdsJson"}},"required":["id","userId","nickname","avatarUrl","officialBadge"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
