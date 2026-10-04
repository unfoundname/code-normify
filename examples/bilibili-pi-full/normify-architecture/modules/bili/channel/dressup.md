---
uid: bf72127d
id: bili.channel.dressup
parent: bili.channel
state: planned
tags: [planned, "worker:W-CHANNEL", leaf]
name: {zh: "装扮", en: "Profile dress-up"}
description:
  zh: >
      装扮道具、卡片背景、粉丝牌与有效期
  en: >
      Dress-up items, card backgrounds, fan badges and validity
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/channel/dressup/src/dressup.ts"
  - path: "services/channel/dressup/tests/dressup.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/channel/dressup"
    description:
      zh: >
          购买或激活装扮
      en: >
          Buy or activate a dress-up
    input: {module: "bili.channel.dressup", name: "DressupItemRequest"}
    output: {module: "bili.channel.dressup", name: "DressupItem"}
types:
  - name: "DressupItem"
    description: {zh: "装扮项", en: "Dress-up item"}
    schema: {"type":"object","description":"装扮项 / Dress-up item","additionalProperties":false,"properties":{"dressupId":{"$ref":"urn:normify:bili.contract.common:Id","description":"装扮 ID / Dressup id"},"ownerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"所有者用户 ID / Owner user id"},"kind":{"type":"string","enum":["CARD","SPACE","BADGE","THEME"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"assetRef":{"type":"string","minLength":1,"description":"字段 assetRef（语义见对应领域契约） / Field assetRef"},"validTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"失效时间 / Valid to"}},"required":["dressupId","ownerId","kind","assetRef"]}
  - name: "DressupItemRequest"
    description: {zh: "装扮项写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Dress-up item write request carrying only client-provided fields"}
    schema: {"type":"object","description":"装扮项写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Dress-up item write request carrying only client-provided fields","additionalProperties":false,"properties":{"dressupId":{"$ref":"urn:normify:bili.contract.common:Id","description":"装扮 ID / Dressup id"},"kind":{"type":"string","enum":["CARD","SPACE","BADGE","THEME"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"assetRef":{"type":"string","minLength":1,"description":"字段 assetRef（语义见对应领域契约） / Field assetRef"},"validTo":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"失效时间 / Valid to"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["dressupId","kind","assetRef","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.identity.profile
    label: {zh: "装扮渲染到个人空间", en: "Dress-up renders in the"}
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
