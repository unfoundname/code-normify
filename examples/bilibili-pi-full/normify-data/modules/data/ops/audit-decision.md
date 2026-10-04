---
uid: 286b00e8
id: data.ops.audit-decision
parent: data.ops
state: planned
tags: [planned, "worker:W-OPS", "storage:rds"]
name: {zh: "审核结论", en: "Audit decision"}
description:
  zh: >
      结论、策略与操作者
  en: >
      Decisions, policies and operators
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/audit_decision.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ops_audit_decision"
    description:
      zh: >
          权威表 ops_audit_decision（唯一业务写入所有者：W-OPS；RDS 方言与适配器待定）
      en: >
          Authoritative table ops_audit_decision (sole write owner: W-OPS; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/audit_decision.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "AuditDecisionRow"
    description: {zh: "结论、策略与操作者", en: "Decisions, policies and operators"}
    schema: {"type":"object","additionalProperties":false,"description":"结论、策略与操作者 / Decisions, policies and operators｜存储归属 RDS｜唯一写入所有者 W-OPS｜表 ops_audit_decision；主键 PK(id)；无唯一约束；索引 INDEX(taskId)；外键 FK(taskId→data.ops.audit-task.id, operatorId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"taskId":{"type":"string","description":"外键指向 data.ops.audit-task.id（多对一，由 RDS 实施） / Foreign key to data.ops.audit-task.id (many-to-one, enforced by RDS)"},"auditState":{"type":"string","enum":["PENDING","PASSED","REJECTED","ESCALATED","APPEALING"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"policyId":{"type":"string","description":"policyId 字段 / Field policyId"},"operatorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"reason":{"type":"string","enum":["POLICY_VIOLATION","COPYRIGHT","SPAM","MANUAL","APPEAL_OVERTURNED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"decidedAt":{"type":"string","format":"date-time","description":"decidedAt 字段 / Field decidedAt"}},"required":["id","taskId","auditState","policyId","operatorId","decidedAt"]}
deps:
  - kind: reference
    to: data.ops.audit-task
    label: {zh: "taskId→audit-task.id，多对一", en: "taskId->audit-task.id,"}
  - kind: reference
    to: data.identity.user
    label: {zh: "operatorId→user.id，多对一", en: "operatorId->user.id,"}
---
