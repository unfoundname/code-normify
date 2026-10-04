---
uid: 66aea1b4
id: bili.commerce.ledger
parent: bili.commerce
state: planned
tags: [planned, "worker:W-COMMERCE", leaf]
name: {zh: "交易账本", en: "Transaction ledger"}
description:
  zh: >
      复式记账账户与分录的唯一写入者，余额与结算的唯一数据源
  en: >
      Sole writer of double-entry accounts and entries; the single source for balances and settlements
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/ledger/src/ledger.ts"
  - path: "services/commerce/ledger/tests/ledger.test.ts"
apis:
  - protocol: rpc
    path: "commerce.ledger.post"
    description:
      zh: >
          复式过账
      en: >
          Post double-entry transactions
    input: {module: "bili.commerce.ledger", name: "PostEntriesRequest"}
    output: {module: "bili.contract.ledger", name: "LedgerAccount"}
  - protocol: http
    method: GET
    path: "/api/v1/commerce/ledger-accounts/"
    description:
      zh: >
          查询账本账户
      en: >
          Get a ledger account
    output: {module: "bili.contract.ledger", name: "LedgerAccount"}
  - protocol: rpc
    path: "db.table.ledger_entry"
    description:
      zh: >
          权威表 ledger_entry（唯一写入所有者：本模块）
      en: >
          Authoritative table (RDS dialect and adapter pending) (RDS dialect and adapter pending) (RDS dialect and adapter pending) (RDS dialect and adapter pending) (RDS dialect and adapter pending) (RDS
types:
  - name: "PostEntriesRequest"
    description: {zh: "过账请求", en: "Post entries request"}
    schema: {"type":"object","description":"过账请求 / Post entries request","additionalProperties":false,"properties":{"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"postings":{"type":"array","items":{"$ref":"urn:normify:bili.commerce.ledger:PostingLine"},"description":"字段 postings（语义见对应领域契约） / Field postings"}},"required":["idempotencyKey","postings"]}
  - name: "PostingLine"
    description: {zh: "过账行", en: "Posting line"}
    schema: {"type":"object","description":"过账行 / Posting line","additionalProperties":false,"properties":{"accountId":{"$ref":"urn:normify:bili.contract.common:Id","description":"账户 ID / Account id"},"direction":{"type":"string","enum":["debit","credit"],"description":"借贷方向 / Debit or credit"},"amount":{"$ref":"urn:normify:bili.contract.common:Money","description":"金额（最小货币单位整数） / Amount in minor units"},"reason":{"type":"string","enum":["recharge","purchase","gift","coin","charge","refund","settle","adjust"],"description":"原因或理由 / Reason"},"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"}},"required":["accountId","direction","amount","reason","targetId"]}
deps:
  - kind: reference
    to: bili.contract.ledger
    label: {zh: "复用统一账本契约", en: "Reuse the unified ledger"}
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
