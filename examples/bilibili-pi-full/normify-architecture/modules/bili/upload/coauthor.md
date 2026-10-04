---
uid: 9fe65832
id: bili.upload.coauthor
parent: bili.upload
state: planned
tags: [planned, "worker:W-CONTENT", leaf]
name: {zh: "联合投稿", en: "Co-authoring"}
description:
  zh: >
      邀请、接受、权重与联合投稿分成确认
  en: >
      Invitations, acceptance, weights and co-author revenue confirmation
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/upload/coauthor/src/coauthor.ts"
  - path: "services/upload/coauthor/tests/coauthor.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/upload/coauthor-invites"
    description:
      zh: >
          发起联合投稿邀请
      en: >
          Invite a co-author
    input: {module: "bili.upload.coauthor", name: "CoauthorRequest"}
    output: {module: "bili.upload.coauthor", name: "CoauthorInvite"}
  - protocol: http
    method: POST
    path: "/api/v1/upload/coauthor-invites/acceptance"
    description:
      zh: >
          接受或拒绝邀请
      en: >
          Accept or reject the invite
    input: {module: "bili.upload.coauthor", name: "CoauthorDecisionRequest"}
    output: {module: "bili.upload.coauthor", name: "CoauthorInvite"}
types:
  - name: "CoauthorInvite"
    description: {zh: "联合投稿邀请", en: "Co-author invite"}
    schema: {"type":"object","description":"联合投稿邀请 / Co-author invite","additionalProperties":false,"properties":{"inviteId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 inviteId（语义见对应领域契约） / Field inviteId"},"draftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 draftId（语义见对应领域契约） / Field draftId"},"inviterId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 inviterId（语义见对应领域契约） / Field inviterId"},"inviteeMid":{"type":"string","minLength":1,"description":"字段 inviteeMid（语义见对应领域契约） / Field inviteeMid"},"weightPercent":{"type":"integer","description":"字段 weightPercent（语义见对应领域契约） / Field weightPercent"},"status":{"type":"string","enum":["PENDING","ACCEPTED","REJECTED","EXPIRED"],"description":"状态 / Status"},"expireAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"过期时间 / Expire time"}},"required":["inviteId","draftId","inviterId","inviteeMid","weightPercent","status","expireAt"]}
  - name: "CoauthorDecisionRequest"
    description: {zh: "联合投稿答复请求", en: "Co-author decision request"}
    schema: {"type":"object","description":"联合投稿答复请求 / Co-author decision request","additionalProperties":false,"properties":{"inviteId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 inviteId（语义见对应领域契约） / Field inviteId"},"accept":{"type":"boolean","description":"字段 accept（语义见对应领域契约） / Field accept"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["inviteId","accept","idempotencyKey","requestContext"]}
  - name: "CoauthorRequest"
    description: {zh: "联合投稿邀请写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Co-author invite write request carrying only client-provided fields"}
    schema: {"type":"object","description":"联合投稿邀请写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Co-author invite write request carrying only client-provided fields","additionalProperties":false,"properties":{"inviteId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 inviteId（语义见对应领域契约） / Field inviteId"},"draftId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 draftId（语义见对应领域契约） / Field draftId"},"inviterId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 inviterId（语义见对应领域契约） / Field inviterId"},"inviteeMid":{"type":"string","minLength":1,"description":"字段 inviteeMid（语义见对应领域契约） / Field inviteeMid"},"weightPercent":{"type":"integer","description":"字段 weightPercent（语义见对应领域契约） / Field weightPercent"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["inviteId","draftId","inviterId","inviteeMid","weightPercent","idempotencyKey","requestContext"]}
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
