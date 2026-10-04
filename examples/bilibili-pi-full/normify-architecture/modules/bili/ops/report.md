---
uid: d24e05a0
id: bili.ops.report
parent: bili.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "举报工单", en: "Report tickets"}
description:
  zh: >
      举报受理、分类、证据与处置流转
  en: >
      Report intake, categorization, evidence and handling flow
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/report/src/report.ts"
  - path: "services/ops/report/tests/report.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/ops/report-tickets"
    description:
      zh: >
          受理举报
      en: >
          Accept a report
    input: {module: "bili.ops.report", name: "ReportRequest"}
    output: {module: "bili.ops.report", name: "ReportTicket"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/report-tickets/triage"
    description:
      zh: >
          举报分类流转
      en: >
          Triage a report
    input: {module: "bili.ops.report", name: "ReportTriageRequest"}
    output: {module: "bili.ops.report", name: "ReportTicket"}
types:
  - name: "ReportTicket"
    description: {zh: "举报工单", en: "Report ticket"}
    schema: {"type":"object","description":"举报工单 / Report ticket","additionalProperties":false,"properties":{"ticketId":{"$ref":"urn:normify:bili.contract.common:Id","description":"工单 ID / Ticket id"},"reporterId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 reporterId（语义见对应领域契约） / Field reporterId"},"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"},"targetType":{"type":"string","enum":["VIDEO","DANMAKU","COMMENT","USER","LIVE"],"description":"目标对象类型 / Target object type"},"category":{"type":"string","enum":["SPAM","ABUSE","PORN","ILLEGAL","COPYRIGHT","OTHER"],"description":"字段 category（语义见对应领域契约） / Field category"},"status":{"type":"string","enum":["OPEN","TRIAGED","ACCEPTED","REJECTED","CLOSED"],"description":"状态 / Status"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["ticketId","reporterId","targetId","targetType","category","status","createdAt"]}
  - name: "ReportTriageRequest"
    description: {zh: "举报分类流转请求", en: "Report triage request"}
    schema: {"type":"object","description":"举报分类流转请求 / Report triage request","additionalProperties":false,"properties":{"ticketId":{"$ref":"urn:normify:bili.contract.common:Id","description":"工单 ID / Ticket id"},"category":{"type":"string","enum":["SPAM","ABUSE","PORN","ILLEGAL","COPYRIGHT","OTHER"],"description":"字段 category（语义见对应领域契约） / Field category"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["ticketId","category","idempotencyKey","requestContext"]}
  - name: "ReportRequest"
    description: {zh: "举报工单写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Report ticket write request carrying only client-provided fields"}
    schema: {"type":"object","description":"举报工单写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Report ticket write request carrying only client-provided fields","additionalProperties":false,"properties":{"ticketId":{"$ref":"urn:normify:bili.contract.common:Id","description":"工单 ID / Ticket id"},"reporterId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 reporterId（语义见对应领域契约） / Field reporterId"},"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"},"targetType":{"type":"string","enum":["VIDEO","DANMAKU","COMMENT","USER","LIVE"],"description":"目标对象类型 / Target object type"},"category":{"type":"string","enum":["SPAM","ABUSE","PORN","ILLEGAL","COPYRIGHT","OTHER"],"description":"字段 category（语义见对应领域契约） / Field category"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["ticketId","reporterId","targetId","targetType","category","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.ops.penalty
    label: {zh: "属实举报触发处罚", en: "Trigger penalties on valid"}
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
