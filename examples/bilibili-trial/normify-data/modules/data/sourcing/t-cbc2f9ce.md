---
uid: 9603b299
id: data.sourcing.t-cbc2f9ce
parent: data.sourcing
state: planned
tags: ["worker:src-attr", "projection:data-contract"]
name: {zh: "ProvenanceChain", en: "ProvenanceChain"}
description:
  zh: >
      溯源链
  en: >
      Provenance chain
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/sourcing/t-cbc2f9ce.json"
apis: []
types:
  - name: "ProvenanceChain"
    description: {zh: "溯源链", en: "Provenance chain"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 provenance_chain；出现版权争议时作为证据","properties":{"chainId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"assetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"steps":{"type":"array","description":"链路步骤","items":{"type":"object","additionalProperties":false,"properties":{"stepIndex":{"type":"integer","description":"序号","minimum":0},"stage":{"type":"string","enum":["discovered","licensed","fetched","deduped","attributed","ingested","published"],"description":"阶段"},"actor":{"type":"string","description":"执行者（人或服务）"},"detail":{"type":"string","description":"细节"},"occurredAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["stepIndex","stage","occurredAt"]}},"integrityDigest":{"type":"string","description":"链路摘要（防篡改）"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["chainId","assetId","steps","integrityDigest"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
