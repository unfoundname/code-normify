---
uid: 89714db9
id: bili.client.admin.shell
parent: bili.client.admin
state: planned
tags: ["worker:web-admin-shell"]
name: {zh: "后台装配与权限", en: "Admin Shell"}
description:
  zh: >
      后台路由、权限码渲染、角色切换与操作二次确认/审计提示。
      
  en: >
      Admin routing, permission-driven rendering, role switch and audited confirmations.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/admin/src/app/AdminShell.tsx"
  - path: "apps/admin/src/app/routes.tsx"
apis: []
types:
  - name: "AdminRoute"
    description: {zh: "后台路由条目", en: "Admin route entry"}
    schema: {"type":"object","additionalProperties":false,"properties":{"path":{"type":"string","description":"路径"},"permission":{"$ref":"urn:normify:bili.contract.core.authz:PermissionCode"},"featureModule":{"type":"string","description":"功能模块 id"},"auditRequired":{"type":"boolean","description":"是否强制审计原因输入"}},"required":["path","permission","featureModule"]}
deps:
  - kind: reference
    to: bili.contract.core.authz
    label: {zh: "权限码驱动菜单", en: "Permission-driven menus"}
---
