---
uid: 948ffaf2
id: data.creator.withdraw-request
parent: data.creator
state: planned
tags: [planned, "worker:W-CREATOR", "storage:rds"]
name: {zh: "提现请求", en: "Withdrawal request"}
description:
  zh: >
      提现账户、金额与状态
  en: >
      Withdrawal account, amount and state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/withdraw_request.model.sql"
apis:
  - protocol: rpc
    path: "db.table.creator_withdraw_request"
    description:
      zh: >
          权威表 creator_withdraw_request（唯一业务写入所有者：W-CREATOR；RDS 方言与适配器待定）
      en: >
          Authoritative table creator_withdraw_request (sole write owner: W-CREATOR; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/withdraw_request.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "WithdrawRequestRow"
    description: {zh: "提现账户、金额与状态", en: "Withdrawal account, amount and state"}
    schema: {"type":"object","additionalProperties":false,"description":"提现账户、金额与状态 / Withdrawal account, amount and state｜存储归属 RDS｜唯一写入所有者 W-CREATOR｜表 creator_withdraw_request；主键 PK(id)；唯一约束 UNIQUE(idempotencyKey)；索引 INDEX(creatorId,status)；外键 FK(statementId→data.creator.income-statement.id, creatorId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"statementId":{"type":"string","description":"外键指向 data.creator.income-statement.id（多对一，由 RDS 实施） / Foreign key to data.creator.income-statement.id (many-to-one, enforced by RDS)"},"creatorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"amount":{"type":"integer","description":"amount 字段 / Field amount"},"accountRef":{"type":"string","description":"accountRef 字段 / Field accountRef"},"status":{"type":"string","enum":["REQUESTED","REVIEWING","PAID","REJECTED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"idempotencyKey":{"type":"string","description":"idempotencyKey 字段 / Field idempotencyKey"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","statementId","creatorId","amount","accountRef","status","idempotencyKey","createdAt"]}
deps:
  - kind: reference
    to: data.creator.income-statement
    label: {zh: "statementId→income-statement.i", en: "statementId->income-statement."}
  - kind: reference
    to: data.identity.user
    label: {zh: "creatorId→user.id，多对一", en: "creatorId->user.id,"}
---
