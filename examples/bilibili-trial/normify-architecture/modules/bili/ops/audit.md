---
uid: 472c6520
id: bili.ops.audit
parent: bili.ops
state: planned
tags: ["worker:ops-audit"]
name: {zh: "操作审计与风控看板", en: "Audit Trail and Risk Dashboard"}
description:
  zh: >
      运营操作审计检索与合规导出、异常行为风控告警与处置、数据访问留痕；审计只增不改。
      
  en: >
      Audit search and compliance export, risk alerts and handling, data access trails; audit is append-only.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/audit/src/search.ts"
  - path: "services/ops/audit/src/risk.ts"
  - path: "services/ops/audit/tests/audit.test.ts"
apis:
  - protocol: http
    method: GET
    path: "/api/v1/ops/audit/logs"
    description:
      zh: >
          检索操作审计
          
      en: >
          Search audit logs
          
    input: {module: "bili.ops.audit", name: "OperationAuditQuery"}
    output: {module: "bili.infra.observability", name: "AuditLogRecord"}
  - protocol: http
    method: GET
    path: "/api/v1/ops/risk-alerts"
    description:
      zh: >
          风控告警列表
          
      en: >
          List risk alerts
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.ops.audit", name: "RiskAlert"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/risk-alerts/{id}/handle"
    description:
      zh: >
          处置风控告警
          
      en: >
          Handle risk alert
          
    input: {module: "bili.ops.audit", name: "RiskAlert"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/compliance-exports"
    description:
      zh: >
          发起合规导出
          
      en: >
          Request compliance export
          
    input: {module: "bili.ops.audit", name: "ComplianceExportRequest"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "risk_alert"
    description:
      zh: >
          风控告警表（唯一写入所有者：风控服务）
          
      en: >
          risk_alert table
          
types:
  - name: "OperationAuditQuery"
    description: {zh: "审计检索条件", en: "Audit query"}
    schema: {"type":"object","additionalProperties":false,"description":"审计检索本身也必须留痕","properties":{"operatorId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"actionCode":{"type":"string","description":"动作码"},"targetType":{"type":"string","description":"对象类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"dateFrom":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"dateTo":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"cursor":{"type":"string","description":"游标"},"pageSize":{"type":"integer","description":"每页条数","minimum":1,"maximum":200}},"required":["pageSize"]}
  - name: "RiskAlert"
    description: {zh: "风控告警", en: "Risk alert"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 risk_alert，由行为与规则引擎产生","properties":{"alertId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"kind":{"type":"string","enum":["abnormal_login","credential_stuffing","content_farm","coin_laundering","gift_fraud","payment_chargeback","copyright_repeat","danmaku_spam"],"description":"类型"},"severity":{"type":"string","enum":["low","medium","high","critical"],"description":"级别"},"subjectType":{"type":"string","enum":["user","anchor","video","order","room","ip"],"description":"主体"},"subjectId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"signals":{"type":"array","description":"命中信号","items":{"type":"string","description":"信号码"}},"state":{"type":"string","enum":["open","investigating","confirmed","dismissed"],"description":"状态机"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"handledBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"resolution":{"type":"string","description":"处置结论"}},"required":["alertId","kind","severity","subjectType","subjectId","state","createdAt"]}
  - name: "ComplianceExportRequest"
    description: {zh: "合规导出请求", en: "Compliance export request"}
    schema: {"type":"object","additionalProperties":false,"description":"导出文件写 OSS 并登记，禁止明文外发","properties":{"exportType":{"type":"string","enum":["audit_log","punishment","copyright_complaint","report_ticket","order"],"description":"导出类型"},"dateFrom":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"dateTo":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"format":{"type":"string","enum":["csv","json"],"description":"格式"},"requesterId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"reason":{"type":"string","description":"用途说明（必填）"},"idempotencyKey":{"$ref":"urn:normify:bili.contract.core.idempotency:IdempotencyKey"}},"required":["exportType","dateFrom","dateTo","format","requesterId","reason","idempotencyKey"]}
deps:
  - kind: call
    to: bili.infra.observability
    from_api: "GET /api/v1/ops/audit/logs"
    to_api: "POST /internal/audit/records"
    label: {zh: "审计与指标的唯一来源", en: "Audit and metrics source"}
  - kind: call
    to: bili.infra.jobs
    label: {zh: "导出与批量处置任务", en: "Export and batch jobs"}
  - kind: reference
    to: bili.data.projections
    label: {zh: "导出不得绕过写入所有者", en: "Exports respect ownership"}
  - kind: call
    to: bili.ops.report
    label: {zh: "高风险主体联动处罚", en: "Link risk to punishments"}
---
