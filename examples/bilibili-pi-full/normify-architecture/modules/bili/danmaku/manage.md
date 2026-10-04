---
uid: 4ccd3ca2
id: bili.danmaku.manage
parent: bili.danmaku
state: planned
tags: [planned, "worker:W-DANMAKU", leaf]
name: {zh: "弹幕管理", en: "Uploader danmaku moderation"}
description:
  zh: >
      UP 主删除、保护、精选、关键词与黑名单管理
  en: >
      Uploader deletion, protection, selection, keywords and blocklist management
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/danmaku/manage/src/manage.ts"
  - path: "services/danmaku/manage/tests/manage.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/danmaku/moderation"
    description:
      zh: >
          执行弹幕管理动作
      en: >
          Apply a danmaku moderation action
    input: {module: "bili.danmaku.manage", name: "DanmakuModerationRequest"}
  - protocol: http
    method: GET
    path: "/api/v1/danmaku/videos/:bvid/moderation"
    description:
      zh: >
          按稿件查询弹幕管理列表（路径参数与类型化 input 一致）
      en: >
          List danmaku for moderation by video
    input: {module: "bili.danmaku.manage", name: "DanmakuModerationQueryRequest"}
    output: {module: "bili.danmaku.manage", name: "DanmakuItemPage"}
types:
  - name: "DanmakuModeration"
    description: {zh: "弹幕管理动作", en: "Danmaku moderation action"}
    schema: {"type":"object","description":"弹幕管理动作 / Danmaku moderation action","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"danmakuId":{"$ref":"urn:normify:bili.contract.common:Id","description":"弹幕 ID / Danmaku id"},"action":{"type":"string","enum":["DELETE","PROTECT","SELECT","BLOCK_SENDER"],"description":"字段 action（语义见对应领域契约） / Field action"},"operatorId":{"$ref":"urn:normify:bili.contract.common:Id","description":"操作人 ID / Operator id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"}},"required":["bvid","danmakuId","action","operatorId","idempotencyKey"]}
  - name: "DanmakuItemPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.danmaku.segment:DanmakuItem"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
  - name: "DanmakuModerationRequest"
    description: {zh: "弹幕管理动作写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Danmaku moderation action write request carrying only client-provided fields"}
    schema: {"type":"object","description":"弹幕管理动作写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Danmaku moderation action write request carrying only client-provided fields","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"danmakuId":{"$ref":"urn:normify:bili.contract.common:Id","description":"弹幕 ID / Danmaku id"},"action":{"type":"string","enum":["DELETE","PROTECT","SELECT","BLOCK_SENDER"],"description":"字段 action（语义见对应领域契约） / Field action"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["bvid","danmakuId","action","idempotencyKey","requestContext"]}
  - name: "DanmakuModerationQueryRequest"
    description: {zh: "弹幕管理查询请求", en: "Danmaku moderation query request"}
    schema: {"type":"object","description":"弹幕管理查询请求 / Danmaku moderation query request","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"}},"required":["bvid"]}
deps:
  - kind: call
    to: bili.catalog.video
    label: {zh: "校验 UP 主身份与稿件归属", en: "Verify uploader ownership of"}
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
