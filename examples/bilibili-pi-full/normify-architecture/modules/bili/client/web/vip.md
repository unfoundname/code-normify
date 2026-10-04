---
uid: 23143b7a
id: bili.client.web.vip
parent: bili.client.web
state: planned
tags: [planned, "worker:W-COMMERCE", leaf]
name: {zh: "会员与钱包", en: "Membership and wallet"}
description:
  zh: >
      大会员购买、充值、订单与权益说明
  en: >
      Membership purchase, top-up, orders and entitlement details
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/vip/VipCenter.tsx"
  - path: "apps/web/tests/features/vip/VipCenter.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/vip"
    description:
      zh: >
          会员中心路由
      en: >
          Membership route
    output: {module: "bili.client.web.vip", name: "VipCenterModel"}
types:
  - name: "VipCenterModel"
    description: {zh: "会员中心视图模型", en: "Membership center model"}
    schema: {"type":"object","description":"会员中心视图模型 / Membership center model","additionalProperties":false,"properties":{"membership":{"$ref":"urn:normify:bili.commerce.vip:VipMembership","description":"字段 membership（语义见对应领域契约） / Field membership"},"wallet":{"$ref":"urn:normify:bili.commerce.wallet:WalletView","description":"字段 wallet（语义见对应领域契约） / Field wallet"},"orders":{"$ref":"urn:normify:bili.contract.common:PageResult","description":"字段 orders（语义见对应领域契约） / Field orders"}},"required":["membership","wallet","orders"]}
deps:
  - kind: call
    to: bili.commerce.vip
    label: {zh: "会员状态", en: "Membership state"}
  - kind: call
    to: bili.commerce.wallet
    label: {zh: "钱包与充值", en: "Wallet and top-up"}
  - kind: call
    to: bili.commerce.order
    label: {zh: "订单列表", en: "Order list"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
