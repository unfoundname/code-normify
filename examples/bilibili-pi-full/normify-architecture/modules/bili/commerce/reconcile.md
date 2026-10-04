---
uid: 521b9d81
id: bili.commerce.reconcile
parent: bili.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", leaf]
name: {zh: "对账", en: "Reconciliation"}
description:
  zh: >
      渠道账单拉取、差异识别、人工处理与对账报告
  en: >
      Channel statement pulling, discrepancy detection, manual handling and reconciliation reports
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/reconcile/src/reconcile.ts"
  - path: "services/commerce/reconcile/tests/reconcile.test.ts"
apis:
  - protocol: rpc
    path: "commerce.reconcile.run"
    description:
      zh: >
          执行对账
      en: >
          Run reconciliation
    output: {module: "bili.commerce.reconcile", name: "ReconcileReport"}
types:
  - name: "ReconcileReport"
    description: {zh: "对账报告", en: "Reconciliation report"}
    schema: {"type":"object","description":"对账报告 / Reconciliation report","additionalProperties":false,"properties":{"reportId":{"$ref":"urn:normify:bili.contract.common:Id","description":"举报 ID / Report id"},"channel":{"type":"string","enum":["ALIPAY","WECHAT","APPLE","GOOGLE","CARD"],"description":"推送通道 / Push channel"},"periodStart":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 periodStart（语义见对应领域契约） / Field periodStart"},"periodEnd":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 periodEnd（语义见对应领域契约） / Field periodEnd"},"matchedCount":{"type":"integer","description":"字段 matchedCount（语义见对应领域契约） / Field matchedCount"},"diffCount":{"type":"integer","description":"字段 diffCount（语义见对应领域契约） / Field diffCount"}},"required":["reportId","channel","periodStart","periodEnd","matchedCount","diffCount"]}
deps:
  - kind: call
    to: bili.commerce.ledger
    label: {zh: "核对账本分录与渠道账单", en: "Compare ledger entries with"}
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
