---
uid: f2c64315
id: bili.acquire.dedupe
parent: bili.acquire
state: planned
tags: [planned, "worker:W-ACQUIRE", leaf]
name: {zh: "去重", en: "Dedupe"}
description:
  zh: >
      内容指纹、相似度比对、重复合并与人工确认
  en: >
      Content fingerprints, similarity comparison, duplicate merging and manual confirmation
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/acquire/dedupe/src/dedupe.ts"
  - path: "services/acquire/dedupe/tests/dedupe.test.ts"
apis:
  - protocol: rpc
    path: "acquire.dedupe.check"
    description:
      zh: >
          执行去重比对
      en: >
          Run dedupe comparison
    input: {module: "bili.media.asset", name: "MediaAssetView"}
    output: {module: "bili.acquire.dedupe", name: "DedupeResult"}
types:
  - name: "DedupeResult"
    description: {zh: "去重结果", en: "Dedupe result"}
    schema: {"type":"object","description":"去重结果 / Dedupe result","additionalProperties":false,"properties":{"resultId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resultId（语义见对应领域契约） / Field resultId"},"assetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"媒体资源 ID / Media asset id"},"fingerprintHash":{"type":"string","minLength":1,"description":"内容指纹 / Content fingerprint hash"},"dedupeOf":{"$ref":"urn:normify:bili.contract.common:Id","description":"重复对象 ID / Duplicate of"},"similarity":{"type":"number","description":"字段 similarity（语义见对应领域契约） / Field similarity"}},"required":["resultId","assetId","fingerprintHash","similarity"]}
deps:
  - kind: call
    to: bili.media.asset
    label: {zh: "读取原件指纹与时长", en: "Read original fingerprint and"}
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
