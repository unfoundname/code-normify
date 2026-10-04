---
uid: 541ea833
id: data.identity.t-a9f4af3d
parent: data.identity
state: planned
tags: ["worker:id-rbac", "projection:data-contract"]
name: {zh: "RoleRecordPage", en: "RoleRecordPage"}
description:
  zh: >
      角色分页
  en: >
      Role page
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/identity/t-a9f4af3d.json"
apis: []
types:
  - name: "RoleRecordPage"
    description: {zh: "角色分页", en: "Role page"}
    schema: {"type":"object","additionalProperties":false,"properties":{"items":{"type":"array","description":"角色条目","items":{"$ref":"urn:normify:data.identity.t-f1a5f939:RoleRecord"}},"page":{"$ref":"urn:normify:data.contract.t-d48e49f1:PageMeta"}},"required":["items","page"]}
deps:
  - kind: reference
    to: data.identity.t-f1a5f939
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-d48e49f1
    label: {zh: "类型引用", en: "Type reference"}
---
