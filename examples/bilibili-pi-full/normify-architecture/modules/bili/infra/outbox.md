---
uid: e0f4e2a9
id: bili.infra.outbox
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "Outbox 与任务调度", en: "Outbox and job scheduling"}
description:
  zh: >
      outbox 领取、租约、重试退避、死信与幂等消费
  en: >
      Outbox claiming, leases, retry backoff, dead letters and idempotent consumption
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/platform/outbox/src/outbox.ts"
  - path: "services/platform/outbox/src/lease.ts"
  - path: "services/platform/outbox/tests/outbox.test.ts"
  - path: "services/platform/outbox/tests/lease.test.ts"
apis:
  - protocol: rpc
    path: "outbox.claim"
    description:
      zh: >
          领取待投递消息
      en: >
          Claim pending messages
    output: {module: "bili.infra.outbox", name: "OutboxDelivery"}
  - protocol: rpc
    path: "outbox.ack"
    description:
      zh: >
          确认或安排重试
      en: >
          Ack or reschedule
    input: {module: "bili.infra.outbox", name: "OutboxDelivery"}
  - protocol: rpc
    path: "outbox.append"
    description:
      zh: >
          同事务追加出箱消息（携带完整事件封套）
      en: >
          Append an outbox message carrying the full event envelope
    input: {module: "bili.infra.outbox", name: "OutboxAppendRequest"}
    output: {module: "bili.infra.outbox", name: "OutboxDelivery"}
types:
  - name: "OutboxClaim"
    description: {zh: "Outbox 领取", en: "Outbox claim"}
    schema: {"type":"object","description":"Outbox 领取 / Outbox claim","additionalProperties":false,"properties":{"messageId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 messageId（语义见对应领域契约） / Field messageId"},"consumerId":{"type":"string","minLength":1,"description":"字段 consumerId（语义见对应领域契约） / Field consumerId"},"leaseUntil":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"租约到期时间 / Lease expiry"},"attempt":{"type":"integer","description":"已重试次数 / Attempt count"}},"required":["messageId","consumerId","leaseUntil","attempt"]}
  - name: "OutboxAppendRequest"
    description: {zh: "出箱追加请求", en: "Outbox append request"}
    schema: {"type":"object","description":"出箱追加请求 / Outbox append request","additionalProperties":false,"properties":{"topic":{"type":"string","minLength":1,"description":"字段 topic（语义见对应领域契约） / Field topic"},"dedupeKey":{"type":"string","minLength":1,"description":"去重键 / Dedupe key"},"envelope":{"$ref":"urn:normify:bili.contract.event:EventEnvelope","description":"字段 envelope（语义见对应领域契约） / Field envelope"}},"required":["topic","dedupeKey","envelope"]}
  - name: "OutboxDelivery"
    description: {zh: "出箱投递结果", en: "Outbox delivery"}
    schema: {"type":"object","description":"出箱投递结果 / Outbox delivery","additionalProperties":false,"properties":{"messageId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 messageId（语义见对应领域契约） / Field messageId"},"topic":{"type":"string","minLength":1,"description":"字段 topic（语义见对应领域契约） / Field topic"},"envelope":{"$ref":"urn:normify:bili.contract.event:EventEnvelope","description":"字段 envelope（语义见对应领域契约） / Field envelope"},"attempt":{"type":"integer","description":"已重试次数 / Attempt count"},"leaseUntil":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"租约到期时间 / Lease expiry"}},"required":["messageId","topic","envelope","attempt","leaseUntil"]}
deps:
  - kind: reference
    to: bili.contract.event
    label: {zh: "事件封套与去重契约", en: "Event envelope and dedupe"}
---
