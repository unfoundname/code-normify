---
uid: 2cf53f04
id: bili.social.dynamic
parent: bili.social
state: planned
tags: [planned, "worker:W-SOCIAL", leaf]
name: {zh: "动态发布", en: "Dynamic publishing"}
description:
  zh: >
      图文/视频/转发动态、可见范围与定时发布
  en: >
      Text, image, video and forwarded dynamics with visibility and scheduling
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/social/dynamic/src/dynamic.ts"
  - path: "services/social/dynamic/tests/dynamic.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/social/dynamics"
    description:
      zh: >
          发布动态
      en: >
          Publish a dynamic
    input: {module: "bili.social.dynamic", name: "CreateDynamicRequest"}
    output: {module: "bili.social.dynamic", name: "DynamicView"}
  - protocol: http
    method: DELETE
    path: "/api/v1/social/dynamics/"
    description:
      zh: >
          删除动态
      en: >
          Delete a dynamic
    input: {module: "bili.social.dynamic", name: "DeleteDynamicRequest"}
types:
  - name: "DynamicView"
    description: {zh: "动态视图", en: "Dynamic view"}
    schema: {"type":"object","description":"动态视图 / Dynamic view","additionalProperties":false,"properties":{"feedId":{"$ref":"urn:normify:bili.contract.common:Id","description":"动态 ID / Feed id"},"authorId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 authorId（语义见对应领域契约） / Field authorId"},"kind":{"type":"string","enum":["TEXT","IMAGE","VIDEO","FORWARD","COLLECTION"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"textContent":{"type":"string","minLength":1,"description":"图文正文 / Post text"},"mediaRefs":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 mediaRefs（语义见对应领域契约） / Field mediaRefs"},"forwardOf":{"$ref":"urn:normify:bili.contract.common:Id","description":"转发的动态 ID / Forwarded feed id"},"visibility":{"$ref":"urn:normify:bili.contract.common:Visibility","description":"可见性 / Visibility"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["feedId","authorId","kind","mediaRefs","visibility","createdAt"]}
  - name: "CreateDynamicRequest"
    description: {zh: "发布动态请求", en: "Create dynamic request"}
    schema: {"type":"object","description":"发布动态请求 / Create dynamic request","additionalProperties":false,"properties":{"kind":{"type":"string","enum":["TEXT","IMAGE","VIDEO","FORWARD","COLLECTION"],"description":"字段 kind（语义见对应领域契约） / Field kind"},"textContent":{"type":"string","minLength":1,"description":"图文正文 / Post text"},"mediaRefs":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 mediaRefs（语义见对应领域契约） / Field mediaRefs"},"topicIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 topicIds（语义见对应领域契约） / Field topicIds"},"visibility":{"$ref":"urn:normify:bili.contract.common:Visibility","description":"可见性 / Visibility"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["kind","mediaRefs","topicIds","visibility","idempotencyKey","requestContext"]}
  - name: "DeleteDynamicRequest"
    description: {zh: "删除动态请求", en: "Delete dynamic request"}
    schema: {"type":"object","description":"删除动态请求 / Delete dynamic request","additionalProperties":false,"properties":{"feedId":{"$ref":"urn:normify:bili.contract.common:Id","description":"动态 ID / Feed id"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["feedId","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.catalog.query
    label: {zh: "引用视频卡片", en: "Reference video cards"}
  - kind: call
    to: bili.social.topic
    label: {zh: "话题归属", en: "Topic membership"}
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
