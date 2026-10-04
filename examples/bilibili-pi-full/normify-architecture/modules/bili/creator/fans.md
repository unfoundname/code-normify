---
uid: 0e6f0034
id: bili.creator.fans
parent: bili.creator
state: planned
tags: [planned, "worker:W-CREATOR", leaf]
name: {zh: "粉丝分析", en: "Fan analytics"}
description:
  zh: >
      粉丝增长、活跃分层、地域与流失预警
  en: >
      Fan growth, activity tiers, regions and churn warnings
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/creator/fans/src/fans.ts"
  - path: "services/creator/fans/tests/fans.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/creator/fans"
    description:
      zh: >
          粉丝概览
      en: >
          Fan overview
    output: {module: "bili.creator.fans", name: "FansOverview"}
types:
  - name: "FansOverview"
    description: {zh: "粉丝概览", en: "Fan overview"}
    schema: {"type":"object","description":"粉丝概览 / Fan overview","additionalProperties":false,"properties":{"creatorId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 creatorId（语义见对应领域契约） / Field creatorId"},"followerCount":{"type":"integer","description":"字段 followerCount（语义见对应领域契约） / Field followerCount"},"newFollowers":{"type":"integer","description":"字段 newFollowers（语义见对应领域契约） / Field newFollowers"},"activeRate":{"type":"number","description":"字段 activeRate（语义见对应领域契约） / Field activeRate"},"topRegions":{"type":"array","items":{"type":"string","minLength":1},"description":"字段 topRegions（语义见对应领域契约） / Field topRegions"}},"required":["creatorId","followerCount","newFollowers","activeRate","topRegions"]}
deps:
  - kind: call
    to: bili.social.follow
    label: {zh: "读取关注关系", en: "Read follow relations"}
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
