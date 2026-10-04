---
uid: 8eed4494
id: data.ops.appeal-case
parent: data.ops
state: planned
tags: [planned, "worker:W-OPS", "storage:rds"]
name: {zh: "申诉案件", en: "Appeal case"}
description:
  zh: >
      申诉理由、复核与结果
  en: >
      Appeal reasons, reviews and outcomes
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/appeal_case.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ops_appeal_case"
    description:
      zh: >
          权威表 ops_appeal_case（唯一业务写入所有者：W-OPS；RDS 方言与适配器待定）
      en: >
          Authoritative table ops_appeal_case (sole write owner: W-OPS; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/appeal_case.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "AppealCaseRow"
    description: {zh: "申诉理由、复核与结果", en: "Appeal reasons, reviews and outcomes"}
    schema: {"type":"object","additionalProperties":false,"description":"申诉理由、复核与结果 / Appeal reasons, reviews and outcomes｜存储归属 RDS｜唯一写入所有者 W-OPS｜表 ops_appeal_case；主键 PK(id)；无唯一约束；索引 INDEX(status,createdAt), INDEX(userId)；外键 FK(userId→data.identity.user.id, reviewerId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"penaltyId":{"type":"string","description":"penaltyId 字段 / Field penaltyId"},"reason":{"type":"string","enum":["MISTAKE","APPEAL_CONTEXT","POLICY_CHANGED","OTHER"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"status":{"type":"string","enum":["SUBMITTED","REVIEWING","ACCEPTED","REJECTED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"reviewerId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","userId","penaltyId","reason","status","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id+reviewerId→user", en: "userId->user.id+reviewerId->us"}
---
