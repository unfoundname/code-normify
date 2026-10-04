---
uid: 5462c7ce
id: data.commerce.reconcile-report
parent: data.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", "storage:rds"]
name: {zh: "对账报告", en: "Reconciliation report"}
description:
  zh: >
      渠道账单差异与处理状态
  en: >
      Channel statement discrepancies and handling state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/commerce/models/reconcile_report.model.sql"
apis:
  - protocol: rpc
    path: "db.table.commerce_reconcile_report"
    description:
      zh: >
          权威表 commerce_reconcile_report（唯一业务写入所有者：W-COMMERCE；RDS 方言与适配器待定）
      en: >
          Authoritative table commerce_reconcile_report (sole write owner: W-COMMERCE; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/commerce/models/reconcile_report.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ReconcileReportRow"
    description: {zh: "渠道账单差异与处理状态", en: "Channel statement discrepancies and handling state"}
    schema: {"type":"object","additionalProperties":false,"description":"渠道账单差异与处理状态 / Channel statement discrepancies and handling state｜存储归属 RDS｜唯一写入所有者 W-COMMERCE｜表 commerce_reconcile_report；主键 PK(id)；唯一约束 UNIQUE(channel,periodStart,periodEnd)；无二级索引；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"channel":{"type":"string","enum":["ALIPAY","WECHAT","APPLE","GOOGLE","CARD"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"periodStart":{"type":"string","format":"date-time","description":"periodStart 字段 / Field periodStart"},"periodEnd":{"type":"string","format":"date-time","description":"periodEnd 字段 / Field periodEnd"},"matchedCount":{"type":"integer","description":"matchedCount 字段 / Field matchedCount"},"diffCount":{"type":"integer","description":"diffCount 字段 / Field diffCount"},"status":{"type":"string","enum":["OPEN","MATCHED","DIFF","HANDLED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"createdAt":{"type":"string","format":"date-time","description":"createdAt 字段 / Field createdAt"}},"required":["id","channel","periodStart","periodEnd","matchedCount","diffCount","status","createdAt"]}
---
