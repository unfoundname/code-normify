---
uid: 9da9f1ed
id: data.identity.t-8ffb89e3
parent: data.identity
state: planned
tags: ["worker:id-account", "projection:data-contract"]
name: {zh: "RegisterRequest", en: "RegisterRequest"}
description:
  zh: >
      注册请求
  en: >
      Registration request
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/identity/t-8ffb89e3.json"
apis: []
types:
  - name: "RegisterRequest"
    description: {zh: "注册请求", en: "Registration request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"loginName":{"type":"string","description":"登录名","minLength":3,"maxLength":32},"password":{"type":"string","description":"密码（服务端只存散列）","minLength":8,"maxLength":72},"email":{"type":"string","description":"邮箱","format":"email"},"phone":{"type":"string","description":"手机号","pattern":"^\\+?[0-9]{6,20}$"},"inviteCode":{"type":"string","description":"邀请码"},"idempotencyKey":{"$ref":"urn:normify:data.contract.t-8cc5302d:IdempotencyKey"}},"required":["loginName","password","idempotencyKey"]}
deps:
  - kind: reference
    to: data.contract.t-8cc5302d
    label: {zh: "类型引用", en: "Type reference"}
---
