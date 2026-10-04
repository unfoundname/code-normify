---
uid: f9415a23
id: bili.acquire.source
parent: bili.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", leaf]
name: {zh: "许可来源发现与登记", en: "Licensed source discovery"}
description:
  zh: >
      来源清单、授权方、可获取范围与来源健康度
  en: >
      Source lists, licensors, obtainable scope and source health
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/acquire/source/src/source.ts"
  - path: "services/acquire/source/tests/source.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/acquire/sources"
    description:
      zh: >
          登记许可来源
      en: >
          Register a licensed source
    input: {module: "bili.acquire.source", name: "SourceRegisterRequest"}
    output: {module: "bili.acquire.source", name: "SourceRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/acquire/sources"
    description:
      zh: >
          来源清单
      en: >
          Source list
    output: {module: "bili.contract.common", name: "PageResult"}
types:
  - name: "SourceRecord"
    description: {zh: "来源记录", en: "Source record"}
    schema: {"type":"object","description":"来源记录 / Source record","additionalProperties":false,"properties":{"sourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"来源 ID / Source id"},"name":{"type":"string","minLength":1,"description":"字段 name（语义见对应领域契约） / Field name"},"sourceUrl":{"type":"string","minLength":1,"format":"uri","description":"来源地址 / Source url"},"licenseType":{"type":"string","enum":["PUBLIC_DOMAIN","CC_BY","CC_BY_SA","COMMERCIAL","AUTHORIZED_UPLOAD"],"description":"许可类型 / License type"},"obtainableKinds":{"type":"array","items":{"type":"string","enum":["VIDEO","AUDIO","IMAGE"],"description":"业务枚举，取值须覆盖该产品类型的完整取值集合"},"description":"字段 obtainableKinds（语义见对应领域契约） / Field obtainableKinds"}},"required":["sourceId","name","sourceUrl","licenseType","obtainableKinds"]}
  - name: "SourceRegisterRequest"
    description: {zh: "来源登记请求", en: "Source register request"}
    schema: {"type":"object","description":"来源登记请求 / Source register request","additionalProperties":false,"properties":{"name":{"type":"string","minLength":1,"description":"字段 name（语义见对应领域契约） / Field name"},"sourceUrl":{"type":"string","minLength":1,"format":"uri","description":"来源地址 / Source url"},"licenseType":{"type":"string","enum":["PUBLIC_DOMAIN","CC_BY","CC_BY_SA","COMMERCIAL","AUTHORIZED_UPLOAD"],"description":"许可类型 / License type"},"obtainableKinds":{"type":"array","items":{"type":"string","enum":["VIDEO","AUDIO","IMAGE"],"description":"业务枚举，取值须覆盖该产品类型的完整取值集合"},"description":"字段 obtainableKinds（语义见对应领域契约） / Field obtainableKinds"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["name","sourceUrl","licenseType","obtainableKinds","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.acquire.license
    label: {zh: "要求来源附带许可证据", en: "Require license evidence for a"}
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
