---
uid: 09a9140a
id: data.ops.t-34d8f5eb
parent: data.ops
state: planned
tags: ["worker:ops-report", "projection:data-contract"]
name: {zh: "PunishmentRecord", en: "PunishmentRecord"}
description:
  zh: >
      处罚记录
  en: >
      Punishment record
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/ops/t-34d8f5eb.json"
apis: []
types:
  - name: "PunishmentRecord"
    description: {zh: "处罚记录", en: "Punishment record"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 punishment_record；到期由任务自动解除，禁止人工改历史","properties":{"punishmentId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"scope":{"type":"string","enum":["account","video","danmaku","comment","live","revenue"],"description":"范围"},"targetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"type":{"type":"string","enum":["warning","delete_content","mute","ban_login","ban_live","deduct_revenue"],"description":"类型"},"durationHours":{"type":"integer","description":"时长小时（0 表示永久）","minimum":0},"reasonCode":{"type":"string","description":"原因码"},"reasonText":{"type":"string","description":"说明"},"sourceTicketId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"operatorId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"effectiveAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"expiresAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"revokedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"revokeReason":{"type":"string","description":"撤销原因"}},"required":["punishmentId","userId","scope","type","reasonCode","operatorId","effectiveAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
