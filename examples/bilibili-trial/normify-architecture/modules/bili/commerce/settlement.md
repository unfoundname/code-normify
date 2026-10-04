---
uid: 8b591959
id: bili.commerce.settlement
parent: bili.commerce
state: planned
tags: ["worker:cm-settle"]
name: {zh: "结算、提现与对账", en: "Settlement, Withdrawal and Reconciliation"}
description:
  zh: >
      按周期汇总主播/UP 主收益、平台分成、提现申请与审核、渠道对账差异定位。
      
  en: >
      Periodic revenue aggregation, platform fees, withdrawal review and channel reconciliation.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/commerce/settlement/src/statement.ts"
  - path: "services/commerce/settlement/src/withdrawal.ts"
  - path: "services/commerce/settlement/migrations/0001_settlement.sql"
  - path: "services/commerce/settlement/tests/settlement.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/settlements/statements"
    description:
      zh: >
          查询结算单
          
      en: >
          List statements
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.commerce.settlement", name: "SettlementStatement"}
  - protocol: http
    method: POST
    path: "/api/v1/withdrawals"
    description:
      zh: >
          申请提现
          
      en: >
          Request withdrawal
          
    input: {module: "bili.commerce.settlement", name: "WithdrawalRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/internal/settlements/reconcile"
    description:
      zh: >
          执行渠道对账
          
      en: >
          Run reconciliation
          
    input: {module: "bili.commerce.settlement", name: "ReconciliationBatch"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "settlement_statement"
    description:
      zh: >
          结算单表（唯一写入所有者：结算服务）
          
      en: >
          settlement_statement table
          
types:
  - name: "SettlementStatement"
    description: {zh: "结算单", en: "Settlement statement"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 settlement_statement，唯一约束 owner_id+period_start","properties":{"statementId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"periodStart":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"periodEnd":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"grossAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"platformFeeAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"netAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"state":{"type":"string","enum":["draft","confirmed","paid","disputed"],"description":"状态"},"ledgerTransferIds":{"type":"array","description":"关联账本转账","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"confirmedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["statementId","ownerId","periodStart","periodEnd","netAmount","state"]}
  - name: "WithdrawalRequest"
    description: {zh: "提现申请", en: "Withdrawal request"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 withdrawal_request；需实名与税务信息齐全才可提现","properties":{"withdrawalId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"amount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"taxWithheld":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"channel":{"type":"string","enum":["bank_transfer","alipay","pending_decision"],"description":"渠道"},"state":{"type":"string","enum":["requested","reviewing","approved","rejected","paid","failed"],"description":"状态机"},"requestedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"reviewedBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"paidAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"failReason":{"type":"string","description":"失败原因"}},"required":["withdrawalId","ownerId","amount","state","requestedAt"]}
  - name: "ReconciliationBatch"
    description: {zh: "对账批次", en: "Reconciliation batch"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 reconciliation_batch，与 bili.data.ledger 的 reconciliation 结构对齐","properties":{"batchId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"period":{"type":"string","description":"对账周期，如 2026-06"},"channel":{"type":"string","description":"渠道"},"expectedAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"actualAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"diffAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"diffCount":{"type":"integer","description":"差异笔数","minimum":0},"state":{"type":"string","enum":["matched","mismatched","resolved"],"description":"状态"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["batchId","period","channel","expectedAmount","actualAmount","state"]}
deps:
  - kind: reference
    to: bili.data.ledger
    label: {zh: "账本分录为结算唯一依据", en: "Ledger is the only source"}
  - kind: call
    to: bili.identity.verify
    label: {zh: "提现前实名与税务校验", en: "Real-name before withdrawal"}
  - kind: call
    to: bili.infra.jobs
    label: {zh: "周期结算与对账任务", en: "Periodic settlement jobs"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "提现审核审计", en: "Audit withdrawals"}
---
