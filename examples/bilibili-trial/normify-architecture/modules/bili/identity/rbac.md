---
uid: 688ceeed
id: bili.identity.rbac
parent: bili.identity
state: planned
tags: ["worker:id-rbac"]
name: {zh: "权限与角色", en: "Roles and Permissions"}
description:
  zh: >
      角色、权限码授予、令牌声明与鉴权上下文装配；运营与创作端权限统一来源。
      
  en: >
      Roles, permission grants, token claims and auth context assembly for admin and studio.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/identity/rbac/src/service.ts"
  - path: "services/identity/rbac/migrations/0001_rbac.sql"
  - path: "services/identity/rbac/tests/rbac.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/identity/roles"
    description:
      zh: >
          列出角色与权限
          
      en: >
          List roles
          
    output: {module: "bili.identity.rbac", name: "RoleRecordPage"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/role-assignments"
    description:
      zh: >
          授予角色
          
      en: >
          Assign role
          
    input: {module: "bili.identity.rbac", name: "RoleAssignment"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/identity/tokens/verify"
    description:
      zh: >
          校验令牌并装配鉴权上下文
          
      en: >
          Verify token and build auth context
          
    input: {module: "bili.identity.rbac", name: "TokenClaims"}
    output: {module: "bili.contract.core.authz", name: "AuthContext"}
types:
  - name: "RoleRecord"
    description: {zh: "角色", en: "Role"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 role；role_permission 关联表显式建模","properties":{"roleId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"code":{"type":"string","description":"角色码","pattern":"^[a-z][a-z0-9_]{1,31}$"},"name":{"type":"string","description":"角色名"},"permissions":{"type":"array","description":"权限码","items":{"$ref":"urn:normify:bili.contract.core.authz:PermissionCode"}},"scope":{"type":"string","enum":["global","channel","live_room","category"],"description":"作用域"},"builtin":{"type":"boolean","description":"是否内置角色"}},"required":["roleId","code","permissions","scope"]}
  - name: "RoleRecordPage"
    description: {zh: "角色分页", en: "Role page"}
    schema: {"type":"object","additionalProperties":false,"properties":{"items":{"type":"array","description":"角色条目","items":{"$ref":"urn:normify:bili.identity.rbac:RoleRecord"}},"page":{"$ref":"urn:normify:bili.contract.core.paging:PageMeta"}},"required":["items","page"]}
  - name: "RoleAssignment"
    description: {zh: "角色授予", en: "Role assignment"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 role_assignment，唯一约束 user_id+role_id","properties":{"assignmentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"roleId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"grantedBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"grantedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"reason":{"type":"string","description":"授予原因（审计必填）"}},"required":["assignmentId","userId","roleId","grantedBy","grantedAt"]}
  - name: "TokenClaims"
    description: {zh: "令牌声明", en: "Token claims"}
    schema: {"type":"object","additionalProperties":false,"description":"供网关校验，不在业务表落库","properties":{"subject":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"sessionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"roles":{"type":"array","description":"角色码","items":{"type":"string","description":"角色码"}},"permissions":{"type":"array","description":"权限码","items":{"type":"string","description":"权限码"}},"issuedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"expiresAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"audience":{"type":"string","enum":["web","admin","studio","openapi"],"description":"受众"}},"required":["subject","sessionId","roles","expiresAt"]}
deps:
  - kind: reference
    to: bili.contract.core.authz
    label: {zh: "权限码与判定契约", en: "Permission code contract"}
  - kind: dataflow
    to: bili.data.model
    label: {zh: "登记角色与授予表归属", en: "Register table ownership"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "授权变更审计", en: "Audit role changes"}
---
