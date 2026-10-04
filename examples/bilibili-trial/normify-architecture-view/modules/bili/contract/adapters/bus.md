---
uid: 09b8149d
id: bili.contract.adapters.bus
parent: bili.contract.adapters
state: planned
tags: ["worker:contract-adapters"]
name: {zh: "事件总线适配器", en: "Event Bus Adapter"}
description:
  zh: >
      当前实现为 RDS outbox + 轮询派发；MQ 为显式迁移目标，必须携带迁移计划而非运行时猜测兜底。
      
  en: >
      Current implementation is RDS outbox polling; MQ is an explicit migration target with a plan.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/adapters/src/bus/index.ts"
apis: []
types:
  - name: "BusPublishRequest"
    description: {zh: "事件发布请求", en: "Bus publish request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"topic":{"type":"string","description":"逻辑主题，如 publish.video.published"},"partitionKey":{"type":"string","description":"分区键（迁移到 MQ 后生效）"},"envelope":{"$ref":"urn:normify:bili.contract.core.events:EventEnvelope"},"durable":{"type":"boolean","description":"是否要求持久化"}},"required":["topic","envelope","durable"]}
  - name: "BusConsumeRule"
    description: {zh: "消费规则", en: "Consume rule"}
    schema: {"type":"object","additionalProperties":false,"properties":{"consumerGroup":{"type":"string","description":"消费组，MQ 迁移后的隔离单元"},"topics":{"type":"array","description":"订阅主题","items":{"type":"string","description":"主题"}},"concurrency":{"type":"integer","description":"并发度","minimum":1},"dedupeKeyField":{"type":"string","description":"去重键字段"},"onFailure":{"type":"string","enum":["retry","dead_letter","manual_replay"],"description":"失败处理"}},"required":["consumerGroup","topics","onFailure"]}
  - name: "BusMigrationPlan"
    description: {zh: "总线迁移计划", en: "Bus migration plan"}
    schema: {"type":"object","additionalProperties":false,"description":"MQ 未在本次资源清单内，标记为待接入并需显式迁移","properties":{"fromImpl":{"type":"string","enum":["rds_outbox_polling"],"description":"当前实现"},"toImpl":{"type":"string","enum":["kafka","rabbitmq","rocketmq","nats"],"description":"目标实现"},"dualWritePhase":{"type":"boolean","description":"是否双写过渡"},"cutoverSteps":{"type":"array","description":"切换步骤","items":{"type":"string","description":"步骤说明"}},"rollbackPlan":{"type":"string","description":"回滚方案"},"decided":{"type":"boolean","description":"迁移目标是否已决策"}},"required":["fromImpl","toImpl","dualWritePhase","cutoverSteps","decided"]}
---
