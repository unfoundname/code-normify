---
uid: 7b08cb89
id: bili.social.feed
parent: bili.social
state: planned
tags: [planned, "worker:W-SOCIAL", leaf]
name: {zh: "动态流", en: "Dynamic feed"}
description:
  zh: >
      关注时间线、推荐注入、分页与已读去重
  en: >
      Following timeline, recommendation injection, pagination and read dedupe
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/social/feed/src/feed.ts"
  - path: "services/social/feed/tests/feed.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/social/feed"
    description:
      zh: >
          获取关注动态流
      en: >
          Get the following feed
    output: {module: "bili.social.feed", name: "FeedPage"}
types:
  - name: "FeedPage"
    description: {zh: "动态流分页", en: "Feed page"}
    schema: {"type":"object","description":"动态流分页 / Feed page","additionalProperties":false,"properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.social.dynamic:DynamicView"},"description":"结果列表 / Result items"},"nextCursor":{"type":"string","minLength":1,"description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
deps:
  - kind: call
    to: bili.discover.recommend
    label: {zh: "注入推荐内容", en: "Inject recommended items"}
  - kind: call
    to: bili.social.follow
    label: {zh: "读取关注集合", en: "Read the follow set"}
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
