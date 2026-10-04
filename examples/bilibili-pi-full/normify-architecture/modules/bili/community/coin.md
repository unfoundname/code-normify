---
uid: 00fb3e40
id: bili.community.coin
parent: bili.community
state: planned
tags: [planned, "worker:W-COMMUNITY", leaf]
name: {zh: "投币与硬币账本", en: "Coins and the coin ledger"}
description:
  zh: >
      每日硬币、投币消费、退回与余额派生
  en: >
      Daily coins, spending, refunds and derived balance
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "services/community/coin/src/coin.ts"
  - path: "services/community/coin/tests/coin.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/community/coin-balance"
    description:
      zh: >
          查询硬币余额
      en: >
          Get coin balance
    output: {module: "bili.community.coin", name: "CoinBalance"}
  - protocol: http
    method: POST
    path: "/api/v1/community/coin-spends"
    description:
      zh: >
          投币并写入账本分录
      en: >
          Spend coins and write ledger entries
    input: {module: "bili.community.coin", name: "CoinSpendRequest"}
    output: {module: "bili.contract.ledger", name: "LedgerEntry"}
types:
  - name: "CoinBalance"
    description: {zh: "硬币余额", en: "Coin balance"}
    schema: {"type":"object","description":"硬币余额 / Coin balance","additionalProperties":false,"properties":{"userId":{"$ref":"urn:normify:bili.contract.common:Id","description":"用户 ID / User id"},"available":{"type":"integer","description":"字段 available（语义见对应领域契约） / Field available"},"todayEarned":{"type":"integer","description":"字段 todayEarned（语义见对应领域契约） / Field todayEarned"},"derivedFromEntries":{"type":"boolean","description":"字段 derivedFromEntries（语义见对应领域契约） / Field derivedFromEntries"}},"required":["userId","available","todayEarned","derivedFromEntries"]}
  - name: "CoinSpendRequest"
    description: {zh: "投币请求", en: "Coin spend request"}
    schema: {"type":"object","description":"投币请求 / Coin spend request","additionalProperties":false,"properties":{"bvid":{"type":"string","minLength":1,"description":"视频业务号（BV 号） / Video business id"},"amount":{"type":"integer","description":"金额（最小货币单位整数） / Amount in minor units"},"alsoLike":{"type":"boolean","description":"字段 alsoLike（语义见对应领域契约） / Field alsoLike"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"},"requestContext":{"$ref":"urn:normify:bili.contract.common:RequestContext","description":"字段 requestContext（语义见对应领域契约） / Field requestContext"}},"required":["bvid","amount","alsoLike","idempotencyKey","requestContext"]}
deps:
  - kind: call
    to: bili.commerce.ledger
    from_api: "POST /api/v1/community/coin-spends"
    to_api: "rpc:commerce.ledger.post"
    label: {zh: "复用复式账本与对账", en: "Reuse the double-entry ledger"}
  - kind: call
    to: bili.catalog.video
    label: {zh: "只允许给已发布稿件投币", en: "Only published videos accept"}
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
