---
uid: f10641aa
id: bili.pgc.trial
parent: bili.pgc
state: planned
tags: [planned, "worker:W-PGC", leaf]
name: {zh: "试看", en: "Trials"}
description:
  zh: >
      试看片段、试看时长、试看转付费与提示
  en: >
      Trial segments, trial duration, trial-to-paid transition and prompts
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/pgc/trial/src/trial.ts"
  - path: "services/pgc/trial/tests/trial.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/pgc/trial-policies/"
    description:
      zh: >
          查询试看策略
      en: >
          Get a trial policy
    output: {module: "bili.pgc.trial", name: "TrialPolicy"}
types:
  - name: "TrialPolicy"
    description: {zh: "试看策略", en: "Trial policy"}
    schema: {"type":"object","description":"试看策略 / Trial policy","additionalProperties":false,"properties":{"policyId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 policyId（语义见对应领域契约） / Field policyId"},"resourceId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 resourceId（语义见对应领域契约） / Field resourceId"},"trialSec":{"type":"integer","description":"字段 trialSec（语义见对应领域契约） / Field trialSec"},"requireLogin":{"type":"boolean","description":"字段 requireLogin（语义见对应领域契约） / Field requireLogin"},"requireVip":{"type":"boolean","description":"字段 requireVip（语义见对应领域契约） / Field requireVip"}},"required":["policyId","resourceId","trialSec","requireLogin","requireVip"]}
deps:
  - kind: call
    to: bili.playback.grant
    label: {zh: "试看范围纳入播放授权", en: "Trial scope participates in"}
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
