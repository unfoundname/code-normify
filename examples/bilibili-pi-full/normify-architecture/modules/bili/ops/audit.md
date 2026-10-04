---
uid: 655e90ab
id: bili.ops.audit
parent: bili.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "内容审核", en: "Content audit"}
description:
  zh: >
      机审与人工审核队列、审核结论、抽检与申诉联动
  en: >
      Machine and human audit queues, decisions, sampling and appeal linkage
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/audit/src/audit.ts"
  - path: "services/ops/audit/src/queue.ts"
  - path: "services/ops/audit/tests/audit.test.ts"
  - path: "services/ops/audit/tests/queue.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/ops/audit-tasks"
    description:
      zh: >
          创建审核任务
      en: >
          Create an audit task
    input: {module: "bili.ops.audit", name: "AuditTaskRequest"}
    output: {module: "bili.ops.audit", name: "AuditTask"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/audit-decisions"
    description:
      zh: >
          提交审核结论
      en: >
          Submit an audit decision
    input: {module: "bili.ops.audit", name: "AuditDecisionRequest"}
    output: {module: "bili.ops.audit", name: "AuditDecision"}
types:
  - name: "AuditTask"
    description: {zh: "审核任务", en: "Audit task"}
    schema: {"type":"object","description":"审核任务 / Audit task","additionalProperties":false,"properties":{"taskId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 taskId（语义见对应领域契约） / Field taskId"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"resourceType":{"type":"string","enum":["VIDEO","DANMAKU","COMMENT","ARTICLE","AUDIO","LIVE","DYNAMIC","TOPIC"],"description":"字段 resourceType（语义见对应领域契约） / Field resourceType"},"auditState":{"$ref":"urn:normify:bili.contract.state:AuditState","description":"审核状态 / Audit state"},"policyId":{"type":"string","minLength":1,"description":"字段 policyId（语义见对应领域契约） / Field policyId"},"assigneeId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 assigneeId（语义见对应领域契约） / Field assigneeId"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["taskId","resourceId","resourceType","auditState","policyId","createdAt"]}
  - name: "AuditDecision"
    description: {zh: "审核结论", en: "Audit decision"}
    schema: {"type":"object","description":"审核结论 / Audit decision","additionalProperties":false,"properties":{"taskId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 taskId（语义见对应领域契约） / Field taskId"},"auditState":{"$ref":"urn:normify:bili.contract.state:AuditState","description":"审核状态 / Audit state"},"policyId":{"type":"string","minLength":1,"description":"字段 policyId（语义见对应领域契约） / Field policyId"},"operatorId":{"$ref":"urn:normify:bili.contract.common:Id","description":"操作人 ID / Operator id"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"decidedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 decidedAt（语义见对应领域契约） / Field decidedAt"}},"required":["taskId","auditState","policyId","operatorId","decidedAt"]}
  - name: "AuditTaskPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.ops.audit:AuditTask"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
  - name: "AuditTaskRequest"
    description: {zh: "审核任务写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Audit task write request carrying only client-provided fields"}
    schema: {"type":"object","description":"审核任务写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Audit task write request carrying only client-provided fields","additionalProperties":false,"properties":{"taskId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 taskId（语义见对应领域契约） / Field taskId"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"resourceType":{"type":"string","enum":["VIDEO","DANMAKU","COMMENT","ARTICLE","AUDIO","LIVE","DYNAMIC","TOPIC"],"description":"字段 resourceType（语义见对应领域契约） / Field resourceType"},"policyId":{"type":"string","minLength":1,"description":"字段 policyId（语义见对应领域契约） / Field policyId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["taskId","resourceId","resourceType","policyId","idempotencyKey","requestContext"]}
  - name: "AuditDecisionRequest"
    description: {zh: "审核结论写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Audit decision write request carrying only client-provided fields"}
    schema: {"type":"object","description":"审核结论写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Audit decision write request carrying only client-provided fields","additionalProperties":false,"properties":{"taskId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 taskId（语义见对应领域契约） / Field taskId"},"policyId":{"type":"string","minLength":1,"description":"字段 policyId（语义见对应领域契约） / Field policyId"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["taskId","policyId","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.catalog.state
    from_api: "POST /api/v1/ops/audit-decisions"
    to_api: "POST /api/v1/catalog/publish-transitions"
    label: {zh: "审核通过后请求发布迁移", en: "Request publish transitions"}
  - kind: call
    to: bili.ops.penalty
    label: {zh: "违规内容触发处罚", en: "Trigger penalties for"}
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
