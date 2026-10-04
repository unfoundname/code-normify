---
uid: 47aa9197
id: data.identity.role-grant
parent: data.identity
state: planned
tags: [planned, "worker:W-IDENTITY", "storage:rds"]
name: {zh: "角色授权", en: "Role grant"}
description:
  zh: >
      后台与服务的角色、权限码与作用域
  en: >
      Backoffice and service roles with permission codes and scope
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "migrations/identity/models/role_grant.model.sql"
apis:
  - protocol: rpc
    path: "db.table.identity_role_grant"
    description:
      zh: >
          权威表 identity_role_grant（唯一业务写入所有者：W-IDENTITY；RDS 方言与适配器待定）
      en: >
          Authoritative table identity_role_grant (sole write owner: W-IDENTITY; RDS dialect and adapter pending)
  - protocol: file
    path: "migrations/identity/models/role_grant.model.sql"
    description:
      zh: >
          计划模型/迁移文件
      en: >
          Planned model or migration file
types:
  - name: "RoleGrantRow"
    description: {zh: "后台与服务的角色、权限码与作用域", en: "Backoffice and service roles with permission codes and scope"}
    schema: {"type":"object","additionalProperties":false,"description":"后台与服务的角色、权限码与作用域 / Backoffice and service roles with permission codes and scope｜存储归属 RDS｜唯一写入所有者 W-IDENTITY｜表 identity_role_grant；主键 PK(id)；无唯一约束；索引 INDEX(userId,roleId)；外键 FK(userId→data.identity.user.id)｜JSON Schema 描述契约，跨行约束仍由 RDS 实施 / JSON Schema describes the contract; cross-row constraints are enforced by RDS","properties":{"id":{"type":"string","description":"id 字段 / Field id"},"userId":{"type":"string","description":"外键指向 data.identity.user.id（多对一，由 RDS 实施） / Foreign key to data.identity.user.id (many-to-one, enforced by RDS)"},"roleId":{"type":"string","description":"roleId 字段 / Field roleId"},"scope":{"type":"string","enum":["PLATFORM","OPS","CREATOR","SERVICE"],"description":"业务枚举，取值须与该产品类型的完整取值集合一致"},"permissionCodes":{"type":"array","items":{"type":"string"},"description":"permissionCodes 字段 / Field permissionCodes"},"grantedAt":{"type":"string","format":"date-time","description":"grantedAt 字段 / Field grantedAt"}},"required":["id","userId","roleId","scope","permissionCodes","grantedAt"]}
deps:
  - kind: reference
    to: data.identity.user
    label: {zh: "userId→user.id，多对一", en: "userId->user.id, many-to-one"}
---
