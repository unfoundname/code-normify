---
uid: fce11c0e
id: data.sourcing.t-aae1a40c
parent: data.sourcing
state: planned
tags: ["worker:src-ingest", "projection:data-contract"]
name: {zh: "IngestRequest", en: "IngestRequest"}
description:
  zh: >
      导入请求
  en: >
      Ingest request
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/sourcing/t-aae1a40c.json"
apis: []
types:
  - name: "IngestRequest"
    description: {zh: "导入请求", en: "Ingest request"}
    schema: {"type":"object","additionalProperties":false,"description":"导入必须携带许可与归属，缺少两者直接拒绝","properties":{"assetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"sourceId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"licenseId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"attributionId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"title":{"type":"string","description":"导入标题","maxLength":80},"partitionId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"tags":{"type":"array","description":"标签","items":{"type":"string","description":"标签","maxLength":20},"maxItems":10},"ownerId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"visibility":{"$ref":"urn:normify:data.contract.t-44cc0b8c:Visibility"},"scheduleAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"idempotencyKey":{"$ref":"urn:normify:data.contract.t-8cc5302d:IdempotencyKey"}},"required":["assetId","sourceId","licenseId","title","partitionId","ownerId","idempotencyKey"]}
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
    to: data.contract.t-8cc5302d
    label: {zh: "类型引用", en: "Type reference"}
---
