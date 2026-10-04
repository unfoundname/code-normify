---
uid: 7023cef9
id: data.ops.penalty-record
parent: data.ops
state: planned
tags: [planned, "worker:W-OPS", "storage:rds"]
name: {zh: "处罚记录", en: "Penalty record"}
description:
  zh: >
      处罚类型、期限与解除
  en: >
      Penalty types, terms and revocation
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/penalty_record.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ops_penalty_record"
    description:
      zh: >
          权威表 ops_penalty_record（唯一业务写入所有者：W-OPS；RDS 方言与适配器待定）
      en: >
          Authoritative table ops_penalty_record (sole write owner: W-OPS; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/penalty_record.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "PenaltyRecordRow"
    description: {zh: "处罚类型、期限与解除", en: "Penalty types, terms and revocation"}
    schema: {"type":"object","additionalProperties":false,"description":"处罚类型、期限与解除 / Penalty types, terms and revocation｜存储归属 RDS｜唯一写入所有者 W-OPS｜表 ops_penalty_record；主键 PK(id)；无唯一约束；索引 INDEX(subjectId,subjectType), INDEX(effectiveTo)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"subjectId":{"type":"string","description":"subjectId 字段 / Field subjectId"},"subjectType":{"type":"string","description":"subjectType 字段 / Field subjectType"},"penaltyType":{"type":"string","enum":["WARNING","MUTE","BAN_CONTENT","BAN_ACCOUNT","FEATURE_BLOCK"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"effectiveFrom":{"type":"string","format":"date-time","description":"effectiveFrom 字段 / Field effectiveFrom"},"effectiveTo":{"type":"string","format":"date-time","description":"effectiveTo 字段 / Field effectiveTo"},"reason":{"type":"string","enum":["POLICY_VIOLATION","COPYRIGHT","REPORT_VERIFIED","ADMIN"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"revokedAt":{"type":"string","format":"date-time","description":"revokedAt 字段 / Field revokedAt"}},"required":["id","subjectId","subjectType","penaltyType","effectiveFrom","reason"]}
---
