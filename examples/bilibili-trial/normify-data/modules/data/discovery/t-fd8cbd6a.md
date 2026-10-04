---
uid: ac469824
id: data.discovery.t-fd8cbd6a
parent: data.discovery
state: planned
tags: ["worker:disc-rank", "projection:data-contract"]
name: {zh: "RankingEntry", en: "RankingEntry"}
description:
  zh: >
      榜单条目
  en: >
      Ranking entry
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/discovery/t-fd8cbd6a.json"
apis: []
types:
  - name: "RankingEntry"
    description: {zh: "榜单条目", en: "Ranking entry"}
    schema: {"type":"object","additionalProperties":false,"description":"由事件与行为数据批量重算","properties":{"rank":{"type":"integer","description":"名次","minimum":1},"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"score":{"type":"integer","description":"综合分 ×1000","minimum":0},"deltaRank":{"type":"integer","description":"名次变化（可为负）"},"viewCount":{"type":"integer","description":"播放量","minimum":0},"danmakuCount":{"type":"integer","description":"弹幕数","minimum":0},"interactionCount":{"type":"integer","description":"互动数","minimum":0}},"required":["rank","videoId","score"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
---
