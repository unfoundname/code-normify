---
uid: 871716bd
id: data.discovery.t-9ac99e2a
parent: data.discovery
state: planned
tags: ["worker:disc-home", "projection:data-contract"]
name: {zh: "PartitionRecord", en: "PartitionRecord"}
description:
  zh: >
      分区
  en: >
      Partition
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/discovery/t-9ac99e2a.json"
apis: []
types:
  - name: "PartitionRecord"
    description: {zh: "分区", en: "Partition"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 partition，唯一约束 parent_id+name；合并后旧 id 保留映射","properties":{"partitionId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"name":{"type":"string","description":"分区名","maxLength":30},"parentId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"orderIndex":{"type":"integer","description":"排序序号","minimum":0},"iconAssetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"state":{"type":"string","enum":["active","hidden","merged"],"description":"状态"},"mergedIntoId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"}},"required":["partitionId","name","orderIndex","state"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
---
