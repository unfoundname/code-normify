---
uid: 145890d7
id: bili.creator.revenue
parent: bili.creator
state: planned
tags: ["worker:cre-revenue"]
name: {zh: "激励收益与提现", en: "Revenue and Withdrawal"}
description:
  zh: >
      收益汇总与明细（投币/充电/礼物/会员分成/课程）、可提现与冻结额度、提现资格校验；数据来自账本。
      
  en: >
      Revenue summary and details (coins/charge/gifts/member split/courses), withdrawable amounts and eligibility.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/creator/revenue/src/summary.ts"
  - path: "services/creator/revenue/src/eligibility.ts"
  - path: "services/creator/revenue/tests/revenue.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/creator/revenue/summary"
    description:
      zh: >
          读取收益汇总
          
      en: >
          Get revenue summary
          
    output: {module: "bili.creator.revenue", name: "CreatorRevenueSummary"}
  - protocol: http
    method: GET
    path: "/api/v1/creator/revenue/details"
    description:
      zh: >
          读取收益明细
          
      en: >
          Get revenue details
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.creator.revenue", name: "RevenueDetailItem"}
  - protocol: http
    method: GET
    path: "/api/v1/creator/withdrawal-eligibility"
    description:
      zh: >
          校验提现资格
          
      en: >
          Check withdrawal eligibility
          
    output: {module: "bili.creator.revenue", name: "WithdrawalEligibility"}
types:
  - name: "CreatorRevenueSummary"
    description: {zh: "收益汇总", en: "Revenue summary"}
    schema: {"type":"object","additionalProperties":false,"description":"只读汇总：唯一依据是账本分录与结算单","properties":{"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"period":{"type":"string","description":"周期，如 2026-06"},"components":{"type":"array","description":"收益构成","items":{"type":"object","additionalProperties":false,"properties":{"source":{"type":"string","enum":["video_coin","charge","gift","member_split","course","support","task_reward"],"description":"来源"},"amount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"count":{"type":"integer","description":"笔数","minimum":0}},"required":["source","amount"]}},"grossAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"platformFeeAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"netAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"withdrawableAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"pendingAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"settlementState":{"type":"string","enum":["draft","confirmed","paid","disputed"],"description":"结算状态"},"asOf":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["ownerId","period","grossAmount","netAmount","withdrawableAmount"]}
  - name: "RevenueDetailItem"
    description: {zh: "收益明细", en: "Revenue detail"}
    schema: {"type":"object","additionalProperties":false,"description":"来自账本/结算明细，不允许人工改写","properties":{"itemId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"source":{"type":"string","description":"来源"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"counterpartyId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"amount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"platformFeeAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"statementId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"occurredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["itemId","source","amount","occurredAt"]}
  - name: "WithdrawalEligibility"
    description: {zh: "提现资格", en: "Withdrawal eligibility"}
    schema: {"type":"object","additionalProperties":false,"description":"资格为实时判定，不作为承诺","properties":{"ownerId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"eligible":{"type":"boolean","description":"是否满足提现条件"},"reasons":{"type":"array","description":"未满足原因","items":{"type":"string","description":"原因码"}},"realNameVerified":{"type":"boolean","description":"是否已实名"},"taxInfoComplete":{"type":"boolean","description":"税务信息是否完整"},"minAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"withdrawableAmount":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"checkedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["ownerId","eligible","reasons","checkedAt"]}
deps:
  - kind: call
    to: bili.commerce.settlement
    from_api: "GET /api/v1/creator/revenue/summary"
    to_api: "GET /api/v1/settlements/statements"
    label: {zh: "结算单与提现由结算域执行", en: "Settlement and withdrawal"}
  - kind: call
    to: bili.identity.verify
    label: {zh: "实名与税务信息校验", en: "Real-name and tax check"}
  - kind: call
    to: bili.commerce.charge
    label: {zh: "充电收益明细", en: "Charge revenue"}
  - kind: call
    to: bili.live.gift
    label: {zh: "礼物分成明细", en: "Gift revenue share"}
  - kind: reference
    to: bili.community.coin
    label: {zh: "投币收益以账本为准", en: "Coin revenue from ledger"}
---
