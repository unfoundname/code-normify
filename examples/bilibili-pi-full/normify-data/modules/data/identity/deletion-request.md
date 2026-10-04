---
uid: b80fa2c2
id: data.identity.deletion-request
parent: data.identity
state: planned
tags: [planned, "worker:W-IDENTITY", "storage:rds"]
name: {zh: "注销请求", en: "Deletion request"}
description:
  zh: >
      注销冷却、导出包与状态
  en: >
      Deletion cooling-off, export package and status
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/models/deletion_request.model.sql"
apis:
  - protocol: rpc
    path: "db.table.identity_deletion_request"
    description:
      zh: >
          权威表 identity_deletion_request（唯一业务写入所有者：W-IDENTITY；RDS 方言与适配器待定）
      en: >
          Authoritative table identity_deletion_request (sole write owner: W-IDENTITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/identity/models/deletion_request.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "DeletionRequestRow"
    description: {zh: "注销冷却、导出包与状态", en: "Deletion cooling-off, export package and status"}
    schema: {"type":"object","additionalProperties":false,"description":"注销冷却、导出包与状态 / Deletion cooling-off, export package and status｜存储归属 RDS｜唯一写入所有者 W-IDENTITY｜表 identity_deletion_request；主键 PK(id)；无唯一约束；索引 INDEX(userId,status)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"status":{"type":"string","enum":["REQUESTED","COOLING","OFF","DONE","CANCELLED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"effectiveAt":{"type":"string","format":"date-time","description":"effectiveAt 字段 / Field effectiveAt"},"exportObjectKey":{"type":"string","description":"exportObjectKey 字段 / Field exportObjectKey"},"requestedAt":{"type":"string","format":"date-time","description":"requestedAt 字段 / Field requestedAt"}},"required":["id","userId","status","effectiveAt","requestedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
