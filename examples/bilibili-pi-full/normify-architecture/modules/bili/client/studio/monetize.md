---
uid: a2fb342a
id: bili.client.studio.monetize
parent: bili.client.studio
state: planned
tags: [planned, "worker:W-CREATOR", leaf]
name: {zh: "收益与结算台", en: "Monetization console"}
description:
  zh: >
      收益明细、结算单、提现与税务信息
  en: >
      Revenue details, statements, withdrawal and tax information
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/studio/src/features/monetize/MonetizeConsole.tsx"
  - path: "apps/studio/tests/features/monetize/MonetizeConsole.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/studio/monetize"
    description:
      zh: >
          收益结算路由
      en: >
          Monetization route
    output: {module: "bili.client.studio.monetize", name: "MonetizeViewModel"}
types:
  - name: "MonetizeViewModel"
    description: {zh: "收益视图模型", en: "Monetization view model"}
    schema: {"type":"object","description":"收益视图模型 / Monetization view model","additionalProperties":false,"properties":{"statements":{"type":"array","items":{"$ref":"urn:normify:bili.creator.income:IncomeStatement"},"description":"字段 statements（语义见对应领域契约） / Field statements"},"withdrawable":{"$ref":"urn:normify:bili.contract.common:Money","description":"字段 withdrawable（语义见对应领域契约） / Field withdrawable"}},"required":["statements","withdrawable"]}
deps:
  - kind: call
    to: bili.creator.income
    label: {zh: "收益与提现", en: "Revenue and withdrawal"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
