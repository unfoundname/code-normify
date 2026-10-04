---
uid: d58c1c39
id: bili.ops.auditlog
parent: bili.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "操作审计", en: "Operation audit"}
description:
  zh: >
      后台操作审计日志、不可篡改追加与检索
  en: >
      Backoffice operation audit logs, append-only immutability and search
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/auditlog/src/auditlog.ts"
  - path: "services/ops/auditlog/tests/auditlog.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/ops/audit-logs"
    description:
      zh: >
          检索操作审计
      en: >
          Search operation audit logs
    output: {module: "bili.contract.common", name: "PageResult"}
  - protocol: rpc
    path: "db.table.operation_audit_log"
    description:
      zh: >
          权威表 operation_audit_log（仅追加）
      en: >
          Append-only table operation_audit_log
types:
  - name: "OperationAuditLog"
    description: {zh: "操作审计日志", en: "Operation audit log"}
    schema: {"type":"object","description":"操作审计日志 / Operation audit log","additionalProperties":false,"properties":{"logId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 logId（语义见对应领域契约） / Field logId"},"operatorId":{"$ref":"urn:normify:bili.contract.common:Id","description":"操作人 ID / Operator id"},"action":{"type":"string","minLength":1,"description":"字段 action（语义见对应领域契约） / Field action"},"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"},"beforeJson":{"type":"string","minLength":1,"description":"字段 beforeJson（语义见对应领域契约） / Field beforeJson"},"afterJson":{"type":"string","minLength":1,"description":"字段 afterJson（语义见对应领域契约） / Field afterJson"},"occurredAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"发生时间 / Occurred at"}},"required":["logId","operatorId","action","targetId","occurredAt"]}
deps:
  - kind: reference
    to: bili.contract.event
    label: {zh: "事件封套用于审计关联", en: "Event envelope for audit"}
  - kind: call
    to: bili.infra.db
    label: {zh: "事务读写与表所有权校验", en: "Transactional persistence and"}
  - kind: event
    to: bili.infra.outbox
    label: {zh: "异步事件出箱与重试", en: "Async event outbox and retry"}
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一 ID/时间/分页/错误契约", en: "Unified id, time, pagination"}
---
