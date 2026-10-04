---
uid: c5f9eb4f
id: data.publish.t-e1ca7c5a
parent: data.publish
state: planned
tags: ["worker:pub-catalog", "projection:data-contract"]
name: {zh: "VideoPublishedPayload", en: "VideoPublishedPayload"}
description:
  zh: >
      发布事件载荷
  en: >
      Video published payload
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/publish/t-e1ca7c5a.json"
apis: []
types:
  - name: "VideoPublishedPayload"
    description: {zh: "发布事件载荷", en: "Video published payload"}
    schema: {"type":"object","additionalProperties":false,"description":"publish.video.published 载荷：搜索/推荐/动态/空间统计各自消费","properties":{"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"ownerId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"publishedVersion":{"type":"integer","description":"发布版本","minimum":1},"partitionId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签"}},"visibleAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"indexFields":{"type":"object","additionalProperties":false,"description":"投影到搜索索引的最小字段集","properties":{"title":{"type":"string","description":"标题"},"ownerNickname":{"type":"string","description":"UP 主昵称"},"durationMs":{"type":"integer","description":"时长","minimum":0}},"required":["title"]}},"required":["videoId","publishedVersion","visibleAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
