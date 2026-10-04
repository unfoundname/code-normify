---
uid: 38af873a
id: data.contract.t-fcdae34a
parent: data.contract
state: planned
tags: ["worker:contract-core", "projection:data-contract"]
name: {zh: "AuthContext", en: "AuthContext"}
description:
  zh: >
      鉴权上下文
  en: >
      Authorization context
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-fcdae34a.json"
apis: []
types:
  - name: "AuthContext"
    description: {zh: "鉴权上下文", en: "Authorization context"}
    schema: {"type":"object","additionalProperties":false,"description":"由接入层解析令牌后注入，业务模块只读","properties":{"actorId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"roles":{"type":"array","description":"角色码","items":{"type":"string","description":"角色码"}},"permissions":{"type":"array","description":"权限码","items":{"$ref":"urn:normify:data.contract.t-e66ed951:PermissionCode"}},"deviceId":{"type":"string","description":"设备标识"},"tokenId":{"type":"string","description":"令牌标识"},"channel":{"type":"string","enum":["web","admin","studio","openapi"],"description":"访问通道"}},"required":["actorId","roles"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-e66ed951
    label: {zh: "类型引用", en: "Type reference"}
---
