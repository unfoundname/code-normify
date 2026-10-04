---
uid: f52cfd64
id: bili.identity.verify
parent: bili.identity
state: planned
tags: ["worker:id-verify"]
name: {zh: "实名与未成年人保护", en: "Real-name and Minor Protection"}
description:
  zh: >
      实名认证状态机、第三方核验厂商待接入、未成年人模式与消费限制。
      
  en: >
      Real-name verification state machine, pending third-party vendor, minor mode and spend limits.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/verify/src/service.ts"
  - path: "services/identity/verify/src/minor-protection.ts"
  - path: "services/identity/verify/migrations/0001_verification.sql"
  - path: "services/identity/verify/tests/verify.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/identity/verifications"
    description:
      zh: >
          提交实名认证
          
      en: >
          Submit verification
          
    input: {module: "bili.identity.verify", name: "RealNameVerification"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/identity/verifications/me"
    description:
      zh: >
          查询本人实名状态
          
      en: >
          Read own verification status
          
    output: {module: "bili.identity.verify", name: "RealNameVerification"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/verifications/{id}/callback"
    description:
      zh: >
          接收厂商核验回调
          
      en: >
          Receive vendor callback
          
    input: {module: "bili.identity.verify", name: "RealNameVerification"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/identity/minor-protection"
    description:
      zh: >
          读取未成年人保护策略
          
      en: >
          Read minor protection
          
    output: {module: "bili.identity.verify", name: "MinorProtection"}
types:
  - name: "RealNameVerification"
    description: {zh: "实名认证记录", en: "Real-name verification"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 real_name_verification","properties":{"verificationId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"state":{"type":"string","enum":["submitted","vendor_pending","verified","rejected","expired"],"description":"状态机"},"method":{"type":"string","enum":["id_card_two_factor","id_card_three_factor","face","enterprise"],"description":"方式"},"vendor":{"type":"string","description":"核验厂商，待接入时为 pending_decision"},"vendorRequestId":{"type":"string","description":"厂商请求号"},"submittedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"decidedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"rejectReason":{"type":"string","description":"拒绝原因"},"idHashDigest":{"type":"string","description":"证件号不可逆散列（不落明文）"}},"required":["verificationId","userId","state","method","submittedAt"]}
  - name: "MinorProtection"
    description: {zh: "未成年人保护", en: "Minor protection"}
    schema: {"type":"object","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ageBand":{"type":"string","enum":["under_8","8_to_16","16_to_18","adult","unknown"],"description":"年龄段"},"guardianBound":{"type":"boolean","description":"是否绑定监护人"},"dailySpendLimit":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"nightCurfewEnabled":{"type":"boolean","description":"是否启用宵禁"},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","ageBand","updatedAt"]}
deps:
  - kind: reference
    to: bili.contract.adapters.capabilities
    label: {zh: "核验厂商待接入", en: "Verification vendor pending"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "实名结果事件", en: "Publish verification result"}
---
