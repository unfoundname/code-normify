---
uid: 7d409825
id: data.premium.t-fa24bb67
parent: data.premium
state: planned
tags: ["worker:pm-entitle", "projection:data-contract"]
name: {zh: "PlaybackEntitlement", en: "PlaybackEntitlement"}
description:
  zh: >
      观看权益
  en: >
      Playback entitlement
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/premium/t-fa24bb67.json"
apis: []
types:
  - name: "PlaybackEntitlement"
    description: {zh: "观看权益", en: "Playback entitlement"}
    schema: {"type":"object","additionalProperties":false,"description":"即时判定结果，可缓存短时；不写回业务表","properties":{"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"targetType":{"type":"string","description":"对象类型"},"targetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"kind":{"type":"string","enum":["vip_free","vip_only","paid_episode","preview_only","region_blocked","free"],"description":"权益类型"},"validFrom":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"validTo":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"sourceOrderId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"resolvedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["userId","targetType","targetId","kind","validFrom"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
