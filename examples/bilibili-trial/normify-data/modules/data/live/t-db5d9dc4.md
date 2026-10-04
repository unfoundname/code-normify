---
uid: 5fa485b0
id: data.live.t-db5d9dc4
parent: data.live
state: planned
tags: ["worker:live-dm", "projection:data-contract"]
name: {zh: "LiveDanmakuMessage", en: "LiveDanmakuMessage"}
description:
  zh: >
      直播消息
  en: >
      Live message
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/live/t-db5d9dc4.json"
apis: []
types:
  - name: "LiveDanmakuMessage"
    description: {zh: "直播消息", en: "Live message"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 live_danmaku_message；实时通道只做扇出，历史回放按时间窗查询","properties":{"messageId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"roomId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"userId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"type":{"type":"string","enum":["chat","enter_notice","gift_notice","guard_notice","system","super_chat"],"description":"类型"},"content":{"type":"string","description":"内容","maxLength":200},"colorHex":{"type":"string","description":"颜色"},"sentAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"blocked":{"type":"boolean","description":"是否被拦截"},"blockReason":{"type":"string","description":"拦截原因"}},"required":["messageId","roomId","type","sentAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
