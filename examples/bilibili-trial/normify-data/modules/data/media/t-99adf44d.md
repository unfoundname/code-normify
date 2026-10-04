---
uid: 415ba584
id: data.media.t-99adf44d
parent: data.media
state: planned
tags: ["worker:med-artwork", "projection:data-contract"]
name: {zh: "CoverCandidate", en: "CoverCandidate"}
description:
  zh: >
      封面候选
  en: >
      Cover candidate
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/media/t-99adf44d.json"
apis: []
types:
  - name: "CoverCandidate"
    description: {zh: "封面候选", en: "Cover candidate"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 cover_candidate","properties":{"candidateId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"assetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"source":{"type":"string","enum":["auto_frame","owner_upload","template"],"description":"来源"},"width":{"type":"integer","description":"宽","minimum":16},"height":{"type":"integer","description":"高","minimum":16},"selected":{"type":"boolean","description":"是否被选为正式封面"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["candidateId","videoId","assetId","source","selected"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
