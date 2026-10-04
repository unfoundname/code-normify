---
uid: 764b8668
id: bili.client.web.settings
parent: bili.client.web
state: planned
tags: [planned, "worker:W-IDENTITY", leaf]
name: {zh: "设置页", en: "Settings page"}
description:
  zh: >
      账号安全、实名、隐私与黑名单、消息偏好与注销
  en: >
      Account security, real-name, privacy and blocklist, message preferences and deletion
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/web/src/features/settings/SettingsPage.tsx"
  - path: "apps/web/tests/features/settings/SettingsPage.test.tsx"
apis:
  - protocol: http
    method: GET
    path: "/settings"
    description:
      zh: >
          设置页路由
      en: >
          Settings route
    output: {module: "bili.client.web.settings", name: "SettingsPageModel"}
types:
  - name: "SettingsPageModel"
    description: {zh: "设置页视图模型", en: "Settings page model"}
    schema: {"type":"object","description":"设置页视图模型 / Settings page model","additionalProperties":false,"properties":{"account":{"$ref":"urn:normify:bili.identity.account:AccountView","description":"字段 account（语义见对应领域契约） / Field account"},"privacy":{"$ref":"urn:normify:bili.identity.privacy:PrivacySetting","description":"字段 privacy（语义见对应领域契约） / Field privacy"},"verification":{"$ref":"urn:normify:bili.identity.verify:RealNameProfile","description":"字段 verification（语义见对应领域契约） / Field verification"}},"required":["account","privacy"]}
deps:
  - kind: call
    to: bili.identity.account
    label: {zh: "账号与安全设置", en: "Account and security settings"}
  - kind: call
    to: bili.identity.privacy
    label: {zh: "隐私与黑名单", en: "Privacy and blocklist"}
  - kind: call
    to: bili.identity.deletion
    label: {zh: "注销与数据导出", en: "Deletion and data export"}
  - kind: call
    to: bili.client.shared.http
    label: {zh: "统一请求层与错误形态", en: "Unified request layer and"}
  - kind: reference
    to: bili.client.shared.design
    label: {zh: "设计系统与组件", en: "Design system and components"}
---
