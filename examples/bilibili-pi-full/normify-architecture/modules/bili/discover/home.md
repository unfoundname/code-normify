---
uid: 773c28d2
id: bili.discover.home
parent: bili.discover
state: planned
tags: [planned, "worker:W-DISCOVER", leaf]
name: {zh: "首页与分区", en: "Home and partitions"}
description:
  zh: >
      首页推荐位、分区入口、运营编排与个性化摘要
  en: >
      Home slots, partition entries, operations composition and personalized summary
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/discover/home/src/home.ts"
  - path: "services/discover/home/tests/home.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/discover/home"
    description:
      zh: >
          首页聚合
      en: >
          Home aggregation
    output: {module: "bili.discover.home", name: "HomePageModel"}
types:
  - name: "HomePageModel"
    description: {zh: "首页模型", en: "Home page model"}
    schema: {"type":"object","description":"首页模型 / Home page model","additionalProperties":false,"properties":{"slotGroups":{"type":"array","items":{"$ref":"urn:normify:bili.discover.home:HomeSlotGroup"},"description":"字段 slotGroups（语义见对应领域契约） / Field slotGroups"},"personalized":{"type":"boolean","description":"字段 personalized（语义见对应领域契约） / Field personalized"},"expireAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"过期时间 / Expire time"}},"required":["slotGroups","personalized","expireAt"]}
  - name: "HomeSlotGroup"
    description: {zh: "首页推荐位分组", en: "Home slot group"}
    schema: {"type":"object","description":"首页推荐位分组 / Home slot group","additionalProperties":false,"properties":{"slotId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 slotId（语义见对应领域契约） / Field slotId"},"title":{"type":"string","minLength":1,"description":"标题 / Title"},"resourceIds":{"type":"array","items":{"$ref":"urn:normify:bili.contract.common:Id"},"description":"字段 resourceIds（语义见对应领域契约） / Field resourceIds"},"reason":{"type":"string","minLength":1,"description":"原因或理由 / Reason"}},"required":["slotId","title","resourceIds"]}
deps:
  - kind: call
    to: bili.ops.recommend
    label: {zh: "运营推荐位配置", en: "Operations slot configuration"}
  - kind: call
    to: bili.discover.recommend
    label: {zh: "个性化召回", en: "Personalized recall"}
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
