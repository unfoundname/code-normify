---
uid: bfb22712
id: bili.contract.core.ids
parent: bili.contract.core
state: planned
tags: ["worker:contract-core"]
name: {zh: "标识与标量", en: "Identifiers and Scalars"}
description:
  zh: >
      统一字符串 ID、UTC ISO 时间、最小货币单位金额、可见性与跨模块实体引用。
      
  en: >
      String ids, UTC ISO instants, minor-unit money, visibility and cross-module entity references.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "packages/contracts/src/core/ids.ts"
  - path: "packages/contracts/tests/ids.test.ts"
apis: []
types:
  - name: "EntityId"
    description: {zh: "全局实体 ID（字符串，禁止自增整数）", en: "Global entity id as string"}
    schema: {"type":"string","description":"全局唯一实体 ID","minLength":8,"maxLength":64,"pattern":"^[0-9a-z]{8,64}$"}
  - name: "IsoInstant"
    description: {zh: "UTC ISO-8601 时间戳", en: "UTC ISO-8601 instant"}
    schema: {"type":"string","description":"统一 UTC 时间戳","format":"date-time"}
  - name: "MoneyAmount"
    description: {zh: "金额：货币枚举 + 最小货币单位整数", en: "Money in minor units"}
    schema: {"type":"object","additionalProperties":false,"description":"所有金额字段统一使用本类型","properties":{"currency":{"type":"string","enum":["CNY","BCOIN","BATTERY","POINT"],"description":"币种：法币/虚拟币/电池/积分"},"minorUnits":{"type":"integer","description":"最小货币单位整数（禁止浮点）"}},"required":["currency","minorUnits"]}
  - name: "Visibility"
    description: {zh: "内容可见性", en: "Content visibility"}
    schema: {"type":"string","enum":["public","unlisted","followers","private"],"description":"public 公开 / unlisted 不公开列出 / followers 仅关注者 / private 私有"}
  - name: "EntityRef"
    description: {zh: "跨模块实体引用", en: "Cross-module entity reference"}
    schema: {"type":"object","additionalProperties":false,"description":"跨域只传引用，不传对方实体全量","properties":{"type":{"type":"string","enum":["user","video","danmaku","comment","dynamic","live_room","article","season","course","order"],"description":"实体类型"},"id":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"required":["type","id"]}
deps:
  - kind: reference
    to: bili.contract.core.events
    label: {zh: "事件复用统一 ID/时间", en: "Events reuse id/instant types"}
---
