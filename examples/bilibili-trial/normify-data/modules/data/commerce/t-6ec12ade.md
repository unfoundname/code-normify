---
uid: e6ecba75
id: data.commerce.t-6ec12ade
parent: data.commerce
state: planned
tags: ["worker:cm-wallet", "projection:data-contract"]
name: {zh: "WalletTransaction", en: "WalletTransaction"}
description:
  zh: >
      钱包流水
  en: >
      Wallet transaction
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/commerce/t-6ec12ade.json"
apis: []
types:
  - name: "WalletTransaction"
    description: {zh: "钱包流水", en: "Wallet transaction"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 wallet_transaction（仅追加）","properties":{"transactionId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"currency":{"type":"string","description":"币种"},"direction":{"type":"string","enum":["credit","debit"],"description":"方向"},"amount":{"type":"integer","description":"金额（最小单位）","minimum":1},"reason":{"type":"string","enum":["topup","purchase","refund","expire","transfer_out","admin_adjust"],"description":"原因"},"externalRef":{"type":"string","description":"外部交易号"},"balanceAfter":{"type":"integer","description":"变动后余额","minimum":0},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["transactionId","userId","currency","direction","amount","reason","createdAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
