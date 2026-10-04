---
uid: 02e92f91
id: data.infra.alert-rule
parent: data.infra
state: planned
tags: [planned, "worker:W-INFRA", "storage:rds"]
name: {zh: "告警规则", en: "Alert rule"}
description:
  zh: >
      指标阈值、窗口与级别
  en: >
      Metric thresholds, windows and severity
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/infra/models/alert_rule.model.sql"
apis:
  - protocol: rpc
    path: "db.table.infra_alert_rule"
    description:
      zh: >
          权威表 infra_alert_rule（唯一业务写入所有者：W-INFRA；RDS 方言与适配器待定）
      en: >
          Authoritative table infra_alert_rule (sole write owner: W-INFRA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/infra/models/alert_rule.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "AlertRuleRow"
    description: {zh: "指标阈值、窗口与级别", en: "Metric thresholds, windows and severity"}
    schema: {"type":"object","additionalProperties":false,"description":"指标阈值、窗口与级别 / Metric thresholds, windows and severity｜存储归属 RDS｜唯一写入所有者 W-INFRA｜表 infra_alert_rule；主键 PK(id)；唯一约束 UNIQUE(metric,windowSec)；无二级索引；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"metric":{"type":"string","description":"metric 字段 / Field metric"},"threshold":{"type":"number","description":"threshold 字段 / Field threshold"},"windowSec":{"type":"integer","description":"windowSec 字段 / Field windowSec"},"severity":{"type":"string","enum":["P1","P2","P3","P4"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"enabled":{"type":"boolean","description":"enabled 字段 / Field enabled"}},"required":["id","metric","threshold","windowSec","severity","enabled"]}
---
