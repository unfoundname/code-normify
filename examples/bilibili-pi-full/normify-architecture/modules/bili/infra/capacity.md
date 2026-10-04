---
uid: "53449954"
id: bili.infra.capacity
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "容量与成本", en: "Capacity and cost"}
description:
  zh: >
      容量模型、压测口径、扩容阈值与成本归属
  en: >
      Capacity model, load-test criteria, scaling thresholds and cost attribution
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "infra/capacity/model.md"
  - path: "infra/capacity/loadtest.md"
  - path: "infra/capacity/tests/model.test.ts"
  - path: "infra/capacity/tests/loadtest.test.ts"
apis:
  - protocol: file
    path: "infra/capacity/model.md"
    description:
      zh: >
          容量模型入口
      en: >
          Capacity model entry
types:
  - name: "CapacityModel"
    description: {zh: "容量模型", en: "Capacity model"}
    schema: {"type":"object","description":"容量模型 / Capacity model","additionalProperties":false,"properties":{"modelId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 modelId（语义见对应领域契约） / Field modelId"},"service":{"type":"string","minLength":1,"description":"字段 service（语义见对应领域契约） / Field service"},"rpsPeak":{"type":"integer","description":"字段 rpsPeak（语义见对应领域契约） / Field rpsPeak"},"storageGb":{"type":"integer","description":"字段 storageGb（语义见对应领域契约） / Field storageGb"},"assumedInstanceSpec":{"type":"string","minLength":1,"description":"字段 assumedInstanceSpec（语义见对应领域契约） / Field assumedInstanceSpec"}},"required":["modelId","service","rpsPeak","storageGb","assumedInstanceSpec"]}
---
