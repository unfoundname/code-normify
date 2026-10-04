---
uid: fb67be0d
id: data.data.t-a9d8ec55
parent: data.data
state: planned
tags: ["worker:data-steward", "projection:data-contract"]
name: {zh: "MigrationRun", en: "MigrationRun"}
description:
  zh: >
      迁移执行记录
  en: >
      Migration run
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/data/t-a9d8ec55.json"
apis: []
types:
  - name: "MigrationRun"
    description: {zh: "迁移执行记录", en: "Migration run"}
    schema: {"type":"object","additionalProperties":false,"properties":{"runId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"migrationIds":{"type":"array","description":"本次执行的迁移","items":{"type":"string","description":"迁移 id"}},"startedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"finishedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"result":{"type":"string","enum":["succeeded","failed","rolled_back"],"description":"结果"},"dialect":{"type":"string","description":"实际方言"},"failedMigration":{"type":"string","description":"失败迁移 id"}},"required":["runId","migrationIds","startedAt","result"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
