---
uid: 8d6c8207
id: bili.ops.service
parent: bili.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "客服工单", en: "Customer service tickets"}
description:
  zh: >
      工单受理、分类、答复模板与升级
  en: >
      Ticket intake, triage, reply templates and escalation
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/service/src/ticket.ts"
  - path: "services/ops/service/tests/ticket.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/ops/service-tickets"
    description:
      zh: >
          创建客服工单
      en: >
          Create a service ticket
    input: {module: "bili.ops.service", name: "ServiceRequest"}
    output: {module: "bili.ops.service", name: "ServiceTicket"}
  - protocol: http
    method: PUT
    path: "/api/v1/ops/service-tickets/"
    description:
      zh: >
          答复工单
      en: >
          Reply to a ticket
    input: {module: "bili.ops.service", name: "ServiceRequest"}
    output: {module: "bili.ops.service", name: "ServiceTicket"}
types:
  - name: "ServiceTicket"
    description: {zh: "客服工单", en: "Service ticket"}
    schema: {"type":"object","description":"客服工单 / Service ticket","additionalProperties":false,"properties":{"ticketId":{"$ref":"urn:normify:bili.contract.common:Id","description":"工单 ID / Ticket id"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"category":{"type":"string","enum":["ACCOUNT","CONTENT","PAYMENT","TECHNICAL","OTHER"],"description":"字段 category（语义见对应领域契约） / Field category"},"content":{"type":"string","minLength":1,"description":"正文内容 / Text content"},"status":{"type":"string","enum":["OPEN","PENDING","RESOLVED","CLOSED"],"description":"状态 / Status"},"assigneeId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 assigneeId（语义见对应领域契约） / Field assigneeId"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["ticketId","userId","category","content","status","createdAt"]}
  - name: "ServiceTicketPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.ops.service:ServiceTicket"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
  - name: "ServiceRequest"
    description: {zh: "客服工单写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Service ticket write request carrying only client-provided fields"}
    schema: {"type":"object","description":"客服工单写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Service ticket write request carrying only client-provided fields","additionalProperties":false,"properties":{"ticketId":{"$ref":"urn:normify:bili.contract.common:Id","description":"工单 ID / Ticket id"},"category":{"type":"string","enum":["ACCOUNT","CONTENT","PAYMENT","TECHNICAL","OTHER"],"description":"字段 category（语义见对应领域契约） / Field category"},"content":{"type":"string","minLength":1,"description":"正文内容 / Text content"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["ticketId","category","content","idempotencyKey","requestContext"]}
  - name: "ServiceTicketQueryRequest"
    description: {zh: "客服工单查询请求", en: "Service ticket query request"}
    schema: {"type":"object","description":"客服工单查询请求 / Service ticket query request","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"}},"required":["userId"]}
deps:
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
