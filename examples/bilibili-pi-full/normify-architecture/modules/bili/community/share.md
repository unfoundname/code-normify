---
uid: 3e7bdbf2
id: bili.community.share
parent: bili.community
state: planned
tags: [planned, "worker:W-COMMUNITY", leaf]
name: {zh: "分享", en: "Sharing"}
description:
  zh: >
      分享渠道、短链、分享计数与回流统计
  en: >
      Share channels, short links, share counters and回流 statistics
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/community/share/src/share.ts"
  - path: "services/community/share/tests/share.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/community/shares"
    description:
      zh: >
          创建分享记录
      en: >
          Create a share record
    input: {module: "bili.community.share", name: "ShareRequest"}
    output: {module: "bili.community.share", name: "ShareRecord"}
types:
  - name: "ShareRecord"
    description: {zh: "分享记录", en: "Share record"}
    schema: {"type":"object","description":"分享记录 / Share record","additionalProperties":false,"properties":{"shareId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 shareId（语义见对应领域契约） / Field shareId"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"},"channel":{"type":"string","enum":["WEB","APP","WECHAT","QQ","COPY_LINK"],"description":"推送通道 / Push channel"},"shortUrl":{"type":"string","minLength":1,"format":"uri","description":"字段 shortUrl（语义见对应领域契约） / Field shortUrl"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["shareId","userId","targetId","channel","shortUrl","createdAt"]}
  - name: "ShareRequest"
    description: {zh: "分享记录写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Share record write request carrying only client-provided fields"}
    schema: {"type":"object","description":"分享记录写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Share record write request carrying only client-provided fields","additionalProperties":false,"properties":{"shareId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 shareId（语义见对应领域契约） / Field shareId"},"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"},"channel":{"type":"string","enum":["WEB","APP","WECHAT","QQ","COPY_LINK"],"description":"推送通道 / Push channel"},"shortUrl":{"type":"string","minLength":1,"format":"uri","description":"字段 shortUrl（语义见对应领域契约） / Field shortUrl"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["shareId","targetId","channel","shortUrl","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.infra.cdn
    label: {zh: "短链与分享落地页资源", en: "Short link and landing"}
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
