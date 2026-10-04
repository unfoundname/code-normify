---
uid: c998646b
id: data.identity.user
parent: data.identity
state: planned
tags: [planned, "worker:W-IDENTITY", "storage:rds"]
name: {zh: "用户账号", en: "User account"}
description:
  zh: >
      主账号表：业务号、登录标识与账号状态
  en: >
      Primary account table with business id, login identifiers and status
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/models/user.model.sql"
apis:
  - protocol: rpc
    path: "db.table.identity_user"
    description:
      zh: >
          权威表 identity_user（唯一业务写入所有者：W-IDENTITY；RDS 方言与适配器待定）
      en: >
          Authoritative table identity_user (sole write owner: W-IDENTITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/identity/models/user.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "UserRow"
    description: {zh: "主账号表：业务号、登录标识与账号状态", en: "Primary account table with business id, login identifiers and status"}
    schema: {"type":"object","additionalProperties":false,"description":"主账号表：业务号、登录标识与账号状态 / Primary account table with business id, login identifiers and status｜存储归属 RDS｜唯一写入所有者 W-IDENTITY｜表 identity_user；主键 PK(id)；唯一约束 UNIQUE(mid), UNIQUE(email)；索引 INDEX(status)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"mid":{"type":"string","description":"mid 字段 / Field mid"},"email":{"type":"string","description":"email 字段 / Field email"},"phone":{"type":"string","description":"phone 字段 / Field phone"},"nickname":{"type":"string","description":"nickname 字段 / Field nickname"},"status":{"type":"string","enum":["ACTIVE","BANNED","DEACTIVATED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"deactivatedAt":{"type":"string","format":"date-time","description":"deactivatedAt 字段 / Field deactivatedAt"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","mid","email","nickname","status","createdAt","updatedAt"]}
---
