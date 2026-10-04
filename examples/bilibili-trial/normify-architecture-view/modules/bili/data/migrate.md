---
uid: c241f3e8
id: bili.data.migrate
parent: bili.data
state: planned
tags: ["worker:data-steward"]
name: {zh: "迁移执行器", en: "Migration Runner"}
description:
  zh: >
      按顺序执行迁移文件、校验 schema 漂移、阻断破坏性变更；每个域迁移文件由该域 Worker 独占。
      
  en: >
      Ordered migration execution, schema drift detection, blocking destructive changes.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "db/migrator/src/runner.ts"
  - path: "db/migrator/src/drift-check.ts"
  - path: "db/migrator/tests/runner.test.ts"
apis: []
types:
  - name: "MigrationRun"
    description: {zh: "迁移执行记录", en: "Migration run"}
    schema: {"type":"object","additionalProperties":false,"properties":{"runId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"migrationIds":{"type":"array","description":"本次执行的迁移","items":{"type":"string","description":"迁移 id"}},"startedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"finishedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"result":{"type":"string","enum":["succeeded","failed","rolled_back"],"description":"结果"},"dialect":{"type":"string","description":"实际方言"},"failedMigration":{"type":"string","description":"失败迁移 id"}},"required":["runId","migrationIds","startedAt","result"]}
  - name: "SchemaDriftReport"
    description: {zh: "Schema 漂移报告", en: "Schema drift report"}
    schema: {"type":"object","additionalProperties":false,"properties":{"checkedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"expectedTables":{"type":"integer","description":"期望表数","minimum":0},"actualTables":{"type":"integer","description":"实际表数","minimum":0},"missingObjects":{"type":"array","description":"缺失对象","items":{"type":"string","description":"对象名"}},"extraObjects":{"type":"array","description":"多余对象","items":{"type":"string","description":"对象名"}},"blocking":{"type":"boolean","description":"是否阻断发布"}},"required":["checkedAt","missingObjects","blocking"]}
---
