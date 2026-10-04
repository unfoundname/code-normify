---
uid: a528bdd3
id: data.pgc.trial-policy
parent: data.pgc
state: planned
tags: [planned, "worker:W-PGC", "storage:rds"]
name: {zh: "试看策略", en: "Trial policy"}
description:
  zh: >
      试看时长与门槛
  en: >
      Trial duration and gates
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/pgc/models/trial_policy.model.sql"
apis:
  - protocol: rpc
    path: "db.table.pgc_trial_policy"
    description:
      zh: >
          权威表 pgc_trial_policy（唯一业务写入所有者：W-PGC；RDS 方言与适配器待定）
      en: >
          Authoritative table pgc_trial_policy (sole write owner: W-PGC; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/pgc/models/trial_policy.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "TrialPolicyRow"
    description: {zh: "试看时长与门槛", en: "Trial duration and gates"}
    schema: {"type":"object","additionalProperties":false,"description":"试看时长与门槛 / Trial duration and gates｜存储归属 RDS｜唯一写入所有者 W-PGC｜表 pgc_trial_policy；主键 PK(id)；唯一约束 UNIQUE(resourceId)；无二级索引；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"resourceId":{"type":"string","description":"resourceId 字段 / Field resourceId"},"trialSec":{"type":"integer","description":"trialSec 字段 / Field trialSec"},"requireLogin":{"type":"boolean","description":"requireLogin 字段 / Field requireLogin"},"requireVip":{"type":"boolean","description":"requireVip 字段 / Field requireVip"}},"required":["id","resourceId","trialSec","requireLogin","requireVip"]}
---
