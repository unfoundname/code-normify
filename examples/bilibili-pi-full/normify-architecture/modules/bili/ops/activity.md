---
uid: 7bec81df
id: bili.ops.activity
parent: bili.ops
state: planned
tags: [planned, "worker:W-OPS", leaf]
name: {zh: "活动与分类标签", en: "Campaigns and taxonomy labels"}
description:
  zh: >
      运营活动、页面配置、分类标签维护与素材
  en: >
      Campaigns, page configuration, taxonomy label maintenance and assets
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/activity/src/activity.ts"
  - path: "services/ops/activity/tests/activity.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/ops/campaigns"
    description:
      zh: >
          创建运营活动
      en: >
          Create a campaign
    input: {module: "bili.ops.activity", name: "CampaignRequest"}
    output: {module: "bili.ops.activity", name: "CampaignConfig"}
  - protocol: http
    method: PUT
    path: "/api/v1/ops/campaigns/"
    description:
      zh: >
          更新活动
      en: >
          Update a campaign
    input: {module: "bili.ops.activity", name: "CampaignRequest"}
    output: {module: "bili.ops.activity", name: "CampaignConfig"}
types:
  - name: "CampaignConfig"
    description: {zh: "活动配置", en: "Campaign config"}
    schema: {"type":"object","description":"活动配置 / Campaign config","additionalProperties":false,"properties":{"campaignId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 campaignId（语义见对应领域契约） / Field campaignId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"startAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 startAt（语义见对应领域契约） / Field startAt"},"endAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 endAt（语义见对应领域契约） / Field endAt"},"entryPage":{"type":"string","minLength":1,"description":"字段 entryPage（语义见对应领域契约） / Field entryPage"},"rewardRule":{"type":"string","minLength":1,"description":"字段 rewardRule（语义见对应领域契约） / Field rewardRule"},"status":{"type":"string","enum":["DRAFT","RUNNING","ENDED"],"description":"状态 / Status"}},"required":["campaignId","title","startAt","endAt","entryPage","rewardRule","status"]}
  - name: "CampaignRequest"
    description: {zh: "活动配置写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定）", en: "Campaign config write request carrying only client-provided fields"}
    schema: {"type":"object","description":"活动配置写入请求（仅客户端可提供字段；服务端字段由服务端或 RequestContext 决定） / Campaign config write request carrying only client-provided fields","additionalProperties":false,"properties":{"campaignId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 campaignId（语义见对应领域契约） / Field campaignId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"startAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 startAt（语义见对应领域契约） / Field startAt"},"endAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 endAt（语义见对应领域契约） / Field endAt"},"entryPage":{"type":"string","minLength":1,"description":"字段 entryPage（语义见对应领域契约） / Field entryPage"},"rewardRule":{"type":"string","minLength":1,"description":"字段 rewardRule（语义见对应领域契约） / Field rewardRule"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["campaignId","title","startAt","endAt","entryPage","rewardRule","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.catalog.taxonomy
    label: {zh: "维护分类与标签目录", en: "Maintain the taxonomy"}
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
