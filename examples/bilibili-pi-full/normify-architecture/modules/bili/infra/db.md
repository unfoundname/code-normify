---
uid: 362c54b6
id: bili.infra.db
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "RDS 访问层", en: "RDS access layer"}
description:
  zh: >
      连接池、事务边界、迁移执行、表所有权校验与仓库边界
  en: >
      Connection pool, transaction boundaries, migration execution, table ownership checks and repository boundaries
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/platform/db/src/repository.ts"
  - path: "services/platform/db/src/transaction.ts"
  - path: "services/platform/db/tests/repository.test.ts"
  - path: "services/platform/db/tests/transaction.test.ts"
apis:
  - protocol: rpc
    path: "db.transaction.run"
    description:
      zh: >
          在事务中执行业务写入
      en: >
          Run business writes in a transaction
    input: {module: "bili.infra.db", name: "TransactionScope"}
    output: {module: "bili.infra.db", name: "TransactionScope"}
  - protocol: rpc
    path: "db.outbox.append"
    description:
      zh: >
          同事务追加 outbox 记录
      en: >
          Append an outbox row in the same transaction
types:
  - name: "TransactionScope"
    description: {zh: "事务范围", en: "Transaction scope"}
    schema: {"type":"object","description":"事务范围 / Transaction scope","additionalProperties":false,"properties":{"transactionId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 transactionId（语义见对应领域契约） / Field transactionId"},"isolation":{"type":"string","enum":["READ_COMMITTED","REPEATABLE_READ","SERIALIZABLE"],"description":"字段 isolation（语义见对应领域契约） / Field isolation"},"tables":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 tables（语义见对应领域契约） / Field tables"}},"required":["transactionId","isolation","tables"]}
deps:
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID 与时间契约", en: "Unified id and time contracts"}
---
