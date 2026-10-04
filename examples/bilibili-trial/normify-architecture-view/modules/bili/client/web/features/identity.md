---
uid: 0488d3eb
id: bili.client.web.features.identity
parent: bili.client.web.features
state: planned
tags: ["worker:web-identity"]
name: {zh: "身份与空间前端", en: "Identity Feature"}
description:
  zh: >
      登录注册、二次验证、实名提交、个人资料编辑、隐私与黑名单、个人空间页；只调用领域 API，不直连数据库。
      
  en: >
      Sign-in, 2FA, verification, profile editing, privacy/blacklist and user space pages calling domain APIs only.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/identity/index.ts"
  - path: "apps/web/src/features/identity/pages/LoginPage.tsx"
  - path: "apps/web/src/features/identity/pages/SpacePage.tsx"
  - path: "apps/web/src/features/identity/tests/identity.test.tsx"
apis: []
types:
  - name: "LoginPageState"
    description: {zh: "登录页状态", en: "Login page state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"step":{"type":"string","enum":["identifier","password","sms_code","two_factor","locked"],"description":"步骤"},"riskLevel":{"type":"string","enum":["low","medium","high"],"description":"风险级别"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"},"captchaRequired":{"type":"boolean","description":"是否需要验证码"}},"required":["step"]}
  - name: "SpaceViewModel"
    description: {zh: "个人空间视图模型", en: "Space view model"}
    schema: {"type":"object","additionalProperties":false,"properties":{"profile":{"$ref":"urn:normify:bili.identity.profile:UserProfile"},"stats":{"$ref":"urn:normify:bili.identity.profile:UserSpaceView"},"tabs":{"type":"array","description":"可见标签页","items":{"type":"string","enum":["home","dynamic","video","favorite","collection"],"description":"标签"}},"isSelf":{"type":"boolean","description":"是否本人"},"blockedByMe":{"type":"boolean","description":"是否已被我拉黑"}},"required":["profile","tabs","isSelf"]}
deps:
  - kind: call
    to: bili.identity.account
    to_api: "POST /api/v1/identity/login"
    label: {zh: "登录注册与令牌", en: "Sign-in and tokens"}
  - kind: call
    to: bili.identity.security
    to_api: "POST /api/v1/identity/security/risk-assess"
    label: {zh: "二次验证与会话管理", en: "Two-factor and sessions"}
  - kind: call
    to: bili.identity.profile
    to_api: "GET /api/v1/users/{userId}/space"
    label: {zh: "资料与空间数据", en: "Profile and space data"}
  - kind: call
    to: bili.identity.verify
    to_api: "GET /api/v1/identity/verifications/me"
    label: {zh: "实名认证状态", en: "Verification state"}
  - kind: reference
    to: bili.contract.core.errors
    label: {zh: "统一错误形态", en: "Unified error shape"}
---
