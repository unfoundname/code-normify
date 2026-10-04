---
uid: cd8afb50
id: bili.creator.interact
parent: bili.creator
state: planned
tags: [planned, "worker:W-CREATOR", leaf]
name: {zh: "弹幕评论管理", en: "Danmaku and comment management"}
description:
  zh: >
      集中管理弹幕与评论、批量处理与关键词
  en: >
      Centralized danmaku and comment handling, bulk actions and keywords
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/creator/interact/src/interact.ts"
  - path: "services/creator/interact/tests/interact.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/creator/interactions"
    description:
      zh: >
          管理弹幕与评论
      en: >
          Manage danmaku and comments
    input: {module: "bili.creator.interact", name: "InteractManageRequest"}
types:
  - name: "InteractManageRequest"
    description: {zh: "互动管理请求", en: "Interaction management request"}
    schema: {"type":"object","description":"互动管理请求 / Interaction management request","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"kind":{"type":"string","enum":["DANMAKU","COMMENT"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"action":{"type":"string","enum":["DELETE","BLOCK_KEYWORD","REPORT_APPEAL"],"description":"字段 action（语义见对应领域契约） / Field action"},"targetIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 targetIds（语义见对应领域契约） / Field targetIds"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["bvid","kind","action","targetIds","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.danmaku.manage
    label: {zh: "复用弹幕管理动作", en: "Reuse danmaku moderation"}
  - kind: call
    to: bili.community.moderation
    label: {zh: "复用评论管理动作", en: "Reuse comment moderation"}
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
