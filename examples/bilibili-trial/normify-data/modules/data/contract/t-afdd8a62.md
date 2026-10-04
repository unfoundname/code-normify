---
uid: d67d08e4
id: data.contract.t-afdd8a62
parent: data.contract
state: planned
tags: ["worker:contract-adapters", "projection:data-contract"]
name: {zh: "BusPublishRequest", en: "BusPublishRequest"}
description:
  zh: >
      事件发布请求
  en: >
      Bus publish request
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/contract/t-afdd8a62.json"
apis: []
types:
  - name: "BusPublishRequest"
    description: {zh: "事件发布请求", en: "Bus publish request"}
    schema: {"type":"object","additionalProperties":false,"properties":{"topic":{"type":"string","description":"逻辑主题，如 publish.video.published"},"partitionKey":{"type":"string","description":"分区键（迁移到 MQ 后生效）"},"envelope":{"$ref":"urn:normify:data.contract.t-b7bd0428:EventEnvelope"},"durable":{"type":"boolean","description":"是否要求持久化"}},"required":["topic","envelope","durable"]}
deps:
  - kind: reference
    to: data.contract.t-b7bd0428
    label: {zh: "类型引用", en: "Type reference"}
---
