---
uid: 922e161c
id: data.live.t-3cf7ae60
parent: data.live
state: planned
tags: ["worker:live-gift", "projection:data-contract"]
name: {zh: "GiftLedgerEntry", en: "GiftLedgerEntry"}
description:
  zh: >
      礼物账本分录
  en: >
      Gift ledger entry
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/live/t-3cf7ae60.json"
apis: []
types:
  - name: "GiftLedgerEntry"
    description: {zh: "礼物账本分录", en: "Gift ledger entry"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 live_gift_ledger_entry（仅追加），与 ledger_transfer 对应","properties":{"entryId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"roomId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"senderId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"anchorId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"giftId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"count":{"type":"integer","description":"数量","minimum":1},"totalCoins":{"type":"integer","description":"总价（最小单位）","minimum":0},"platformShareCoins":{"type":"integer","description":"平台分成","minimum":0},"anchorShareCoins":{"type":"integer","description":"主播分成","minimum":0},"transferId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["entryId","roomId","senderId","anchorId","giftId","count","totalCoins","transferId"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
