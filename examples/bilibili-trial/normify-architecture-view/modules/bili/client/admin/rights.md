---
uid: c1f5c85a
id: bili.client.admin.rights
parent: bili.client.admin
state: planned
tags: ["worker:adm-rights"]
name: {zh: "版权投诉工作台", en: "Copyright Console"}
description:
  zh: >
      投诉列表与证据浏览、许可核验、下架/恢复决定与反通知处理。
      
  en: >
      Complaint list with evidence, license verification, takedown/restore decisions and counter notices.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "apps/admin/src/features/rights/index.ts"
  - path: "apps/admin/src/features/rights/pages/CopyrightPage.tsx"
  - path: "apps/admin/src/features/rights/tests/rights.test.tsx"
apis: []
types:
  - name: "CopyrightConsoleState"
    description: {zh: "版权台状态", en: "Copyright console state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"complaints":{"type":"array","description":"投诉","items":{"$ref":"urn:normify:bili.ops.rights:CopyrightComplaint"}},"checks":{"type":"array","description":"核验记录","items":{"$ref":"urn:normify:bili.ops.rights:LicenseEvidenceCheck"}},"activeComplaintId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"counterNotices":{"type":"array","description":"反通知","items":{"$ref":"urn:normify:bili.ops.rights:CounterNotice"}}},"required":["complaints"]}
deps:
  - kind: call
    to: bili.ops.rights
    to_api: "GET /api/v1/ops/copyright/complaints"
    label: {zh: "投诉与许可核验", en: "Complaints and license checks"}
---
