---
uid: ad26f8fb
id: bili.identity.security
parent: bili.identity
state: planned
tags: ["worker:id-security"]
name: {zh: "账号安全与风控", en: "Account Security and Risk"}
description:
  zh: >
      二次验证、设备会话管理、登录风控评分、密码策略与撞库防护；风险动作可强制二次验证。
      
  en: >
      Two-factor, device sessions, login risk scoring, password policy and credential-stuffing protection.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/security/src/service.ts"
  - path: "services/identity/security/src/risk.ts"
  - path: "services/identity/security/migrations/0001_security.sql"
  - path: "services/identity/security/tests/risk.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/identity/security/risk-assess"
    description:
      zh: >
          评估登录风险
          
      en: >
          Assess login risk
          
    input: {module: "bili.identity.account", name: "LoginRequest"}
    output: {module: "bili.identity.security", name: "RiskAssessment"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/security/two-factor"
    description:
      zh: >
          绑定/启用二次验证
          
      en: >
          Bind two-factor
          
    input: {module: "bili.identity.security", name: "TwoFactorBinding"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/identity/security/sessions"
    description:
      zh: >
          列出设备会话
          
      en: >
          List device sessions
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.identity.security", name: "DeviceSessionPage"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/security/sessions/{id}/revoke"
    description:
      zh: >
          远程下线设备
          
      en: >
          Revoke device session
          
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "two_factor_binding"
    description:
      zh: >
          二次验证绑定表（唯一写入所有者：账号安全服务）
          
      en: >
          Two-factor table
          
types:
  - name: "TwoFactorBinding"
    description: {zh: "二次验证绑定", en: "Two-factor binding"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 two_factor_binding","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"method":{"type":"string","enum":["totp","sms","email","passkey"],"description":"方式"},"secretRef":{"type":"string","description":"密钥引用（不落明文）"},"enabled":{"type":"boolean","description":"是否启用"},"boundAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"recoveryCodeCount":{"type":"integer","description":"剩余恢复码数量","minimum":0}},"required":["userId","method","enabled"]}
  - name: "DeviceSession"
    description: {zh: "设备会话", en: "Device session"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 device_session，索引 user_id+last_seen_at","properties":{"sessionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"deviceId":{"type":"string","description":"设备标识"},"deviceName":{"type":"string","description":"设备名"},"clientIp":{"type":"string","description":"来源 IP"},"userAgent":{"type":"string","description":"UA"},"issuedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"lastSeenAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"revokedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"riskLevel":{"type":"string","enum":["low","medium","high"],"description":"风险级别"}},"required":["sessionId","userId","deviceId","riskLevel"]}
  - name: "DeviceSessionPage"
    description: {zh: "设备会话分页", en: "Device session page"}
    schema: {"type":"object","additionalProperties":false,"properties":{"items":{"type":"array","description":"会话条目","items":{"$ref":"urn:normify:bili.identity.security:DeviceSession"}},"page":{"$ref":"urn:normify:bili.contract.core.paging:PageMeta"}},"required":["items","page"]}
  - name: "RiskAssessment"
    description: {zh: "风控评估", en: "Risk assessment"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 risk_assessment","properties":{"assessmentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"loginType":{"type":"string","description":"登录方式"},"score":{"type":"integer","description":"风险分 0-100","minimum":0,"maximum":100},"level":{"type":"string","enum":["low","medium","high"],"description":"风险级别"},"signals":{"type":"array","description":"命中信号","items":{"type":"string","description":"信号码"}},"action":{"type":"string","enum":["allow","require_2fa","require_captcha","deny","lock_account"],"description":"处置"},"assessedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["assessmentId","score","level","action"]}
  - name: "PasswordPolicy"
    description: {zh: "密码策略", en: "Password policy"}
    schema: {"type":"object","additionalProperties":false,"properties":{"minLength":{"type":"integer","description":"最小长度","minimum":8},"requireMixedCase":{"type":"boolean","description":"需大小写混合"},"requireDigit":{"type":"boolean","description":"需数字"},"requireSymbol":{"type":"boolean","description":"需符号"},"maxAgeDays":{"type":"integer","description":"最长有效期天","minimum":0},"lockThreshold":{"type":"integer","description":"锁定阈值次数","minimum":1}},"required":["minLength","lockThreshold"]}
deps:
  - kind: call
    to: bili.infra.notify
    label: {zh: "下发二次验证码", en: "Send 2FA code"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "安全事件审计", en: "Audit security events"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "发布账号安全事件", en: "Publish security events"}
---
