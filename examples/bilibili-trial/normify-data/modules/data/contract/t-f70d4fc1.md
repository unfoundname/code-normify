---
uid: 5e66c513
id: data.contract.t-f70d4fc1
parent: data.contract
state: planned
tags: ["worker:contract-adapters", "projection:data-contract"]
name: {zh: "CapabilityBinding", en: "CapabilityBinding"}
description:
  zh: >
      能力绑定
  en: >
      Capability binding
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-f70d4fc1.json"
apis: []
types:
  - name: "CapabilityBinding"
    description: {zh: "能力绑定", en: "Capability binding"}
    schema: {"type":"object","additionalProperties":false,"properties":{"capability":{"type":"string","description":"能力名"},"endpoint":{"type":"string","description":"端点，待配置"},"credentialRef":{"type":"string","description":"密钥引用（不落明文）"},"configured":{"type":"boolean","description":"是否已配置"},"healthCheckedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["capability","configured"]}
deps:
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
