---
uid: 3e3f1dc8
id: bili.infra.observability
parent: bili.infra
state: planned
tags: ["worker:infra-obs"]
name: {zh: "可观测性与审计", en: "Observability and Audit"}
description:
  zh: >
      指标、日志、链路、告警规则与操作审计留痕；审计日志只追加不可改。
      
  en: >
      Metrics, logs, traces, alert rules and append-only audit trails.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/observability/src/metrics.ts"
  - path: "services/observability/src/audit-log.ts"
  - path: "services/observability/tests/audit-log.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/internal/audit/records"
    description:
      zh: >
          写入审计记录
          
      en: >
          Append audit record
          
    input: {module: "bili.infra.observability", name: "AuditLogRecord"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/internal/metrics/{name}"
    description:
      zh: >
          读取指标序列
          
      en: >
          Read metric series
          
    output: {module: "bili.infra.observability", name: "MetricSeries"}
types:
  - name: "AlertRule"
    description: {zh: "告警规则", en: "Alert rule"}
    schema: {"type":"object","additionalProperties":false,"properties":{"ruleId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"name":{"type":"string","description":"规则名"},"metric":{"type":"string","description":"指标名"},"condition":{"type":"string","description":"触发条件表达式"},"windowSeconds":{"type":"integer","description":"窗口秒数","minimum":1},"severity":{"type":"string","enum":["info","warning","critical"],"description":"级别"},"route":{"type":"array","description":"通知目标","items":{"type":"string","description":"通知目标"}}},"required":["ruleId","name","metric","condition","severity"]}
  - name: "AuditLogRecord"
    description: {zh: "审计日志（只追加）", en: "Audit log record"}
    schema: {"type":"object","additionalProperties":false,"description":"运营处罚、下架、改价等必须留痕","properties":{"auditId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"actorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"actorChannel":{"type":"string","enum":["web","admin","studio","system"],"description":"操作通道"},"action":{"type":"string","description":"动作码"},"targetType":{"type":"string","description":"对象类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"beforeJson":{"type":"string","description":"变更前快照"},"afterJson":{"type":"string","description":"变更后快照"},"reason":{"type":"string","description":"原因/工单号"},"occurredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"traceId":{"type":"string","description":"链路 ID"}},"required":["auditId","actorId","action","targetType","occurredAt"]}
  - name: "MetricSeries"
    description: {zh: "指标序列", en: "Metric series"}
    schema: {"type":"object","additionalProperties":false,"properties":{"name":{"type":"string","description":"指标名"},"labels":{"type":"string","description":"标签 JSON"},"unit":{"type":"string","enum":["count","ms","bytes","percent"],"description":"单位"},"windowSeconds":{"type":"integer","description":"聚合窗口","minimum":1}},"required":["name","unit"]}
---
