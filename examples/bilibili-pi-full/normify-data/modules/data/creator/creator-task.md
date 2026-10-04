---
uid: 3504dba6
id: data.creator.creator-task
parent: data.creator
state: planned
tags: [planned, "worker:W-CREATOR", "storage:rds"]
name: {zh: "创作任务", en: "Creator task"}
description:
  zh: >
      任务目标、奖励与截止时间
  en: >
      Task targets, rewards and deadlines
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/ops/models/creator_task.model.sql"
apis:
  - protocol: rpc
    path: "db.table.creator_task"
    description:
      zh: >
          权威表 creator_task（唯一业务写入所有者：W-CREATOR；RDS 方言与适配器待定）
      en: >
          Authoritative table creator_task (sole write owner: W-CREATOR; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/ops/models/creator_task.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "CreatorTaskRow"
    description: {zh: "任务目标、奖励与截止时间", en: "Task targets, rewards and deadlines"}
    schema: {"type":"object","additionalProperties":false,"description":"任务目标、奖励与截止时间 / Task targets, rewards and deadlines｜存储归属 RDS｜唯一写入所有者 W-CREATOR｜表 creator_task；主键 PK(id)；无唯一约束；索引 INDEX(active,deadline)；无外键｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"title":{"type":"string","description":"title 字段 / Field title"},"target":{"type":"string","enum":["VIDEO_COUNT","PLAY_COUNT","FANS","REVENUE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"rewardAmount":{"type":"integer","description":"rewardAmount 字段 / Field rewardAmount"},"deadline":{"type":"string","format":"date-time","description":"deadline 字段 / Field deadline"},"campaignId":{"type":"string","description":"campaignId 字段 / Field campaignId"},"active":{"type":"boolean","description":"active 字段 / Field active"}},"required":["id","title","target","rewardAmount","deadline","active"]}
---
