---
uid: b7e1cae1
id: data.premium.t-6ae5ed8a
parent: data.premium
state: planned
tags: ["worker:pm-schedule", "projection:data-contract"]
name: {zh: "FollowSeason", en: "FollowSeason"}
description:
  zh: >
      追番关系
  en: >
      Season follow
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/premium/t-6ae5ed8a.json"
apis: []
types:
  - name: "FollowSeason"
    description: {zh: "追番关系", en: "Season follow"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 season_follow，唯一约束 user_id+season_id","properties":{"followId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"seasonId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"notifyEnabled":{"type":"boolean","description":"是否开启更新提醒"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["followId","userId","seasonId","createdAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
