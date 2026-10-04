---
uid: c9434c28
id: bili.identity.security
parent: bili.identity
state: planned
tags: [planned, "worker:W-IDENTITY", leaf]
name: {zh: "账号安全与风控", en: "Account security and risk control"}
description:
  zh: >
      验证码、登录风险、封禁与解封、凭据策略与登录审计
  en: >
      Captcha, login risk, ban and unban, credential policy and login audit
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/security/src/risk.ts"
  - path: "services/identity/security/src/captcha.ts"
  - path: "services/identity/security/tests/risk.test.ts"
  - path: "services/identity/security/tests/captcha.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/identity/captchas"
    description:
      zh: >
          申请验证码票据
      en: >
          Issue a captcha ticket
    input: {module: "bili.identity.security", name: "CaptchaIssueRequest"}
    output: {module: "bili.identity.security", name: "CaptchaTicket"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/risk-evaluations"
    description:
      zh: >
          风险决策评估
      en: >
          Evaluate account risk
    output: {module: "bili.identity.security", name: "RiskDecision"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/bans"
    description:
      zh: >
          封禁或解封账号
      en: >
          Ban or unban an account
    input: {module: "bili.identity.security", name: "BanRequest"}
types:
  - name: "RiskDecision"
    description: {zh: "风险决策", en: "Risk decision"}
    schema: {"type":"object","description":"风险决策 / Risk decision","additionalProperties":false,"properties":{"allowed":{"type":"boolean","description":"是否允许播放 / Whether playback is allowed"},"riskLevel":{"type":"string","enum":["LOW","MEDIUM","HIGH","CRITICAL"],"description":"风险等级 / Risk level"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"challengeType":{"type":"string","enum":["NONE","SMS","SLIDER","TOTP"],"description":"字段 challengeType（语义见对应领域契约） / Field challengeType"}},"required":["allowed","riskLevel","challengeType"]}
  - name: "CaptchaTicket"
    description: {zh: "验证码票据", en: "Captcha ticket"}
    schema: {"type":"object","description":"验证码票据 / Captcha ticket","additionalProperties":false,"properties":{"ticketId":{"$ref":"urn:normify:bili.contract.common:Id","description":"工单 ID / Ticket id"},"scene":{"type":"string","enum":["REGISTER","LOGIN","COMMENT","DANMAKU","ORDER"],"description":"字段 scene（语义见对应领域契约） / Field scene"},"expireAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"过期时间 / Expire time"}},"required":["ticketId","scene","expireAt"]}
  - name: "LoginAttempt"
    description: {zh: "登录尝试记录", en: "Login attempt"}
    schema: {"type":"object","description":"登录尝试记录 / Login attempt","additionalProperties":false,"properties":{"attemptId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 attemptId（语义见对应领域契约） / Field attemptId"},"accountId":{"$ref":"urn:normify:bili.contract.common:Id","description":"账户 ID / Account id"},"deviceId":{"type":"string","minLength":1,"description":"设备标识 / Device id"},"ipRegion":{"type":"string","minLength":1,"description":"IP 归属地 / Ip region"},"succeeded":{"type":"boolean","description":"字段 succeeded（语义见对应领域契约） / Field succeeded"},"occurredAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"发生时间 / Occurred at"}},"required":["attemptId","accountId","deviceId","ipRegion","succeeded","occurredAt"]}
  - name: "CaptchaIssueRequest"
    description: {zh: "验证码申请请求", en: "Captcha issue request"}
    schema: {"type":"object","description":"验证码申请请求 / Captcha issue request","additionalProperties":false,"properties":{"scene":{"type":"string","enum":["REGISTER","LOGIN","COMMENT","DANMAKU","ORDER"],"description":"字段 scene（语义见对应领域契约） / Field scene"},"deviceId":{"type":"string","minLength":1,"description":"设备标识 / Device id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["scene","deviceId","idempotencyKey","requestContext"]}
  - name: "BanRequest"
    description: {zh: "封禁或解封请求", en: "Ban request"}
    schema: {"type":"object","description":"封禁或解封请求 / Ban request","additionalProperties":false,"properties":{"targetUserId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 targetUserId（语义见对应领域契约） / Field targetUserId"},"action":{"type":"string","enum":["BAN","UNBAN"],"description":"字段 action（语义见对应领域契约） / Field action"},"durationHours":{"type":"integer","description":"字段 durationHours（语义见对应领域契约） / Field durationHours"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["targetUserId","action","reason","idempotencyKey","requestContext"]}
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
