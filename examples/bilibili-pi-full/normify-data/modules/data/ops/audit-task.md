---
uid: 81038b9f
id: data.ops.audit-task
parent: data.ops
state: planned
tags: [planned, "worker:W-OPS", "storage:rds"]
name: {zh: "审核任务", en: "Audit task"}
description:
  zh: >
      审核队列、资源类型与分派
  en: >
      Audit queue, resource type and assignment
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/audit_task.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ops_audit_task"
    description:
      zh: >
          权威表 ops_audit_task（唯一业务写入所有者：W-OPS；RDS 方言与适配器待定）
      en: >
          Authoritative table ops_audit_task (sole write owner: W-OPS; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/audit_task.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "AuditTaskRow"
    description: {zh: "审核队列、资源类型与分派", en: "Audit queue, resource type and assignment"}
    schema: {"type":"object","additionalProperties":false,"description":"审核队列、资源类型与分派 / Audit queue, resource type and assignment｜存储归属 RDS｜唯一写入所有者 W-OPS｜表 ops_audit_task；主键 PK(id)；无唯一约束；索引 INDEX(auditState,createdAt), INDEX(resourceId,resourceType)；外键 FK(assigneeId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"resourceId":{"type":"string","description":"resourceId 字段 / Field resourceId"},"resourceType":{"type":"string","enum":["VIDEO","DANMAKU","COMMENT","ARTICLE","AUDIO","LIVE","DYNAMIC","TOPIC"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"auditState":{"type":"string","enum":["PENDING","PASSED","REJECTED","ESCALATED","APPEALING"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"policyId":{"type":"string","description":"policyId 字段 / Field policyId"},"assigneeId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","resourceId","resourceType","auditState","policyId","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "assigneeId→user.id，多对一", en: "assigneeId->user.id,"}
---
