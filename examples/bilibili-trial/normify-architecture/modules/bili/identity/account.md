---
uid: 71ed6d9c
id: bili.identity.account
parent: bili.identity
state: planned
tags: ["worker:id-account"]
name: {zh: "账号与会话", en: "Accounts and Sessions"}
description:
  zh: >
      注册、密码/短信/二维码/OAuth 登录、令牌刷新、登出与账号注销；写操作幂等。
      
  en: >
      Registration, password/SMS/QR/OAuth login, token refresh, logout and account deletion.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/account/src/service.ts"
  - path: "services/identity/account/src/session.ts"
  - path: "services/identity/account/migrations/0001_account.sql"
  - path: "services/identity/account/tests/account.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/identity/register"
    description:
      zh: >
          注册账号
          
      en: >
          Register account
          
    input: {module: "bili.identity.account", name: "RegisterRequest"}
    output: {module: "bili.identity.account", name: "AccountRecord"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/login"
    description:
      zh: >
          登录并签发令牌
          
      en: >
          Sign in and issue tokens
          
    input: {module: "bili.identity.account", name: "LoginRequest"}
    output: {module: "bili.identity.account", name: "SessionTokens"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/token/refresh"
    description:
      zh: >
          刷新访问令牌
          
      en: >
          Refresh access token
          
    input: {module: "bili.identity.account", name: "SessionTokens"}
    output: {module: "bili.identity.account", name: "SessionTokens"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/logout"
    description:
      zh: >
          登出并作废会话
          
      en: >
          Sign out
          
    input: {module: "bili.identity.account", name: "SessionTokens"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/identity/me"
    description:
      zh: >
          读取当前账号
          
      en: >
          Read current account
          
    output: {module: "bili.identity.account", name: "AccountRecord"}
types:
  - name: "AccountRecord"
    description: {zh: "账号记录", en: "Account record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 account，唯一写入所有者 bili.identity.account","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"loginName":{"type":"string","description":"登录名","minLength":3,"maxLength":32},"email":{"type":"string","description":"邮箱","format":"email"},"phoneMasked":{"type":"string","description":"脱敏手机号"},"status":{"type":"string","enum":["active","locked","deactivated","pending_verification"],"description":"账号状态"},"level":{"type":"integer","description":"等级","minimum":0,"maximum":6},"registeredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"lastLoginAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","loginName","status","level"]}
  - name: "RegisterRequest"
    description: {zh: "注册请求", en: "Registration request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"loginName":{"type":"string","description":"登录名","minLength":3,"maxLength":32},"password":{"type":"string","description":"密码（服务端只存散列）","minLength":8,"maxLength":72},"email":{"type":"string","description":"邮箱","format":"email"},"phone":{"type":"string","description":"手机号","pattern":"^\\+?[0-9]{6,20}$"},"inviteCode":{"type":"string","description":"邀请码"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["loginName","password","idempotencyKey"]}
  - name: "LoginRequest"
    description: {zh: "登录请求", en: "Login request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"loginType":{"type":"string","enum":["password","sms","oauth","qr"],"description":"登录方式"},"identifier":{"type":"string","description":"登录名/手机号/第三方标识"},"credential":{"type":"string","description":"密码或验证码或授权码"},"deviceId":{"type":"string","description":"设备标识"},"clientIp":{"type":"string","description":"客户端 IP"}},"required":["loginType","identifier","credential","deviceId"]}
  - name: "SessionTokens"
    description: {zh: "会话令牌", en: "Session tokens"}
    schema: {"type":"object","additionalProperties":false,"description":"令牌不落明文数据库，只存散列与元数据","properties":{"sessionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"accessToken":{"type":"string","description":"访问令牌（短时）"},"refreshToken":{"type":"string","description":"刷新令牌"},"accessExpiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"refreshExpiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["sessionId","accessToken","refreshToken","accessExpiresAt","userId"]}
deps:
  - kind: call
    to: bili.identity.security
    from_api: "POST /api/v1/identity/login"
    to_api: "POST /api/v1/identity/security/risk-assess"
    label: {zh: "登录前风控评估", en: "Login risk assessment"}
  - kind: call
    to: bili.infra.notify
    from_api: "POST /api/v1/identity/register"
    label: {zh: "下发短信/邮件验证码", en: "Send sms or email code"}
  - kind: call
    to: bili.identity.rbac
    from_api: "POST /api/v1/identity/login"
    to_api: "POST /api/v1/identity/tokens/verify"
    label: {zh: "签发令牌前取角色", en: "Load roles before token issue"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "账号安全事件审计", en: "Audit account events"}
---
