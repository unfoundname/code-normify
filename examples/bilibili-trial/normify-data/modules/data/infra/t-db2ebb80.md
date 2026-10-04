---
uid: dd03c03c
id: data.infra.t-db2ebb80
parent: data.infra
state: planned
tags: ["worker:infra-obs", "projection:data-contract"]
name: {zh: "MetricSeries", en: "MetricSeries"}
description:
  zh: >
      指标序列
  en: >
      Metric series
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/infra/t-db2ebb80.json"
apis: []
types:
  - name: "MetricSeries"
    description: {zh: "指标序列", en: "Metric series"}
    schema: {"type":"object","additionalProperties":false,"properties":{"name":{"type":"string","description":"指标名"},"labels":{"type":"string","description":"标签 JSON"},"unit":{"type":"string","enum":["count","ms","bytes","percent"],"description":"单位"},"windowSeconds":{"type":"integer","description":"聚合窗口","minimum":1}},"required":["name","unit"]}
---
