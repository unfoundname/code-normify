---
uid: 9b0b4a72
id: bili.infra.config
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "配置与凭据引用", en: "Configuration and credential references"}
description:
  zh: >
      配置分层、密钥引用（不落明文）、开关与灰度参数
  en: >
      Layered configuration, secret references without plaintext, flags and canary parameters
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/platform/config/src/config.ts"
  - path: "services/platform/config/tests/config.test.ts"
apis:
  - protocol: rpc
    path: "config.resolve"
    description:
      zh: >
          解析配置与密钥引用
      en: >
          Resolve configuration and secret references
    input: {module: "bili.infra.config", name: "ConfigRef"}
types:
  - name: "ConfigRef"
    description: {zh: "配置引用", en: "Config reference"}
    schema: {"type":"object","description":"配置引用 / Config reference","additionalProperties":false,"properties":{"key":{"type":"string","minLength":1,"description":"字段 key（语义见对应领域契约） / Field key"},"scope":{"type":"string","enum":["GLOBAL","SERVICE","WORKER"],"description":"字段 scope（语义见对应领域契约） / Field scope"},"secretRef":{"type":"string","minLength":1,"description":"字段 secretRef（语义见对应领域契约） / Field secretRef"}},"required":["key","scope"]}
deps:
  - kind: reference
    to: bili.contract.common
    label: {zh: "统一配置错误契约", en: "Unified configuration error"}
---
