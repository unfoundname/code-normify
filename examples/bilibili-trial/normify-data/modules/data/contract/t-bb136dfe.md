---
uid: 8d0f36db
id: data.contract.t-bb136dfe
parent: data.contract
state: planned
tags: ["worker:contract-adapters", "projection:data-contract"]
name: {zh: "BusMigrationPlan", en: "BusMigrationPlan"}
description:
  zh: >
      总线迁移计划
  en: >
      Bus migration plan
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-bb136dfe.json"
apis: []
types:
  - name: "BusMigrationPlan"
    description: {zh: "总线迁移计划", en: "Bus migration plan"}
    schema: {"type":"object","additionalProperties":false,"description":"MQ 未在本次资源清单内，标记为待接入并需显式迁移","properties":{"fromImpl":{"type":"string","enum":["rds_outbox_polling"],"description":"当前实现"},"toImpl":{"type":"string","enum":["kafka","rabbitmq","rocketmq","nats"],"description":"目标实现"},"dualWritePhase":{"type":"boolean","description":"是否双写过渡"},"cutoverSteps":{"type":"array","description":"切换步骤","items":{"type":"string","description":"步骤说明"}},"rollbackPlan":{"type":"string","description":"回滚方案"},"decided":{"type":"boolean","description":"迁移目标是否已决策"}},"required":["fromImpl","toImpl","dualWritePhase","cutoverSteps","decided"]}
---
