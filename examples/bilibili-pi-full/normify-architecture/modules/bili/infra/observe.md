---
uid: 75151b86
id: bili.infra.observe
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "监控告警与追踪", en: "Monitoring, alerting and tracing"}
description:
  zh: >
      指标、日志、链路追踪、告警规则与值班
  en: >
      Metrics, logs, tracing, alert rules and on-call
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "infra/observe/alerts.yaml"
  - path: "infra/observe/slo.md"
  - path: "infra/observe/tests/alerts.test.ts"
  - path: "infra/observe/tests/slo.test.ts"
apis:
  - protocol: file
    path: "infra/observe/alerts.yaml"
    description:
      zh: >
          告警规则入口
      en: >
          Alert rule entry
types:
  - name: "AlertRule"
    description: {zh: "告警规则", en: "Alert rule"}
    schema: {"type":"object","description":"告警规则 / Alert rule","additionalProperties":false,"properties":{"ruleId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 ruleId（语义见对应领域契约） / Field ruleId"},"metric":{"type":"string","minLength":1,"description":"字段 metric（语义见对应领域契约） / Field metric"},"threshold":{"type":"number","description":"字段 threshold（语义见对应领域契约） / Field threshold"},"windowSec":{"type":"integer","description":"字段 windowSec（语义见对应领域契约） / Field windowSec"},"severity":{"type":"string","enum":["P1","P2","P3","P4"],"description":"字段 severity（语义见对应领域契约） / Field severity"}},"required":["ruleId","metric","threshold","windowSec","severity"]}
deps:
  - kind: call
    to: bili.infra.capacity
    label: {zh: "容量指标联动扩容", en: "Capacity metrics drive scaling"}
---
