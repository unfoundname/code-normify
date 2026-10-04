---
uid: 062cf027
id: bili.identity.account
parent: bili.identity
state: planned
tags: [planned, "worker:W-IDENTITY", leaf]
name: {zh: "账号与凭证", en: "Account and credentials"}
description:
  zh: >
      注册登录、会话与二次验证、密码与设备管理
  en: >
      Sign-up, login, sessions, two-factor and device management
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/account/src/account.ts"
  - path: "services/identity/account/src/session.ts"
  - path: "services/identity/account/tests/account.test.ts"
  - path: "services/identity/account/tests/session.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/identity/accounts"
    description:
      zh: >
          邮箱注册
      en: >
          Register with email
    input: {module: "bili.identity.account", name: "RegisterRequest"}
    output: {module: "bili.identity.account", name: "AccountView"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/sessions"
    description:
      zh: >
          登录签发会话
      en: >
          Sign in and issue a session
    input: {module: "bili.identity.account", name: "LoginRequest"}
    output: {module: "bili.identity.account", name: "SessionView"}
  - protocol: http
    method: DELETE
    path: "/api/v1/identity/sessions/"
    description:
      zh: >
          注销会话
      en: >
          Revoke the session
    input: {module: "bili.identity.account", name: "RevokeSessionRequest"}
types:
  - name: "AccountView"
    description: {zh: "账号视图", en: "Account view"}
    schema: {"type":"object","description":"账号视图 / Account view","additionalProperties":false,"properties":{"id":{"$ref":"urn:normify:bili.contract.common:Id","description":"实体 ID（字符串统一形态） / Entity id (unified string)"},"mid":{"type":"string","minLength":1,"description":"用户业务号 / User mid"},"nickname":{"type":"string","minLength":1,"description":"昵称 / Nickname"},"phoneMasked":{"type":"string","minLength":1,"description":"字段 phoneMasked（语义见对应领域契约） / Field phoneMasked"},"currentLevel":{"type":"integer","description":"当前等级 / Current level"},"status":{"type":"string","enum":["ACTIVE","BANNED","DEACTIVATED"],"description":"状态 / Status"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["id","mid","nickname","currentLevel","status","createdAt"]}
  - name: "RegisterRequest"
    description: {zh: "注册请求", en: "Register request"}
    schema: {"type":"object","description":"注册请求 / Register request","additionalProperties":false,"properties":{"email":{"type":"string","minLength":1,"format":"email","description":"字段 email（语义见对应领域契约） / Field email"},"password":{"type":"string","minLength":1,"description":"字段 password（语义见对应领域契约） / Field password"},"captchaTicket":{"type":"string","minLength":1,"description":"字段 captchaTicket（语义见对应领域契约） / Field captchaTicket"},"inviteCode":{"type":"string","minLength":1,"description":"字段 inviteCode（语义见对应领域契约） / Field inviteCode"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["email","password","captchaTicket","idempotencyKey","requestContext"]}
  - name: "LoginRequest"
    description: {zh: "登录请求", en: "Login request"}
    schema: {"type":"object","description":"登录请求 / Login request","additionalProperties":false,"properties":{"identifier":{"type":"string","minLength":1,"description":"字段 identifier（语义见对应领域契约） / Field identifier"},"password":{"type":"string","minLength":1,"description":"字段 password（语义见对应领域契约） / Field password"},"deviceId":{"type":"string","minLength":1,"description":"设备标识 / Device id"},"totp":{"type":"string","minLength":1,"description":"字段 totp（语义见对应领域契约） / Field totp"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["identifier","password","deviceId","idempotencyKey","requestContext"]}
  - name: "SessionView"
    description: {zh: "会话视图", en: "Session view"}
    schema: {"type":"object","description":"会话视图 / Session view","additionalProperties":false,"properties":{"sessionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"会话 ID / Session id"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"expireAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"过期时间 / Expire time"},"mfaRequired":{"type":"boolean","description":"字段 mfaRequired（语义见对应领域契约） / Field mfaRequired"}},"required":["sessionId","userId","expireAt","mfaRequired"]}
  - name: "RevokeSessionRequest"
    description: {zh: "撤销会话请求", en: "Revoke session request"}
    schema: {"type":"object","description":"撤销会话请求 / Revoke session request","additionalProperties":false,"properties":{"sessionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"会话 ID / Session id"},"deviceId":{"type":"string","minLength":1,"description":"设备标识 / Device id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["sessionId","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.identity.security
    label: {zh: "登录与注册风控校验", en: "Risk check on sign-in and"}
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
