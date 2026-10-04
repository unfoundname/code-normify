---
uid: 78056f13
id: data.ops.slot-config
parent: data.ops
state: planned
tags: [planned, "worker:W-OPS", "storage:rds"]
name: {zh: "推荐位配置", en: "Slot config"}
description:
  zh: >
      运营位、生效窗口与人工位
  en: >
      Operations slots, effective windows and curated items
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/slot_config.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ops_slot_config"
    description:
      zh: >
          权威表 ops_slot_config（唯一业务写入所有者：W-OPS；RDS 方言与适配器待定）
      en: >
          Authoritative table ops_slot_config (sole write owner: W-OPS; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/slot_config.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "SlotConfigRow"
    description: {zh: "运营位、生效窗口与人工位", en: "Operations slots, effective windows and curated items"}
    schema: {"type":"object","additionalProperties":false,"description":"运营位、生效窗口与人工位 / Operations slots, effective windows and curated items｜存储归属 RDS｜唯一写入所有者 W-OPS｜表 ops_slot_config；主键 PK(id)；无唯一约束；索引 INDEX(scene,status,effectiveFrom)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"scene":{"type":"string","enum":["HOME","PARTITION","CHANNEL","LIVE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"title":{"type":"string","description":"title 字段 / Field title"},"resourceIds":{"type":"array","items":{"type":"string"},"description":"resourceIds 字段 / Field resourceIds"},"effectiveFrom":{"type":"string","format":"date-time","description":"effectiveFrom 字段 / Field effectiveFrom"},"effectiveTo":{"type":"string","format":"date-time","description":"effectiveTo 字段 / Field effectiveTo"},"status":{"type":"string","enum":["DRAFT","ACTIVE","EXPIRED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"}},"required":["id","scene","title","resourceIds","effectiveFrom","status"]}
---
