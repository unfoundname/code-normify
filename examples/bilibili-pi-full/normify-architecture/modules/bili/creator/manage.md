---
uid: ec0d5e21
id: bili.creator.manage
parent: bili.creator
state: planned
tags: [planned, "worker:W-CREATOR", leaf]
name: {zh: "投稿管理", en: "Work management"}
description:
  zh: >
      稿件列表、状态、批量操作与投稿建议
  en: >
      Work lists, states, bulk operations and publishing suggestions
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/creator/manage/src/manage.ts"
  - path: "services/creator/manage/tests/manage.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/creator/works"
    description:
      zh: >
          创作中心稿件列表
      en: >
          Creator work list
    output: {module: "bili.creator.manage", name: "CreatorWorkPage"}
  - protocol: http
    method: POST
    path: "/api/v1/creator/works/bulk"
    description:
      zh: >
          批量下架或编辑
      en: >
          Bulk remove or edit
    input: {module: "bili.creator.manage", name: "BulkWorkRequest"}
types:
  - name: "CreatorWorkItem"
    description: {zh: "创作稿件条目", en: "Creator work item"}
    schema: {"type":"object","description":"创作稿件条目 / Creator work item","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"publishState":{"$ref":"urn:normify:bili.contract.state:PublishState","description":"发布状态 / Publish state"},"auditState":{"$ref":"urn:normify:bili.contract.state:AuditState","description":"审核状态 / Audit state"},"warningCount":{"type":"integer","description":"字段 warningCount（语义见对应领域契约） / Field warningCount"},"updatedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"更新时间 / Updated time"}},"required":["bvid","title","publishState","auditState","warningCount","updatedAt"]}
  - name: "BulkWorkRequest"
    description: {zh: "批量稿件操作请求", en: "Bulk work request"}
    schema: {"type":"object","description":"批量稿件操作请求 / Bulk work request","additionalProperties":false,"properties":{"bvids":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 bvids（语义见对应领域契约） / Field bvids"},"action":{"type":"string","enum":["REMOVE","PRIVATE","PUBLIC","ADD_TAG"],"description":"字段 action（语义见对应领域契约） / Field action"},"tagIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"标签 ID 列表 / Tag id list"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["bvids","action","idempotencyKey","requestContext"]}
  - name: "CreatorWorkPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.creator.manage:CreatorWorkItem"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
deps:
  - kind: call
    to: bili.catalog.video
    label: {zh: "读取稿件状态与目录信息", en: "Read work state and catalog"}
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
