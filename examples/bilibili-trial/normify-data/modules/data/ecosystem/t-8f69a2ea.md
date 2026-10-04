---
uid: 787a7f66
id: data.ecosystem.t-8f69a2ea
parent: data.ecosystem
state: planned
tags: ["worker:eco-esports", "projection:data-contract"]
name: {zh: "EsportsMatch", en: "EsportsMatch"}
description:
  zh: >
      赛事对阵
  en: >
      Esports match
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/ecosystem/t-8f69a2ea.json"
apis: []
types:
  - name: "EsportsMatch"
    description: {zh: "赛事对阵", en: "Esports match"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 esports_match，索引 tournament_id+scheduled_at","properties":{"matchId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"tournamentId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"round":{"type":"string","description":"轮次"},"teamA":{"type":"string","description":"队伍 A"},"teamB":{"type":"string","description":"队伍 B"},"scheduledAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"scoreA":{"type":"integer","description":"比分 A","minimum":0},"scoreB":{"type":"integer","description":"比分 B","minimum":0},"state":{"type":"string","enum":["scheduled","live","finished","postponed","cancelled"],"description":"状态"},"streamRoomId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"vodVideoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"}},"required":["matchId","tournamentId","teamA","teamB","scheduledAt","state"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
