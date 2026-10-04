---
uid: 9ff3b39d
id: data.ops.campaign-config
parent: data.ops
state: planned
tags: [planned, "worker:W-OPS", "storage:rds"]
name: {zh: "活动配置", en: "Campaign config"}
description:
  zh: >
      活动、奖励规则与状态
  en: >
      Campaigns, reward rules and status
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/campaign_config.model.sql"
apis:
  - protocol: rpc
    path: "db.table.ops_campaign_config"
    description:
      zh: >
          权威表 ops_campaign_config（唯一业务写入所有者：W-OPS；RDS 方言与适配器待定）
      en: >
          Authoritative table ops_campaign_config (sole write owner: W-OPS; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/campaign_config.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CampaignConfigRow"
    description: {zh: "活动、奖励规则与状态", en: "Campaigns, reward rules and status"}
    schema: {"type":"object","additionalProperties":false,"description":"活动、奖励规则与状态 / Campaigns, reward rules and status｜存储归属 RDS｜唯一写入所有者 W-OPS｜表 ops_campaign_config；主键 PK(id)；无唯一约束；索引 INDEX(status,startAt)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"title":{"type":"string","description":"title 字段 / Field title"},"entryPage":{"type":"string","description":"entryPage 字段 / Field entryPage"},"rewardRule":{"type":"string","description":"rewardRule 字段 / Field rewardRule"},"startAt":{"type":"string","format":"date-time","description":"startAt 字段 / Field startAt"},"endAt":{"type":"string","format":"date-time","description":"endAt 字段 / Field endAt"},"status":{"type":"string","enum":["DRAFT","RUNNING","ENDED"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"}},"required":["id","title","entryPage","rewardRule","startAt","endAt","status"]}
---
