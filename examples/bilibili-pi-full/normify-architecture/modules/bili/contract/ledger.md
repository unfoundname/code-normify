---
uid: a8dcf52f
id: bili.contract.ledger
parent: bili.contract
state: planned
tags: [planned, "worker:W-CONTRACT", leaf]
name: {zh: "账本契约", en: "Ledger contracts"}
description:
  zh: >
      复式记账账户、分录、过账与结算批次；支付/礼物/收益共用
  en: >
      Double-entry accounts, entries, postings and settlement batches shared by payment, gifts and revenue
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "contracts/types/ledger.ts"
  - path: "contracts/tests/ledger.test.mjs"
apis:
  - protocol: file
    path: "contracts/types/ledger.ts"
    description:
      zh: >
          账本契约入口
      en: >
          Ledger contract entry
types:
  - name: "LedgerAccount"
    description: {zh: "账本账户", en: "Ledger account"}
    schema: {"type":"object","description":"账本账户 / Ledger account","additionalProperties":false,"properties":{"accountId":{"$ref":"urn:normify:bili.contract.common:Id","description":"账户 ID / Account id"},"ownerId":{"$ref":"urn:normify:bili.contract.common:Id","description":"所有者用户 ID / Owner user id"},"accountType":{"type":"string","enum":["USER_AVAILABLE","USER_FROZEN","PLATFORM_REVENUE","PLATFORM_COST","CREATOR_PAYABLE","ESCROW"],"description":"字段 accountType（语义见对应领域契约） / Field accountType"},"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","COIN"],"description":"货币代码 / Currency code"},"balance":{"$ref":"urn:normify:bili.contract.common:Money","description":"可用余额（最小货币单位整数） / Balance in minor units"}},"required":["accountId","ownerId","accountType","currency","balance"]}
  - name: "LedgerEntry"
    description: {zh: "账本分录", en: "Ledger entry"}
    schema: {"type":"object","description":"账本分录 / Ledger entry","additionalProperties":false,"properties":{"entryId":{"$ref":"urn:normify:bili.contract.common:Id","description":"账本分录 ID / Ledger entry id"},"accountId":{"$ref":"urn:normify:bili.contract.common:Id","description":"账户 ID / Account id"},"direction":{"type":"string","enum":["debit","credit"],"description":"借贷方向 / Debit or credit"},"amount":{"$ref":"urn:normify:bili.contract.common:Money","description":"金额（最小货币单位整数） / Amount in minor units"},"reason":{"type":"string","enum":["recharge","purchase","gift","coin","charge","refund","settle","adjust"],"description":"原因或理由 / Reason"},"targetId":{"$ref":"urn:normify:bili.contract.common:Id","description":"目标对象 ID / Target object id"},"balanceAfter":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 balanceAfter（语义见对应领域契约） / Field balanceAfter"},"createdAt":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"创建时间 / Created time"}},"required":["entryId","accountId","direction","amount","reason","targetId","balanceAfter","createdAt"]}
  - name: "LedgerPosting"
    description: {zh: "过账对", en: "Ledger posting"}
    schema: {"type":"object","description":"过账对 / Ledger posting","additionalProperties":false,"properties":{"postingId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 postingId（语义见对应领域契约） / Field postingId"},"debitEntryId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 debitEntryId（语义见对应领域契约） / Field debitEntryId"},"creditEntryId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 creditEntryId（语义见对应领域契约） / Field creditEntryId"},"amount":{"$ref":"urn:normify:bili.contract.common:Money","description":"金额（最小货币单位整数） / Amount in minor units"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.common:IdempotencyKey","description":"幂等键（写操作必填） / Idempotency key"}},"required":["postingId","debitEntryId","creditEntryId","amount","idempotencyKey"]}
  - name: "SettlementBatch"
    description: {zh: "结算批次", en: "Settlement batch"}
    schema: {"type":"object","description":"结算批次 / Settlement batch","additionalProperties":false,"properties":{"batchId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 batchId（语义见对应领域契约） / Field batchId"},"periodStart":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 periodStart（语义见对应领域契约） / Field periodStart"},"periodEnd":{"$ref":"urn:normify:bili.contract.common:Timestamp","description":"字段 periodEnd（语义见对应领域契约） / Field periodEnd"},"creatorId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 creatorId（语义见对应领域契约） / Field creatorId"},"payableAmount":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 payableAmount（语义见对应领域契约） / Field payableAmount"},"status":{"type":"string","enum":["OPEN","CALCULATED","PAID","FAILED"],"description":"状态 / Status"}},"required":["batchId","periodStart","periodEnd","creatorId","payableAmount","status"]}
---
