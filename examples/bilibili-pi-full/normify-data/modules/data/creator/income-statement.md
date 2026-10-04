---
uid: 95c48f63
id: data.creator.income-statement
parent: data.creator
state: planned
tags: [planned, "worker:W-CREATOR", "storage:rds"]
name: {zh: "收益结算单", en: "Income statement"}
description:
  zh: >
      周期收益、费用与净额
  en: >
      Periodic revenue, fees and net amount
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/income_statement.model.sql"
apis:
  - protocol: rpc
    path: "db.table.creator_income_statement"
    description:
      zh: >
          权威表 creator_income_statement（唯一业务写入所有者：W-CREATOR；RDS 方言与适配器待定）
      en: >
          Authoritative table creator_income_statement (sole write owner: W-CREATOR; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/income_statement.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "IncomeStatementRow"
    description: {zh: "周期收益、费用与净额", en: "Periodic revenue, fees and net amount"}
    schema: {"type":"object","additionalProperties":false,"description":"周期收益、费用与净额 / Periodic revenue, fees and net amount｜存储归属 RDS｜唯一写入所有者 W-CREATOR｜表 creator_income_statement；主键 PK(id)；唯一约束 UNIQUE(creatorId,periodStart,periodEnd)；索引 INDEX(status)；外键 FK(creatorId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"creatorId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"periodStart":{"type":"string","format":"date-time","description":"periodStart 字段 / Field periodStart"},"periodEnd":{"type":"string","format":"date-time","description":"periodEnd 字段 / Field periodEnd"},"gross":{"type":"integer","description":"gross 字段 / Field gross"},"fee":{"type":"integer","description":"fee 字段 / Field fee"},"net":{"type":"integer","description":"net 字段 / Field net"},"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"status":{"type":"string","enum":["CALCULATED","CONFIRMED","PAID","FAILED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"}},"required":["id","creatorId","periodStart","periodEnd","gross","fee","net","currency","status"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "creatorId→user.id，多对一", en: "creatorId->user.id,"}
---
