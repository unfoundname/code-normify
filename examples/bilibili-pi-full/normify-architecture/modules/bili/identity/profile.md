---
uid: 7a8463c5
id: bili.identity.profile
parent: bili.identity
state: planned
tags: [planned, "worker:W-IDENTITY", leaf]
name: {zh: "个人资料与空间", en: "Profile and personal space"}
description:
  zh: >
      昵称头像签名、认证标识、代表作置顶与空间布局
  en: >
      Nickname, avatar, signature, verification badge, pinned works and space layout
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/profile/src/profile.ts"
  - path: "services/identity/profile/src/space.ts"
  - path: "services/identity/profile/tests/profile.test.ts"
  - path: "services/identity/profile/tests/space.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/identity/profiles/:userId"
    description:
      zh: >
          按用户查询资料（路径参数与类型化 input 一致）
      en: >
          Get a profile by path parameter and typed input
    input: {module: "bili.identity.profile", name: "ProfileQueryRequest"}
    output: {module: "bili.identity.profile", name: "ProfileView"}
  - protocol: http
    method: PATCH
    path: "/api/v1/identity/profiles/"
    description:
      zh: >
          更新资料
      en: >
          Update profile
    input: {module: "bili.identity.profile", name: "ProfileRequest"}
    output: {module: "bili.identity.profile", name: "ProfileView"}
  - protocol: http
    method: GET
    path: "/api/v1/identity/spaces/"
    description:
      zh: >
          查询个人空间
      en: >
          Get personal space
    output: {module: "bili.identity.profile", name: "SpaceView"}
types:
  - name: "ProfileView"
    description: {zh: "资料视图", en: "Profile view"}
    schema: {"type":"object","description":"资料视图 / Profile view","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"mid":{"type":"string","minLength":1,"description":"用户业务号 / User mid"},"nickname":{"type":"string","minLength":1,"description":"昵称 / Nickname"},"avatarUrl":{"type":"string","minLength":1,"format":"uri","description":"头像地址 / Avatar url"},"signature":{"type":"string","minLength":1,"description":"个性签名 / Signature"},"officialBadge":{"type":"string","enum":["NONE","PERSONAL","ORGANIZATION","GOVERNMENT"],"description":"字段 officialBadge（语义见对应领域契约） / Field officialBadge"}},"required":["userId","mid","nickname","avatarUrl","officialBadge"]}
  - name: "SpaceView"
    description: {zh: "个人空间视图", en: "Space view"}
    schema: {"type":"object","description":"个人空间视图 / Space view","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"pinnedResourceIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 pinnedResourceIds（语义见对应领域契约） / Field pinnedResourceIds"},"featuredSeasonIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 featuredSeasonIds（语义见对应领域契约） / Field featuredSeasonIds"},"followerCount":{"type":"integer","description":"字段 followerCount（语义见对应领域契约） / Field followerCount"},"followingCount":{"type":"integer","description":"字段 followingCount（语义见对应领域契约） / Field followingCount"}},"required":["userId","pinnedResourceIds","featuredSeasonIds","followerCount","followingCount"]}
  - name: "ProfileRequest"
    description: {zh: "资料视图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Profile view write request carrying only client-provided fields"}
    schema: {"type":"object","description":"资料视图写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Profile view write request carrying only client-provided fields","additionalProperties":false,"properties":{"nickname":{"type":"string","minLength":1,"description":"昵称 / Nickname"},"avatarUrl":{"type":"string","minLength":1,"format":"uri","description":"头像地址 / Avatar url"},"signature":{"type":"string","minLength":1,"description":"个性签名 / Signature"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["nickname","avatarUrl","idempotencyKey","requestContext"]}
  - name: "ProfileQueryRequest"
    description: {zh: "资料查询请求", en: "Profile query request"}
    schema: {"type":"object","description":"资料查询请求 / Profile query request","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"}},"required":["userId"]}
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
