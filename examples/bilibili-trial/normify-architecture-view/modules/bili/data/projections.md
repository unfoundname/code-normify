---
uid: 59f827cf
id: bili.data.projections
parent: bili.data
state: planned
tags: ["worker:data-steward"]
name: {zh: "投影契约", en: "Projection Contracts"}
description:
  zh: >
      搜索/动态流/榜单/计数等事件投影的规格与检查点：投影不是权威数据，可重建。
      
  en: >
      Specs and checkpoints for search, feed, ranking and counter projections; rebuildable, never authoritative.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "db/projections/README.md"
  - path: "db/projections/checkpoint.sql"
apis: []
types:
  - name: "ProjectionContract"
    description: {zh: "投影规格", en: "Projection contract"}
    schema: {"type":"object","additionalProperties":false,"description":"禁止把投影当作权威数据回写","properties":{"name":{"type":"string","description":"投影名"},"authoritativeModule":{"type":"string","description":"权威数据模块 id"},"consumerModule":{"type":"string","description":"投影消费者模块 id"},"triggerEvents":{"type":"array","description":"触发事件类型","items":{"type":"string","description":"事件类型"}},"storage":{"type":"string","enum":["rds_table","redis","search_index","in_memory"],"description":"存储"},"rebuildable":{"type":"boolean","description":"是否可全量重建"},"stalenessToleranceSeconds":{"type":"integer","description":"可容忍延迟秒","minimum":0}},"required":["name","authoritativeModule","consumerModule","triggerEvents","storage","rebuildable"]}
  - name: "ProjectionCheckpoint"
    description: {zh: "投影检查点", en: "Projection checkpoint"}
    schema: {"type":"object","additionalProperties":false,"properties":{"projection":{"type":"string","description":"投影名"},"lastEventId":{"type":"string","description":"最后处理事件 id"},"lastAggregateVersion":{"type":"integer","description":"最后聚合版本","minimum":0},"lagSeconds":{"type":"integer","description":"滞后秒数","minimum":0},"updatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["projection","lagSeconds","updatedAt"]}
---
