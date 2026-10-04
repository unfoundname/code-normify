---
uid: 42d3c643
id: bili.creator.activity
parent: bili.creator
state: planned
tags: [planned, "worker:W-CREATOR", leaf]
name: {zh: "活动与任务", en: "Campaigns and tasks"}
description:
  zh: >
      活动报名、任务进度、推广位与奖励发放
  en: >
      Campaign enrollment, task progress, promotion slots and reward grants
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/creator/activity/src/activity.ts"
  - path: "services/creator/activity/tests/activity.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/creator/tasks"
    description:
      zh: >
          创作任务列表
      en: >
          Creator task list
    output: {module: "bili.creator.activity", name: "CreatorTaskPage"}
  - protocol: http
    method: POST
    path: "/api/v1/creator/tasks/claims"
    description:
      zh: >
          领取任务奖励
      en: >
          Claim a task reward
    input: {module: "bili.creator.activity", name: "TaskClaimRequest"}
types:
  - name: "CreatorTask"
    description: {zh: "创作任务", en: "Creator task"}
    schema: {"type":"object","description":"创作任务 / Creator task","additionalProperties":false,"properties":{"taskId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 taskId（语义见对应领域契约） / Field taskId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"progress":{"type":"integer","description":"字段 progress（语义见对应领域契约） / Field progress"},"target":{"type":"integer","description":"字段 target（语义见对应领域契约） / Field target"},"reward":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 reward（语义见对应领域契约） / Field reward"},"deadline":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 deadline（语义见对应领域契约） / Field deadline"}},"required":["taskId","title","progress","target","reward","deadline"]}
  - name: "TaskClaimRequest"
    description: {zh: "领取任务奖励请求", en: "Task claim request"}
    schema: {"type":"object","description":"领取任务奖励请求 / Task claim request","additionalProperties":false,"properties":{"taskId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 taskId（语义见对应领域契约） / Field taskId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["taskId","idempotencyKey","requestContext"]}
  - name: "CreatorTaskPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.creator.activity:CreatorTask"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
deps:
  - kind: call
    to: bili.ops.activity
    label: {zh: "读取平台活动配置", en: "Read platform campaign"}
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
