---
uid: da31dabe
id: bili.assembly.testkit
parent: bili.assembly
state: planned
tags: [planned, "worker:W-ASSEMBLY", leaf]
name: {zh: "契约测试工具", en: "Contract test kit"}
description:
  zh: >
      共享测试夹具、契约校验、Mock 服务器与数据库隔离工具
  en: >
      Shared fixtures, contract validation, mock servers and database isolation helpers
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/api/test/contract-toolkit.ts"
  - path: "tools/verify-contracts.mjs"
  - path: "tools/tests/verify-contracts.test.mjs"
  - path: "apps/api/tests/tests/contract-toolkit.test.ts"
apis:
  - protocol: file
    path: "tools/verify-contracts.mjs"
    description:
      zh: >
          契约与 fixture 校验入口
      en: >
          Contract and fixture verification entry
types:
  - name: "ContractFixture"
    description: {zh: "契约夹具", en: "Contract fixture"}
    schema: {"type":"object","description":"契约夹具 / Contract fixture","additionalProperties":false,"properties":{"moduleId":{"type":"string","minLength":1,"description":"字段 moduleId（语义见对应领域契约） / Field moduleId"},"typeName":{"type":"string","minLength":1,"description":"字段 typeName（语义见对应领域契约） / Field typeName"},"instanceJson":{"type":"string","minLength":1,"description":"字段 instanceJson（语义见对应领域契约） / Field instanceJson"}},"required":["moduleId","typeName","instanceJson"]}
deps:
  - kind: call
    to: bili.infra.db
    label: {zh: "提供隔离测试数据库", en: "Provide isolated test"}
---
