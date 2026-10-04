---
uid: 72ee3a77
id: data.identity.realname-profile
parent: data.identity
state: planned
tags: [planned, "worker:W-IDENTITY", "storage:rds"]
name: {zh: "实名档案", en: "Real-name profile"}
description:
  zh: >
      脱敏实名信息、核验方式与未成年人模式
  en: >
      Masked real-name data, verification method and minor mode
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/models/realname_profile.model.sql"
apis:
  - protocol: rpc
    path: "db.table.identity_realname_profile"
    description:
      zh: >
          权威表 identity_realname_profile（唯一业务写入所有者：W-IDENTITY；RDS 方言与适配器待定）
      en: >
          Authoritative table identity_realname_profile (sole write owner: W-IDENTITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/identity/models/realname_profile.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "RealnameProfileRow"
    description: {zh: "脱敏实名信息、核验方式与未成年人模式", en: "Masked real-name data, verification method and minor mode"}
    schema: {"type":"object","additionalProperties":false,"description":"脱敏实名信息、核验方式与未成年人模式 / Masked real-name data, verification method and minor mode｜存储归属 RDS｜唯一写入所有者 W-IDENTITY｜表 identity_realname_profile；主键 PK(id)；唯一约束 UNIQUE(userId)；无二级索引；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"realNameMasked":{"type":"string","description":"realNameMasked 字段 / Field realNameMasked"},"verifyMethod":{"type":"string","enum":["ID_CARD","PASSPORT","FACE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"minorMode":{"type":"boolean","description":"minorMode 字段 / Field minorMode"},"verifiedAt":{"type":"string","format":"date-time","description":"verifiedAt 字段 / Field verifiedAt"}},"required":["id","userId","realNameMasked","verifyMethod","minorMode","verifiedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
