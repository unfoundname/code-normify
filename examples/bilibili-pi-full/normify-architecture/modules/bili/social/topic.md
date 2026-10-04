---
uid: 12e4fd1e
id: bili.social.topic
parent: bili.social
state: planned
tags: [planned, "worker:W-SOCIAL", leaf]
name: {zh: "话题", en: "Topics"}
description:
  zh: >
      话题创建、审核、热度与话题页内容
  en: >
      Topic creation, review, heat and topic pages
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/social/topic/src/topic.ts"
  - path: "services/social/topic/tests/topic.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/social/topics/"
    description:
      zh: >
          话题详情
      en: >
          Get a topic
    output: {module: "bili.social.topic", name: "TopicView"}
  - protocol: http
    method: GET
    path: "/api/v1/social/topics/dynamics"
    description:
      zh: >
          话题动态流
      en: >
          Topic feed
    output: {module: "bili.social.topic", name: "TopicFeedPage"}
types:
  - name: "TopicView"
    description: {zh: "话题视图", en: "Topic view"}
    schema: {"type":"object","description":"话题视图 / Topic view","additionalProperties":false,"properties":{"topicId":{"$ref":"urn:normify:bili.contract.common:Id","description":"话题 ID / Topic id"},"name":{"type":"string","minLength":1,"description":"字段 name（语义见对应领域契约） / Field name"},"auditState":{"$ref":"urn:normify:bili.contract.state:AuditState","description":"审核状态 / Audit state"},"feedCount":{"type":"integer","description":"字段 feedCount（语义见对应领域契约） / Field feedCount"},"hotScore":{"type":"number","description":"字段 hotScore（语义见对应领域契约） / Field hotScore"}},"required":["topicId","name","auditState","feedCount","hotScore"]}
  - name: "TopicFeedPage"
    description: {zh: "领域分页响应", en: "Domain page response"}
    schema: {"type":"object","additionalProperties":false,"description":"领域分页响应 / Domain page response｜与 PageResult 完全相同的分页封套字段（items/total/nextCursor/hasMore），items 使用该领域具名条目契约 / Same envelope fields as PageResult with domain-specific typed items","properties":{"items":{"type":"array","items":{"$ref":"urn:normify:bili.social.dynamic:DynamicView"},"description":"领域条目列表 / Domain item list"},"total":{"type":"integer","minimum":0,"description":"总条数 / Total count"},"nextCursor":{"type":"string","description":"下一页游标 / Next page cursor"},"hasMore":{"type":"boolean","description":"是否还有下一页 / Whether more pages exist"}},"required":["items","hasMore"]}
deps:
  - kind: call
    to: bili.ops.audit
    label: {zh: "话题名称与简介审核", en: "Topic name and description"}
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
