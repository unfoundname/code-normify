---
uid: "9e813082"
id: data.infra.t-ab31bed5
parent: data.infra
state: planned
tags: ["worker:infra-deploy", "projection:data-contract"]
name: {zh: "CapacityPlan", en: "CapacityPlan"}
description:
  zh: >
      容量规划
  en: >
      Capacity plan
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/infra/t-ab31bed5.json"
apis: []
types:
  - name: "CapacityPlan"
    description: {zh: "容量规划", en: "Capacity plan"}
    schema: {"type":"object","additionalProperties":false,"description":"未采集真实数据前不得声称容量充足","properties":{"resource":{"type":"string","enum":["rds_storage","rds_iops","oss_storage","egress_bandwidth","transcode_cpu","db_connections"],"description":"资源"},"currentAssumption":{"type":"string","description":"当前假设（待测量）"},"growthPerMonthPercent":{"type":"integer","description":"月增长假设 %","minimum":0},"thresholdPercent":{"type":"integer","description":"告警阈值 %","minimum":1,"maximum":100},"measuredAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["resource","currentAssumption","thresholdPercent"]}
deps:
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
