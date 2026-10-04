---
uid: dab32860
id: bili.client.admin.audit
parent: bili.client.admin
state: planned
tags: ["worker:adm-audit"]
name: {zh: "审计与风控台", en: "Audit Console"}
description:
  zh: >
      审计日志检索与导出、风控告警处置、合规导出申请与下载。
      
  en: >
      Audit log search and export, risk alert handling, compliance export requests.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/admin/src/features/audit/index.ts"
  - path: "apps/admin/src/features/audit/pages/AuditConsolePage.tsx"
  - path: "apps/admin/src/features/audit/tests/audit.test.tsx"
apis: []
types:
  - name: "AuditConsoleState"
    description: {zh: "审计台状态", en: "Audit console state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"query":{"$ref":"urn:normify:bili.ops.audit:OperationAuditQuery"},"records":{"type":"array","description":"审计记录","items":{"$ref":"urn:normify:bili.infra.observability:AuditLogRecord"}},"alerts":{"type":"array","description":"告警","items":{"$ref":"urn:normify:bili.ops.audit:RiskAlert"}},"exportRequest":{"$ref":"urn:normify:bili.ops.audit:ComplianceExportRequest"}},"required":["records"]}
deps:
  - kind: call
    to: bili.ops.audit
    to_api: "GET /api/v1/ops/audit/logs"
    label: {zh: "审计检索与告警", en: "Audit search and alerts"}
---
