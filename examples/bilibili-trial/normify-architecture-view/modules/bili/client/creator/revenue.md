---
uid: 95d44250
id: bili.client.creator.revenue
parent: bili.client.creator
state: planned
tags: ["worker:stu-revenue"]
name: {zh: "收益提现页", en: "Revenue UI"}
description:
  zh: >
      收益汇总与构成、明细表、可提现金额与提现资格校验、结算单下载入口。
      
  en: >
      Revenue summary and composition, detail table, withdrawable amount, eligibility check and statements.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/studio/src/features/revenue/index.ts"
  - path: "apps/studio/src/features/revenue/pages/RevenuePage.tsx"
  - path: "apps/studio/src/features/revenue/tests/revenue.test.tsx"
apis: []
types:
  - name: "RevenuePageState"
    description: {zh: "收益页状态", en: "Revenue page state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"summary":{"$ref":"urn:normify:bili.creator.revenue:CreatorRevenueSummary"},"details":{"type":"array","description":"明细","items":{"$ref":"urn:normify:bili.creator.revenue:RevenueDetailItem"}},"eligibility":{"$ref":"urn:normify:bili.creator.revenue:WithdrawalEligibility"},"withdrawAmountDraft":{"$ref":"urn:normify:bili.contract.core.ids:MoneyAmount"},"error":{"$ref":"urn:normify:bili.contract.core.errors:ApiError"}},"required":["summary"]}
deps:
  - kind: call
    to: bili.creator.revenue
    to_api: "GET /api/v1/creator/revenue/summary"
    label: {zh: "收益与提现资格", en: "Revenue and eligibility"}
---
