---
uid: 647b544b
id: bili.contract.adapters.capabilities
parent: bili.contract.adapters
state: planned
tags: ["worker:contract-adapters"]
name: {zh: "外部能力适配器", en: "External Capability Adapters"}
description:
  zh: >
      Redis/搜索/CDN/RTC/支付/短信等未由用户提供的资源统一登记为待接入适配器，含降级策略与绑定状态。
      
  en: >
      Redis, search, CDN, RTC, payment and SMS registered as to-be-integrated adapters with fallback policy.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/adapters/src/capabilities/index.ts"
apis: []
types:
  - name: "ExternalCapability"
    description: {zh: "外部能力登记", en: "External capability registry entry"}
    schema: {"type":"object","additionalProperties":false,"description":"用户仅明确提供服务器/RDS/OSS，其余必须标记为待接入","properties":{"capability":{"type":"string","enum":["redis_cache","message_queue","search_engine","cdn","rtc","payment_gateway","sms","push","drm","object_storage","rds"],"description":"能力"},"provider":{"type":"string","description":"候选实现，未决策时写 pending_decision"},"deployment":{"type":"string","enum":["user_provided","self_hosted_on_server","external_saas","pending_decision"],"description":"部署形态"},"status":{"type":"string","enum":["planned","binding_pending","connected"],"description":"接入状态"},"notes":{"type":"string","description":"说明"}},"required":["capability","deployment","status"]}
  - name: "CapabilityBinding"
    description: {zh: "能力绑定", en: "Capability binding"}
    schema: {"type":"object","additionalProperties":false,"properties":{"capability":{"type":"string","description":"能力名"},"endpoint":{"type":"string","description":"端点，待配置"},"credentialRef":{"type":"string","description":"密钥引用（不落明文）"},"configured":{"type":"boolean","description":"是否已配置"},"healthCheckedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["capability","configured"]}
  - name: "CapabilityFallback"
    description: {zh: "降级策略", en: "Fallback policy"}
    schema: {"type":"object","additionalProperties":false,"description":"禁止静默兜底切换实现","properties":{"capability":{"type":"string","description":"能力名"},"primaryPath":{"type":"string","description":"主路径"},"fallbackPath":{"type":"string","enum":["fail_fast","read_through_rds","serve_stale_cache","queue_and_retry","degrade_feature"],"description":"降级动作"},"userVisible":{"type":"boolean","description":"用户是否可见降级"}},"required":["capability","fallbackPath"]}
---
