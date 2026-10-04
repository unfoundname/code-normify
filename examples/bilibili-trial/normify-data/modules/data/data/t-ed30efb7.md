---
uid: 2e4b24b7
id: data.data.t-ed30efb7
parent: data.data
state: planned
tags: ["worker:data-steward", "projection:data-contract"]
name: {zh: "ProjectionContract", en: "ProjectionContract"}
description:
  zh: >
      投影规格
  en: >
      Projection contract
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/data/t-ed30efb7.json"
apis: []
types:
  - name: "ProjectionContract"
    description: {zh: "投影规格", en: "Projection contract"}
    schema: {"type":"object","additionalProperties":false,"description":"禁止把投影当作权威数据回写","properties":{"name":{"type":"string","description":"投影名"},"authoritativeModule":{"type":"string","description":"权威数据模块 id"},"consumerModule":{"type":"string","description":"投影消费者模块 id"},"triggerEvents":{"type":"array","description":"触发事件类型","items":{"type":"string","description":"事件类型"}},"storage":{"type":"string","enum":["rds_table","redis","search_index","in_memory"],"description":"存储"},"rebuildable":{"type":"boolean","description":"是否可全量重建"},"stalenessToleranceSeconds":{"type":"integer","description":"可容忍延迟秒","minimum":0}},"required":["name","authoritativeModule","consumerModule","triggerEvents","storage","rebuildable"]}
---
