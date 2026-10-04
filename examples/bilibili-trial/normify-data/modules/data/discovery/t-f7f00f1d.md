---
uid: 800b5a3c
id: data.discovery.t-f7f00f1d
parent: data.discovery
state: planned
tags: ["worker:disc-search", "projection:data-contract"]
name: {zh: "SearchHit", en: "SearchHit"}
description:
  zh: >
      搜索结果条目
  en: >
      Search hit
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/discovery/t-f7f00f1d.json"
apis: []
types:
  - name: "SearchHit"
    description: {zh: "搜索结果条目", en: "Search hit"}
    schema: {"type":"object","additionalProperties":false,"description":"来自搜索投影，允许最终一致与轻微滞后","properties":{"targetType":{"type":"string","description":"目标类型"},"targetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"title":{"type":"string","description":"标题"},"highlightTitle":{"type":"string","description":"高亮标题"},"ownerId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"ownerNickname":{"type":"string","description":"UP 主昵称"},"coverAssetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"durationMs":{"type":"integer","description":"时长毫秒","minimum":0},"playCount":{"type":"integer","description":"播放量","minimum":0},"score":{"type":"integer","description":"相关度 ×1000","minimum":0},"indexUpdatedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["targetType","targetId","title","score"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
