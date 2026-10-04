---
uid: b4b603af
id: bili.identity.verify
parent: bili.identity
state: planned
tags: [planned, "worker:W-IDENTITY", leaf]
name: {zh: "实名认证与防沉迷", en: "Real-name verification and minor protection"}
description:
  zh: >
      证件与活体核验、未成年人模式、时长与消费限制
  en: >
      Document and liveness verification, minor mode, playtime and spending limits
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/verify/src/realname.ts"
  - path: "services/identity/verify/tests/realname.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/identity/real-name-profiles"
    description:
      zh: >
          提交实名信息
      en: >
          Submit real-name data
    input: {module: "bili.identity.verify", name: "RealNameSubmitRequest"}
    output: {module: "bili.identity.verify", name: "RealNameProfile"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/minor-limits"
    description:
      zh: >
          校验未成年人限制
      en: >
          Check minor protection limits
    input: {module: "bili.identity.verify", name: "MinorLimitCheckRequest"}
types:
  - name: "RealNameProfile"
    description: {zh: "实名档案", en: "Real-name profile"}
    schema: {"type":"object","description":"实名档案 / Real-name profile","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"realNameMasked":{"type":"string","minLength":1,"description":"脱敏姓名 / Masked real name"},"verifyMethod":{"type":"string","enum":["ID_CARD","PASSPORT","FACE"],"description":"核验方式 / Verification method"},"verifiedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 verifiedAt（语义见对应领域契约） / Field verifiedAt"},"minorMode":{"type":"boolean","description":"未成年人模式 / Minor mode"},"guardianId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 guardianId（语义见对应领域契约） / Field guardianId"}},"required":["userId","realNameMasked","verifyMethod","verifiedAt","minorMode"]}
  - name: "RealNameSubmitRequest"
    description: {zh: "实名提交请求", en: "Real-name submission"}
    schema: {"type":"object","description":"实名提交请求 / Real-name submission","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"realName":{"type":"string","minLength":1,"description":"字段 realName（语义见对应领域契约） / Field realName"},"idNumber":{"type":"string","minLength":1,"description":"字段 idNumber（语义见对应领域契约） / Field idNumber"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["userId","realName","idNumber","idempotencyKey","requestContext"]}
  - name: "MinorLimitCheckRequest"
    description: {zh: "未成年人限制校验请求", en: "Minor limit check request"}
    schema: {"type":"object","description":"未成年人限制校验请求 / Minor limit check request","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"action":{"type":"string","enum":["PLAY","SPEND","DANMAKU"],"description":"字段 action（语义见对应领域契约） / Field action"},"amountMoney":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 amountMoney（语义见对应领域契约） / Field amountMoney"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["userId","action","idempotencyKey","requestContext"]}
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
