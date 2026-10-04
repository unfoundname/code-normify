---
uid: "8e800232"
id: data.ops.service-ticket
parent: data.ops
state: planned
tags: [planned, "worker:W-OPS", "storage:rds"]
name: {zh: "客服工单", en: "Service ticket"}
description:
  zh: >
      客服工单分类与处理
  en: >
      Customer service tickets and handling
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/service_ticket.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ops_service_ticket"
    description:
      zh: >
          权威表 ops_service_ticket（唯一业务写入所有者：W-OPS；RDS 方言与适配器待定）
      en: >
          Authoritative table ops_service_ticket (sole write owner: W-OPS; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/service_ticket.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ServiceTicketRow"
    description: {zh: "客服工单分类与处理", en: "Customer service tickets and handling"}
    schema: {"type":"object","additionalProperties":false,"description":"客服工单分类与处理 / Customer service tickets and handling｜存储归属 RDS｜唯一写入所有者 W-OPS｜表 ops_service_ticket；主键 PK(id)；无唯一约束；索引 INDEX(status,createdAt)；外键 FK(userId→data.identity.user.id, assigneeId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"category":{"type":"string","enum":["ACCOUNT","CONTENT","PAYMENT","TECHNICAL","OTHER"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"content":{"type":"string","description":"content 字段 / Field content"},"status":{"type":"string","enum":["OPEN","PENDING","RESOLVED","CLOSED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"assigneeId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","userId","category","content","status","createdAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id+assigneeId→user", en: "userId->user.id+assigneeId->us"}
---
