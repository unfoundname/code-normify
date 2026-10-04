---
uid: 6260fcb4
id: data.publish.t-f048acff
parent: data.publish
state: planned
tags: ["worker:pub-catalog", "projection:data-contract"]
name: {zh: "PublishCommand", en: "PublishCommand"}
description:
  zh: >
      发布命令
  en: >
      Publish command
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/publish/t-f048acff.json"
apis: []
types:
  - name: "PublishCommand"
    description: {zh: "发布命令", en: "Publish command"}
    schema: {"type":"object","additionalProperties":false,"description":"只有本模块可改发布状态，其他模块必须调用此命令","properties":{"videoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"operatorId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"action":{"type":"string","enum":["publish","update_metadata","take_down","restore","schedule","block_copyright"],"description":"动作"},"expectedVersion":{"type":"integer","description":"期望版本（乐观锁）","minimum":1},"reason":{"type":"string","description":"原因（下架/拦截必填）"},"publishAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"idempotencyKey":{"$ref":"urn:normify:data.contract.t-8cc5302d:IdempotencyKey"}},"required":["videoId","operatorId","action","expectedVersion","idempotencyKey"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-8cc5302d
    label: {zh: "类型引用", en: "Type reference"}
---
