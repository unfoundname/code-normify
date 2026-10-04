---
uid: 32d144a1
id: data.infra.t-6cdb05fa
parent: data.infra
state: planned
tags: ["worker:infra-cdn", "projection:data-contract"]
name: {zh: "CdnPurgeRequest", en: "CdnPurgeRequest"}
description:
  zh: >
      刷新请求
  en: >
      Purge request
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/infra/t-6cdb05fa.json"
apis: []
types:
  - name: "CdnPurgeRequest"
    description: {zh: "刷新请求", en: "Purge request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"assetClass":{"type":"string","description":"资源类别"},"paths":{"type":"array","description":"刷新路径","items":{"type":"string","description":"路径"}},"reason":{"type":"string","description":"原因（下架/替换）"},"requestedBy":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"requestedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["paths","reason","requestedBy"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
