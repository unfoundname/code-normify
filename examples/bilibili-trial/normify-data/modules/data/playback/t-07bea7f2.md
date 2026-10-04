---
uid: 563a4b34
id: data.playback.t-07bea7f2
parent: data.playback
state: planned
tags: ["worker:play-grant", "projection:data-contract"]
name: {zh: "EntitlementResolution", en: "EntitlementResolution"}
description:
  zh: >
      权益核验结论
  en: >
      Entitlement resolution
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/playback/t-07bea7f2.json"
apis: []
types:
  - name: "EntitlementResolution"
    description: {zh: "权益核验结论", en: "Entitlement resolution"}
    schema: {"type":"object","additionalProperties":false,"description":"结论只读，不写回业务表","properties":{"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"visibility":{"$ref":"urn:normify:data.contract.t-44cc0b8c:Visibility"},"privacyBlocked":{"type":"boolean","description":"是否被隐私或黑名单拦截"},"regionRestricted":{"type":"array","description":"受限地域","items":{"type":"string","description":"ISO 3166-1 alpha-2"}},"copyrightWindow":{"type":"object","additionalProperties":false,"properties":{"startAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"endAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"licensed":{"type":"boolean","description":"是否在授权期限内"}},"required":["licensed"]},"membershipRequired":{"type":"boolean","description":"是否需要会员"},"membershipOk":{"type":"boolean","description":"会员权益是否满足"},"decision":{"$ref":"urn:normify:data.contract.t-0b2c71e9:AccessDecision"}},"required":["videoId","visibility","membershipRequired","decision"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-44cc0b8c
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-0b2c71e9
    label: {zh: "类型引用", en: "Type reference"}
---
