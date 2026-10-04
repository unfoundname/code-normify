---
uid: 1ac0fa63
id: bili.client.web.member
parent: bili.client.web
state: planned
tags: [planned, "worker:W-PLAYBACK", leaf]
name: {zh: "个人中心", en: "Member center"}
description:
  zh: >
      观看历史、稍后再看、收藏夹、关注与充电管理
  en: >
      Watch history, watch later, favorites, following and charging management
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/member/MemberCenter.tsx"
  - path: "apps/web/tests/features/member/MemberCenter.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/account"
    description:
      zh: >
          个人中心路由
      en: >
          Member center route
    output: {module: "bili.client.web.member", name: "MemberCenterModel"}
types:
  - name: "MemberCenterModel"
    description: {zh: "个人中心视图模型", en: "Member center model"}
    schema: {"type":"object","description":"个人中心视图模型 / Member center model","additionalProperties":false,"properties":{"history":{"$ref":"urn:normify:bili.contract.common:PageResult","description":"字段 history（语义见对应领域契约） / Field history"},"watchLater":{"$ref":"urn:normify:bili.contract.common:PageResult","description":"字段 watchLater（语义见对应领域契约） / Field watchLater"},"favorites":{"$ref":"urn:normify:bili.contract.common:PageResult","description":"字段 favorites（语义见对应领域契约） / Field favorites"}},"required":["history","watchLater","favorites"]}
deps:
  - kind: call
    to: bili.playback.history
    label: {zh: "观看历史", en: "Watch history"}
  - kind: call
    to: bili.playback.watchlater
    label: {zh: "稍后再看", en: "Watch later"}
  - kind: call
    to: bili.community.favorite
    label: {zh: "收藏夹", en: "Favorites"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
