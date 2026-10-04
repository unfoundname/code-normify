---
uid: ad386a0e
id: bili.identity.rbac
parent: bili.identity
state: planned
tags: [planned, "worker:W-IDENTITY", leaf]
name: {zh: "权限与角色", en: "Roles and permissions"}
description:
  zh: >
      后台角色、权限码、服务间令牌与最小权限策略
  en: >
      Backoffice roles, permission codes, service tokens and least privilege
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/rbac/src/rbac.ts"
  - path: "services/identity/rbac/tests/rbac.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/identity/authorizations"
    description:
      zh: >
          鉴权校验
      en: >
          Authorize a request
    input: {module: "bili.identity.rbac", name: "AuthorizeRequest"}
    output: {module: "bili.identity.rbac", name: "RoleGrant"}
  - protocol: http
    method: GET
    path: "/api/v1/identity/roles/"
    description:
      zh: >
          查询角色授权
      en: >
          List role grants
    output: {module: "bili.identity.rbac", name: "RoleGrant"}
types:
  - name: "RoleGrant"
    description: {zh: "角色授权", en: "Role grant"}
    schema: {"type":"object","description":"角色授权 / Role grant","additionalProperties":false,"properties":{"roleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"角色 ID / Role id"},"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"scope":{"type":"string","enum":["PLATFORM","OPS","CREATOR","SERVICE"],"description":"字段 scope（语义见对应领域契约） / Field scope"},"permissionCodes":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"权限码列表 / Permission codes"},"grantedAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 grantedAt（语义见对应领域契约） / Field grantedAt"}},"required":["roleId","userId","scope","permissionCodes","grantedAt"]}
  - name: "AuthorizeRequest"
    description: {zh: "鉴权请求", en: "Authorize request"}
    schema: {"type":"object","description":"鉴权请求 / Authorize request","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"permissionCode":{"type":"string","minLength":1,"description":"字段 permissionCode（语义见对应领域契约） / Field permissionCode"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["userId","permissionCode","idempotencyKey","requestContext"]}
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
