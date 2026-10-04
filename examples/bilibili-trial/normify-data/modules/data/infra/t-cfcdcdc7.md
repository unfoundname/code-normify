---
uid: 060d5bea
id: data.infra.t-cfcdcdc7
parent: data.infra
state: planned
tags: ["worker:infra-jobs", "projection:data-contract"]
name: {zh: "DispatcherRun", en: "DispatcherRun"}
description:
  zh: >
      派发轮次
  en: >
      Dispatcher run
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/infra/t-cfcdcdc7.json"
apis: []
types:
  - name: "DispatcherRun"
    description: {zh: "派发轮次", en: "Dispatcher run"}
    schema: {"type":"object","additionalProperties":false,"properties":{"runId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"startedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"finishedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"published":{"type":"integer","description":"已发布事件数","minimum":0},"failed":{"type":"integer","description":"失败数","minimum":0},"leased":{"type":"integer","description":"本轮领取任务数","minimum":0},"topics":{"type":"array","description":"涉及主题","items":{"type":"string","description":"主题"}}},"required":["runId","startedAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
