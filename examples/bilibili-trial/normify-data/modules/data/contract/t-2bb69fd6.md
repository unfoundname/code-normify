---
uid: d713a74f
id: data.contract.t-2bb69fd6
parent: data.contract
state: planned
tags: ["worker:contract-core", "projection:data-contract"]
name: {zh: "ApiError", en: "ApiError"}
description:
  zh: >
      唯一错误对象
  en: >
      Single error object
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-2bb69fd6.json"
apis: []
types:
  - name: "ApiError"
    description: {zh: "唯一错误对象", en: "Single error object"}
    schema: {"type":"object","additionalProperties":false,"description":"禁止各域自定义错误体","properties":{"code":{"type":"string","description":"机器可读错误码","pattern":"^[A-Z][A-Z0-9_]{2,63}$"},"message":{"type":"string","description":"人类可读信息"},"retryable":{"type":"boolean","description":"客户端是否可重试"},"details":{"type":"array","description":"字段级明细","items":{"type":"object","additionalProperties":false,"properties":{"field":{"type":"string","description":"字段路径"},"reason":{"type":"string","description":"失败原因"}},"required":["field","reason"]}}},"required":["code","message","retryable"]}
---
