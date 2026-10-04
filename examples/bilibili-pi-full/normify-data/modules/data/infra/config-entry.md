---
uid: 6e78a745
id: data.infra.config-entry
parent: data.infra
state: planned
tags: [planned, "worker:W-INFRA", "storage:rds"]
name: {zh: "配置项", en: "Config entry"}
description:
  zh: >
      分层配置与非明文密钥引用
  en: >
      Layered configuration and secret references
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/infra/models/config_entry.model.sql"
apis:
  - protocol: rpc
    path: "db.table.infra_config_entry"
    description:
      zh: >
          权威表 infra_config_entry（唯一业务写入所有者：W-INFRA；RDS 方言与适配器待定）
      en: >
          Authoritative table infra_config_entry (sole write owner: W-INFRA; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/infra/models/config_entry.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "ConfigEntryRow"
    description: {zh: "分层配置与非明文密钥引用", en: "Layered configuration and secret references"}
    schema: {"type":"object","additionalProperties":false,"description":"分层配置与非明文密钥引用 / Layered configuration and secret references｜存储归属 RDS｜唯一写入所有者 W-INFRA｜表 infra_config_entry；主键 PK(id)；唯一约束 UNIQUE(key,scope)；无二级索引；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"key":{"type":"string","description":"key 字段 / Field key"},"scope":{"type":"string","enum":["GLOBAL","SERVICE","WORKER"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"valueJson":{"type":"object","additionalProperties":true,"description":"valueJson 字段 / Field valueJson"},"secretRef":{"type":"string","description":"secretRef 字段 / Field secretRef"},"updatedAt":{"type":"string","format":"date-time","description":"updatedAt 字段 / Field updatedAt"}},"required":["id","key","scope","updatedAt"]}
---
