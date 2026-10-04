---
uid: 3b3bffd0
id: data.premium.t-9cedc8a7
parent: data.premium
state: planned
tags: ["worker:pm-schedule", "projection:data-contract"]
name: {zh: "SeasonRating", en: "SeasonRating"}
description:
  zh: >
      评分与短评
  en: >
      Season rating
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/premium/t-9cedc8a7.json"
apis: []
types:
  - name: "SeasonRating"
    description: {zh: "评分与短评", en: "Season rating"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 season_rating，唯一约束 user_id+season_id","properties":{"ratingId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"seasonId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"score":{"type":"integer","description":"评分 1-10","minimum":1,"maximum":10},"content":{"type":"string","description":"短评","maxLength":500},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"updatedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["ratingId","userId","seasonId","score","createdAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
