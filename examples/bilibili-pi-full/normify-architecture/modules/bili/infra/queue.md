---
uid: 658e3f09
id: bili.infra.queue
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "消息队列迁移适配", en: "MQ migration adapter"}
description:
  zh: >
      先用 RDS outbox，后续 MQ 作为显式迁移的适配层与双写校验
  en: >
      Start with the RDS outbox; MQ is an explicit migration adapter with dual-write verification
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/platform/queue/src/mq-adapter.ts"
  - path: "services/platform/queue/tests/mq-adapter.test.ts"
apis:
  - protocol: amqp
    path: "platform.events"
    description:
      zh: >
          发布到 MQ（迁移后启用）
      en: >
          Publish to MQ after migration
    input: {module: "bili.infra.queue", name: "MqPublishRequest"}
types:
  - name: "MqPublishRequest"
    description: {zh: "MQ 发布请求", en: "MQ publish request"}
    schema: {"type":"object","description":"MQ 发布请求 / MQ publish request","additionalProperties":false,"properties":{"topic":{"type":"string","minLength":1,"description":"字段 topic（语义见对应领域契约） / Field topic"},"partitionKey":{"type":"string","minLength":1,"description":"字段 partitionKey（语义见对应领域契约） / Field partitionKey"},"envelope":{"$ref":"urn:normify:bili.contract.event:EventEnvelope","description":"字段 envelope（语义见对应领域契约） / Field envelope"}},"required":["topic","partitionKey","envelope"]}
deps:
  - kind: event
    to: bili.infra.outbox
    label: {zh: "保持 outbox 为唯一事实来源", en: "Keep the outbox as the single"}
---
