---
uid: 9c0545fe
id: bili.social.group
parent: bili.social
state: planned
tags: [planned, "worker:W-SOCIAL", leaf]
name: {zh: "关注分组", en: "Follow groups"}
description:
  zh: >
      分组增删改、批量移动、分组内推荐
  en: >
      Group CRUD, bulk move and in-group recommendations
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/social/group/src/group.ts"
  - path: "services/social/group/tests/group.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/social/groups"
    description:
      zh: >
          创建关注分组
      en: >
          Create a follow group
    input: {module: "bili.social.group", name: "FollowRequest"}
    output: {module: "bili.social.group", name: "FollowGroup"}
  - protocol: http
    method: PUT
    path: "/api/v1/social/groups/"
    description:
      zh: >
          编辑分组与成员
      en: >
          Edit a group and its members
    input: {module: "bili.social.group", name: "FollowRequest"}
    output: {module: "bili.social.group", name: "FollowGroup"}
types:
  - name: "FollowGroup"
    description: {zh: "关注分组", en: "Follow group"}
    schema: {"type":"object","description":"关注分组 / Follow group","additionalProperties":false,"properties":{"groupId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分组 ID / Group id"},"ownerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"所有者用户 ID / Owner user id"},"name":{"type":"string","minLength":1,"description":"字段 name（语义见对应领域契约） / Field name"},"memberMids":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 memberMids（语义见对应领域契约） / Field memberMids"},"orderIndex":{"type":"integer","description":"字段 orderIndex（语义见对应领域契约） / Field orderIndex"}},"required":["groupId","ownerId","name","memberMids","orderIndex"]}
  - name: "FollowRequest"
    description: {zh: "关注分组写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Follow group write request carrying only client-provided fields"}
    schema: {"type":"object","description":"关注分组写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Follow group write request carrying only client-provided fields","additionalProperties":false,"properties":{"groupId":{"$ref":"urn:normify:bili.contract.common:Id","description":"分组 ID / Group id"},"name":{"type":"string","minLength":1,"description":"字段 name（语义见对应领域契约） / Field name"},"memberMids":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 memberMids（语义见对应领域契约） / Field memberMids"},"orderIndex":{"type":"integer","description":"字段 orderIndex（语义见对应领域契约） / Field orderIndex"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["groupId","name","memberMids","orderIndex","idempotencyKey","requestContext"]}
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
