---
uid: bca73e15
id: data.community.t-df685f0a
parent: data.community
state: planned
tags: ["worker:com-coin", "projection:data-contract"]
name: {zh: "CoinLedgerEntry", en: "CoinLedgerEntry"}
description:
  zh: >
      硬币分录
  en: >
      Coin ledger entry
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/community/t-df685f0a.json"
apis: []
types:
  - name: "CoinLedgerEntry"
    description: {zh: "硬币分录", en: "Coin ledger entry"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 coin_ledger_entry（仅追加），与通用账本表结构对齐","properties":{"entryId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"accountId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"direction":{"type":"string","enum":["debit","credit"],"description":"方向"},"amount":{"type":"integer","description":"枚数","minimum":1},"reason":{"type":"string","enum":["daily_login","task_reward","video_coin","refund","admin_adjust"],"description":"原因"},"targetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"balanceAfter":{"type":"integer","description":"变动后余额","minimum":0},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["entryId","accountId","userId","direction","amount","reason","createdAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
