---
uid: 3c6575f4
id: bili.contract.adapters.rds
parent: bili.contract.adapters
state: planned
tags: ["worker:contract-adapters"]
name: {zh: "关系存储适配器", en: "RDS Adapter"}
description:
  zh: >
      事务范围、outbox 同事务写入、任务租约获取、表写入所有者登记的接口定义。
      
  en: >
      Transaction scope, transactional outbox write, job lease acquire, table write-owner registry.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/adapters/src/rds/index.ts"
apis: []
types:
  - name: "TransactionScope"
    description: {zh: "事务范围", en: "Transaction scope"}
    schema: {"type":"object","additionalProperties":false,"description":"一张表只能有一个业务写入所有者","properties":{"isolationLevel":{"type":"string","enum":["read_committed","repeatable_read","serializable"],"description":"隔离级别"},"tables":{"type":"array","description":"本次事务写入的表","items":{"type":"string","description":"表名"}},"ownerModule":{"type":"string","description":"写入所有者模块 id"},"timeoutMs":{"type":"integer","description":"超时毫秒","minimum":100}},"required":["tables","ownerModule"]}
  - name: "OutboxRecord"
    description: {zh: "事务发件箱记录", en: "Outbox record"}
    schema: {"type":"object","additionalProperties":false,"description":"与业务写同事务落库，派发器轮询","properties":{"outboxId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"eventType":{"type":"string","description":"事件类型"},"eventVersion":{"type":"integer","description":"事件版本","minimum":1},"aggregateId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"aggregateVersion":{"type":"integer","description":"聚合版本","minimum":1},"payloadJson":{"type":"string","description":"事件载荷 JSON"},"status":{"type":"string","enum":["pending","published","failed","dead"],"description":"状态"},"attempts":{"type":"integer","description":"已尝试次数","minimum":0},"nextAttemptAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["outboxId","eventType","eventVersion","aggregateId","status","createdAt"]}
  - name: "JobLease"
    description: {zh: "任务租约", en: "Job lease"}
    schema: {"type":"object","additionalProperties":false,"description":"基于 RDS 行锁实现，MQ 为后续显式迁移","properties":{"jobId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"jobType":{"type":"string","description":"任务类型"},"leaseOwner":{"type":"string","description":"持有者实例 id"},"leaseExpiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"heartbeatAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"attempts":{"type":"integer","description":"尝试次数","minimum":0}},"required":["jobId","jobType","leaseOwner","leaseExpiresAt"]}
  - name: "TableWriteOwner"
    description: {zh: "表写入所有者", en: "Table write owner"}
    schema: {"type":"object","additionalProperties":false,"description":"禁止其他 Worker 绕过领域 API 直接改表","properties":{"table":{"type":"string","description":"表名"},"ownerModule":{"type":"string","description":"唯一业务写入所有者模块 id"},"projections":{"type":"array","description":"允许的投影/只读消费者","items":{"type":"string","description":"模块 id"}},"notes":{"type":"string","description":"约束说明"}},"required":["table","ownerModule"]}
---
