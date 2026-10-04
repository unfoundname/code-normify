---
uid: fff3769e
id: data.contract.t-0fe003cb
parent: data.contract
state: planned
tags: ["worker:contract-adapters", "projection:data-contract"]
name: {zh: "ExternalCapability", en: "ExternalCapability"}
description:
  zh: >
      外部能力登记
  en: >
      External capability registry entry
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-0fe003cb.json"
apis: []
types:
  - name: "ExternalCapability"
    description: {zh: "外部能力登记", en: "External capability registry entry"}
    schema: {"type":"object","additionalProperties":false,"description":"用户仅明确提供服务器/RDS/OSS，其余必须标记为待接入","properties":{"capability":{"type":"string","enum":["redis_cache","message_queue","search_engine","cdn","rtc","payment_gateway","sms","push","drm","object_storage","rds"],"description":"能力"},"provider":{"type":"string","description":"候选实现，未决策时写 pending_decision"},"deployment":{"type":"string","enum":["user_provided","self_hosted_on_server","external_saas","pending_decision"],"description":"部署形态"},"status":{"type":"string","enum":["planned","binding_pending","connected"],"description":"接入状态"},"notes":{"type":"string","description":"说明"}},"required":["capability","deployment","status"]}
---
