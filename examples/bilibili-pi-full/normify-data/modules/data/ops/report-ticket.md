---
uid: 19721d17
id: data.ops.report-ticket
parent: data.ops
state: planned
tags: [planned, "worker:W-OPS", "storage:rds"]
name: {zh: "举报工单", en: "Report ticket"}
description:
  zh: >
      举报分类、目标与处置状态
  en: >
      Report categories, targets and handling state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/report_ticket.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ops_report_ticket"
    description:
      zh: >
          权威表 ops_report_ticket（唯一业务写入所有者：W-OPS；RDS 方言与适配器待定）
      en: >
          Authoritative table ops_report_ticket (sole write owner: W-OPS; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/report_ticket.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ReportTicketRow"
    description: {zh: "举报分类、目标与处置状态", en: "Report categories, targets and handling state"}
    schema: {"type":"object","additionalProperties":false,"description":"举报分类、目标与处置状态 / Report categories, targets and handling state｜存储归属 RDS｜唯一写入所有者 W-OPS｜表 ops_report_ticket；主键 PK(id)；无唯一约束；索引 INDEX(status,createdAt), INDEX(targetId,targetType)；外键 FK(reporterId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"reporterId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"targetId":{"type":"string","description":"targetId 字段 / Field targetId"},"targetType":{"type":"string","description":"targetType 字段 / Field targetType"},"category":{"type":"string","enum":["SPAM","ABUSE","PORN","ILLEGAL","COPYRIGHT","OTHER"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"status":{"type":"string","enum":["OPEN","TRIAGED","ACCEPTED","REJECTED","CLOSED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","reporterId","targetId","targetType","category","status","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "reporterId→user.id，多对一", en: "reporterId->user.id,"}
---
