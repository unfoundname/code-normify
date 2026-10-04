---
uid: 6d5d5251
id: data.publish.t-a31c2ef7
parent: data.publish
state: planned
tags: ["worker:pub-collection", "projection:data-contract"]
name: {zh: "ScheduledPublish", en: "ScheduledPublish"}
description:
  zh: >
      预约发布
  en: >
      Scheduled publish
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/publish/t-a31c2ef7.json"
apis: []
types:
  - name: "ScheduledPublish"
    description: {zh: "预约发布", en: "Scheduled publish"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 scheduled_publish；到期由 outbox 派发器触发目录发布命令","properties":{"scheduleId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"publishAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"timezone":{"type":"string","description":"时区，如 Asia/Shanghai"},"state":{"type":"string","enum":["scheduled","dispatched","cancelled","failed","conflict"],"description":"状态"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"lastError":{"type":"string","description":"最后错误"}},"required":["scheduleId","videoId","publishAt","state"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
