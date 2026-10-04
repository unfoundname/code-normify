---
uid: 0d7cab9e
id: bili.identity.level
parent: bili.identity
state: planned
tags: [planned, "worker:W-IDENTITY", leaf]
name: {zh: "等级与经验", en: "Level and experience"}
description:
  zh: >
      经验规则、等级计算、每日上限与等级权益
  en: >
      Experience rules, level calculation, daily caps and level privileges
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/level/src/level.ts"
  - path: "services/identity/level/tests/level.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/identity/levels/:userId"
    description:
      zh: >
          按用户查询等级（路径参数与类型化 input 一致）
      en: >
          Get level profile by user
    input: {module: "bili.identity.level", name: "LevelQueryRequest"}
    output: {module: "bili.identity.level", name: "LevelProfile"}
  - protocol: kafka
    path: "bili.identity.level-changed"
    description:
      zh: >
          等级变更事件
      en: >
          Level change event
    input: {module: "bili.identity.level", name: "LevelChangedEvent"}
types:
  - name: "LevelProfile"
    description: {zh: "等级档案", en: "Level profile"}
    schema: {"type":"object","description":"等级档案 / Level profile","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"currentLevel":{"type":"integer","description":"当前等级 / Current level"},"currentExp":{"type":"integer","description":"当前经验值 / Current experience"},"nextLevelExp":{"type":"integer","description":"字段 nextLevelExp（语义见对应领域契约） / Field nextLevelExp"},"updatedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"更新时间 / Updated time"}},"required":["userId","currentLevel","currentExp","nextLevelExp","updatedAt"]}
  - name: "LevelChangedEvent"
    description: {zh: "等级变更事件（生产/运输形态）", en: "Level changed event (producer and transport form)"}
    schema: {"type":"object","description":"等级变更事件（生产/运输形态） / Level changed event (producer and transport form)","additionalProperties":false,"properties":{"envelope":{"$ref":"urn:normify:bili.contract.event:EventEnvelope","description":"字段 envelope（语义见对应领域契约） / Field envelope"}},"required":["envelope"]}
  - name: "LevelQueryRequest"
    description: {zh: "等级查询请求", en: "Level query request"}
    schema: {"type":"object","description":"等级查询请求 / Level query request","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"}},"required":["userId"]}
  - name: "LevelProfilePayload"
    description: {zh: "等级变更载荷", en: "Level changed payload"}
    schema: {"type":"object","description":"等级变更载荷 / Level changed payload","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"fromLevel":{"type":"integer","description":"字段 fromLevel（语义见对应领域契约） / Field fromLevel"},"toLevel":{"type":"integer","description":"字段 toLevel（语义见对应领域契约） / Field toLevel"},"expGranted":{"type":"integer","description":"字段 expGranted（语义见对应领域契约） / Field expGranted"}},"required":["userId","fromLevel","toLevel","expGranted"]}
  - name: "LevelChangedConsumedEvent"
    description: {zh: "等级变更事件（消费形态）", en: "Level changed event (consumer form)"}
    schema: {"type":"object","description":"等级变更事件（消费形态） / Level changed event (consumer form)","additionalProperties":false,"properties":{"envelope":{"$ref":"urn:normify:bili.contract.event:EventEnvelope","description":"字段 envelope（语义见对应领域契约） / Field envelope"},"payload":{"$ref":"urn:normify:bili.identity.level:LevelProfilePayload","description":"事件载荷 / Event payload"}},"required":["envelope","payload"]}
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
