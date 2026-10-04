---
uid: a908831a
id: bili.ops.rights
parent: bili.ops
state: planned
tags: ["worker:ops-rights"]
name: {zh: "版权投诉与许可核验", en: "Copyright Complaints and License Checks"}
description:
  zh: >
      版权/商标/名誉投诉受理、证据与反通知流程、许可证据核验（地域/期限一致性）、下架与恢复。
      
  en: >
      Copyright/trademark complaints, evidence and counter-notice flow, license evidence verification, takedown and restore.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "services/ops/rights/src/complaint.ts"
  - path: "services/ops/rights/src/license-check.ts"
  - path: "services/ops/rights/migrations/0001_rights.sql"
  - path: "services/ops/rights/tests/rights.test.ts"
apis:
  - protocol: http
    method: POST
    path: "/api/v1/copyright/complaints"
    description:
      zh: >
          提交版权投诉
          
      en: >
          Submit complaint
          
    input: {module: "bili.ops.rights", name: "CopyrightComplaint"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: GET
    path: "/api/v1/ops/copyright/complaints"
    description:
      zh: >
          版权投诉列表
          
      en: >
          List complaints
          
    input: {module: "bili.contract.core.paging", name: "PageRequest"}
    output: {module: "bili.ops.rights", name: "CopyrightComplaint"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/copyright/complaints/{id}/decide"
    description:
      zh: >
          投诉决定与下架/恢复
          
      en: >
          Decide complaint
          
    input: {module: "bili.ops.rights", name: "CopyrightComplaint"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/copyright/counter-notices"
    description:
      zh: >
          提交反通知
          
      en: >
          Submit counter notice
          
    input: {module: "bili.ops.rights", name: "CounterNotice"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: http
    method: POST
    path: "/api/v1/ops/licenses/{id}/evidence-check"
    description:
      zh: >
          许可证据核验
          
      en: >
          Verify license evidence
          
    input: {module: "bili.ops.rights", name: "LicenseEvidenceCheck"}
    output: {module: "bili.contract.core.idempotency", name: "MutationResult"}
  - protocol: mysql
    path: "copyright_complaint"
    description:
      zh: >
          版权投诉表（唯一写入所有者：版权服务）
          
      en: >
          copyright_complaint table
          
types:
  - name: "CopyrightComplaint"
    description: {zh: "版权投诉", en: "Copyright complaint"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 copyright_complaint；证据原件存 OSS","properties":{"complaintId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"complainantType":{"type":"string","enum":["individual","company","agency","platform"],"description":"投诉人类型"},"complainantName":{"type":"string","description":"投诉人/机构名"},"claimType":{"type":"string","enum":["copyright","trademark","portrait","defamation","privacy"],"description":"主张类型"},"targetType":{"type":"string","enum":["video","season","episode","course","article","audio","live_replay"],"description":"对象类型"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"description":{"type":"string","description":"投诉说明","maxLength":2000},"evidenceAssetIds":{"type":"array","description":"证据附件","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"minItems":1},"licenseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"state":{"type":"string","enum":["submitted","evidence_pending","reviewing","accepted","rejected","counter_notice","closed"],"description":"状态机"},"slaDeadlineAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"decidedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"decidedBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"decisionReason":{"type":"string","description":"处理说明"}},"required":["complaintId","complainantType","claimType","targetType","targetId","state","createdAt"]}
  - name: "CounterNotice"
    description: {zh: "反通知", en: "Counter notice"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 counter_notice，唯一约束 complaint_id","properties":{"counterNoticeId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"complaintId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"respondentId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"content":{"type":"string","description":"反通知说明","maxLength":2000},"evidenceAssetIds":{"type":"array","description":"证据附件","items":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"}},"state":{"type":"string","enum":["submitted","reviewing","accepted","rejected"],"description":"状态"},"createdAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"},"decidedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["counterNoticeId","complaintId","respondentId","content","state"]}
  - name: "LicenseEvidenceCheck"
    description: {zh: "许可核验记录", en: "License evidence check"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 license_evidence_check；供内容获取与运营双向核验","properties":{"checkId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"licenseId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"targetId":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"evidenceCompleteness":{"type":"string","enum":["complete","partial","missing"],"description":"证据完整性"},"regionConsistency":{"type":"boolean","description":"地域条款与实际投放是否一致"},"windowConsistency":{"type":"boolean","description":"期限与上线时间是否一致"},"sublicenseAllowed":{"type":"boolean","description":"是否允许转授权"},"notes":{"type":"string","description":"核验说明"},"verifiedBy":{"$ref":"urn:normify:bili.contract.core.ids:EntityId"},"checkedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["checkId","licenseId","evidenceCompleteness","verifiedBy","checkedAt"]}
deps:
  - kind: call
    to: bili.publish.catalog
    from_api: "POST /api/v1/ops/copyright/complaints/{id}/decide"
    to_api: "POST /api/v1/catalog/videos/{videoId}/commands"
    label: {zh: "受理后下架、驳回后恢复", en: "Takedown or restore via catalo"}
  - kind: call
    to: bili.premium.entitlement
    from_api: "POST /api/v1/ops/licenses/{id}/evidence-check"
    to_api: "GET /api/v1/seasons/{id}/license"
    label: {zh: "读取许可窗口与地域条款", en: "Read license window"}
  - kind: call
    to: bili.social.message
    label: {zh: "处理结果通知双方", en: "Notify both parties"}
  - kind: call
    to: bili.infra.observability
    label: {zh: "版权处理审计", en: "Audit copyright actions"}
---
