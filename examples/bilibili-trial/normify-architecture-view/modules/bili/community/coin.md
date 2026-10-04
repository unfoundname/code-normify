---
uid: c3c7e173
id: bili.community.coin
parent: bili.community
state: planned
tags: ["worker:com-coin"]
name: {zh: "投币与虚拟币账本", en: "Coins and Virtual Ledger"}
description:
  zh: >
      每日登录币、投币消费、退回与余额查询；一切变动写复式账本分录，余额由分录派生。
      
  en: >
      Daily coins, coin spending, refunds and balance; all changes are ledger entries, balance is derived.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/community/coin/src/service.ts"
  - path: "services/community/coin/migrations/0001_coin.sql"
  - path: "services/community/coin/tests/coin.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/coins/balance"
    description:
      zh: >
          查询硬币余额
          
      en: >
          Get coin balance
          
    output: {module: "bili.community.coin", name: "CoinBalance"}
  - protocol: http
    method: POST
    path: "/api/v1/coins/spend"
    description:
      zh: >
          投币
          
      en: >
          Spend coins
          
    input: {module: "bili.community.coin", name: "CoinSpendRequest"}
    output: {module: "bili.community.coin", name: "CoinLedgerEntry"}
  - protocol: http
    method: POST
    path: "/api/v1/coins/daily-grant"
    description:
      zh: >
          发放每日登录币（幂等，每日一次）
          
      en: >
          Daily login grant
          
    input: {module: "bili.contract.core.idempotency", name: "IdempotencyKey"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "coin_ledger_entry"
    description:
      zh: >
          硬币分录表（唯一写入所有者：硬币服务）
          
      en: >
          coin ledger table
          
types:
  - name: "CoinBalance"
    description: {zh: "硬币余额", en: "Coin balance"}
    schema: {"type":"object","additionalProperties":false,"description":"只读视图：余额由 ledger_entry 派生，禁止直接 UPDATE 余额","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"available":{"type":"integer","description":"可用硬币","minimum":0},"frozen":{"type":"integer","description":"冻结硬币","minimum":0},"todayEarned":{"type":"integer","description":"今日获得","minimum":0},"derivedFromEntries":{"type":"boolean","description":"是否由账本分录派生"},"asOf":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","available","frozen","derivedFromEntries"]}
  - name: "CoinSpendRequest"
    description: {zh: "投币请求", en: "Coin spend request"}
    schema: {"type":"object","additionalProperties":false,"description":"每视频累计上限与每日上限由策略约束","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"videoId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"amount":{"type":"integer","description":"投币枚数 1-2","minimum":1,"maximum":2},"alsoLike":{"type":"boolean","description":"是否同时点赞"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["userId","videoId","amount","idempotencyKey"]}
  - name: "CoinLedgerEntry"
    description: {zh: "硬币分录", en: "Coin ledger entry"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 coin_ledger_entry（仅追加），与通用账本表结构对齐","properties":{"entryId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"accountId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"direction":{"type":"string","enum":["debit","credit"],"description":"方向"},"amount":{"type":"integer","description":"枚数","minimum":1},"reason":{"type":"string","enum":["daily_login","task_reward","video_coin","refund","admin_adjust"],"description":"原因"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"balanceAfter":{"type":"integer","description":"变动后余额","minimum":0},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["entryId","accountId","userId","direction","amount","reason","createdAt"]}
deps:
  - kind: reference
    to: bili.data.ledger
    label: {zh: "使用统一账本表结构与对账", en: "Reuse ledger table contract"}
  - kind: call
    to: bili.publish.catalog
    label: {zh: "只能给已发布视频投币", en: "Coins only for published video"}
  - kind: call
    to: bili.community.reaction
    label: {zh: "投币可同时点赞", en: "Optional like on coin"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "投币事件驱动收益与统计", en: "Coin events feed revenue"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "资金类操作审计", en: "Audit money-like actions"}
---
