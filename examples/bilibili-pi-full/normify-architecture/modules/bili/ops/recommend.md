---
uid: ee94818e
id: bili.ops.recommend
parent: bili.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "推荐位与运营位", en: "Recommendation slots"}
description:
  zh: >
      首页/分区推荐位配置、生效时间与人工干预
  en: >
      Home and partition slot configuration, effective windows and manual curation
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/recommend/src/slot.ts"
  - path: "services/ops/recommend/tests/slot.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/ops/slot-configs"
    description:
      zh: >
          配置推荐位
      en: >
          Configure a slot
    input: {module: "bili.ops.recommend", name: "SlotRequest"}
    output: {module: "bili.ops.recommend", name: "SlotConfig"}
types:
  - name: "SlotConfig"
    description: {zh: "推荐位配置", en: "Slot config"}
    schema: {"type":"object","description":"推荐位配置 / Slot config","additionalProperties":false,"properties":{"slotId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 slotId（语义见对应领域契约） / Field slotId"},"scene":{"type":"string","enum":["HOME","PARTITION","CHANNEL","LIVE"],"description":"字段 scene（语义见对应领域契约） / Field scene"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"resourceIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 resourceIds（语义见对应领域契约） / Field resourceIds"},"effectiveFrom":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 effectiveFrom（语义见对应领域契约） / Field effectiveFrom"},"effectiveTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 effectiveTo（语义见对应领域契约） / Field effectiveTo"}},"required":["slotId","scene","title","resourceIds","effectiveFrom"]}
  - name: "SlotRequest"
    description: {zh: "推荐位配置写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Slot config write request carrying only client-provided fields"}
    schema: {"type":"object","description":"推荐位配置写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Slot config write request carrying only client-provided fields","additionalProperties":false,"properties":{"slotId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 slotId（语义见对应领域契约） / Field slotId"},"scene":{"type":"string","enum":["HOME","PARTITION","CHANNEL","LIVE"],"description":"字段 scene（语义见对应领域契约） / Field scene"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"resourceIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 resourceIds（语义见对应领域契约） / Field resourceIds"},"effectiveFrom":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 effectiveFrom（语义见对应领域契约） / Field effectiveFrom"},"effectiveTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 effectiveTo（语义见对应领域契约） / Field effectiveTo"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["slotId","scene","title","resourceIds","effectiveFrom","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
