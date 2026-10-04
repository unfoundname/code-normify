---
uid: d620552e
id: data.ops.operation-audit-log
parent: data.ops
state: planned
tags: [planned, "worker:W-OPS", "storage:rds"]
name: {zh: "操作审计日志", en: "Operation audit log"}
description:
  zh: >
      仅追加的后台操作审计
  en: >
      Append-only backoffice operation audit
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/operation_audit_log.model.sql"
apis:
  - protocol: rpc
    path: "db.table.operation_audit_log"
    description:
      zh: >
          权威表 operation_audit_log（唯一业务写入所有者：W-OPS；RDS 方言与适配器待定）
      en: >
          Authoritative table operation_audit_log (sole write owner: W-OPS; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/operation_audit_log.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "OperationAuditLogRow"
    description: {zh: "仅追加的后台操作审计", en: "Append-only backoffice operation audit"}
    schema: {"type":"object","additionalProperties":false,"description":"仅追加的后台操作审计 / Append-only backoffice operation audit｜存储归属 RDS｜唯一写入所有者 W-OPS｜表 operation_audit_log；主键 PK(id)；无唯一约束；索引 INDEX(operatorId,occurredAt), INDEX(targetId)；外键 FK(operatorId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"operatorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"action":{"type":"string","description":"action 字段 / Field action"},"targetId":{"type":"string","description":"targetId 字段 / Field targetId"},"beforeJson":{"type":"object","additionalProperties":true,"description":"beforeJson 字段 / Field beforeJson"},"afterJson":{"type":"object","additionalProperties":true,"description":"afterJson 字段 / Field afterJson"},"occurredAt":{"type":"string","format":"date-time","description":"occurredAt 字段 / Field occurredAt"}},"required":["id","operatorId","action","targetId","occurredAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "operatorId→user.id，多对一", en: "operatorId->user.id,"}
---
