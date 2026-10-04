---
uid: a528b55f
id: bili.commerce.wallet
parent: bili.commerce
state: planned
tags: ["worker:cm-wallet"]
name: {zh: "B 币与电池钱包", en: "Coin and Battery Wallet"}
description:
  zh: >
      充值套餐、余额查询、消费与退款的流水；所有变动经账本分录，余额派生不直接更新。
      
  en: >
      Top-up packages, balance queries and transaction flows; balance derived from ledger entries.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/wallet/src/service.ts"
  - path: "services/commerce/wallet/migrations/0001_wallet.sql"
  - path: "services/commerce/wallet/tests/wallet.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/wallet/balance"
    description:
      zh: >
          查询钱包余额
          
      en: >
          Get balance
          
    output: {module: "bili.commerce.wallet", name: "WalletBalance"}
  - protocol: http
    method: GET
    path: "/api/v1/wallet/packages"
    description:
      zh: >
          列出充值套餐
          
      en: >
          List topup packages
          
    output: {module: "bili.commerce.wallet", name: "TopupPackage"}
  - protocol: http
    method: POST
    path: "/api/v1/wallet/topup"
    description:
      zh: >
          发起充值（生成订单）
          
      en: >
          Top up
          
    input: {module: "bili.commerce.order", name: "OrderRecord"}
    output: {module: "bili.commerce.wallet", name: "WalletTransaction"}
  - protocol: http
    method: POST
    path: "/internal/wallet/transactions"
    description:
      zh: >
          内部扣款/入账（幂等）
          
      en: >
          Internal debit or credit
          
    input: {module: "bili.commerce.wallet", name: "WalletTransaction"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "wallet_transaction"
    description:
      zh: >
          钱包流水表（唯一写入所有者：钱包服务）
          
      en: >
          wallet_transaction table
          
types:
  - name: "TopupPackage"
    description: {zh: "充值套餐", en: "Topup package"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 topup_package","properties":{"packageId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY"],"description":"币种"},"baseAmount":{"type":"integer","description":"基础额度","minimum":1},"bonusAmount":{"type":"integer","description":"赠送额度","minimum":0},"price":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"state":{"type":"string","enum":["on_sale","off_shelf"],"description":"状态"},"sortIndex":{"type":"integer","description":"排序","minimum":0}},"required":["packageId","currency","baseAmount","price","state"]}
  - name: "WalletBalance"
    description: {zh: "钱包余额", en: "Wallet balance"}
    schema: {"type":"object","additionalProperties":false,"description":"只读视图，禁止直接改余额列","properties":{"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"currency":{"type":"string","description":"币种"},"available":{"type":"integer","description":"可用","minimum":0},"frozen":{"type":"integer","description":"冻结","minimum":0},"derivedFromEntries":{"type":"boolean","description":"是否由账本分录派生"},"asOf":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["userId","currency","available","frozen","derivedFromEntries"]}
  - name: "WalletTransaction"
    description: {zh: "钱包流水", en: "Wallet transaction"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 wallet_transaction（仅追加）","properties":{"transactionId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"userId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"currency":{"type":"string","description":"币种"},"direction":{"type":"string","enum":["credit","debit"],"description":"方向"},"amount":{"type":"integer","description":"金额（最小单位）","minimum":1},"reason":{"type":"string","enum":["topup","purchase","refund","expire","transfer_out","admin_adjust"],"description":"原因"},"externalRef":{"type":"string","description":"外部交易号"},"balanceAfter":{"type":"integer","description":"变动后余额","minimum":0},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["transactionId","userId","currency","direction","amount","reason","createdAt"]}
deps:
  - kind: reference
    to: bili.data.ledger
    label: {zh: "复用统一账本结构", en: "Reuse ledger tables"}
  - kind: event
    to: bili.contract.core.events
    label: {zh: "余额变动事件", en: "Balance change events"}
---
