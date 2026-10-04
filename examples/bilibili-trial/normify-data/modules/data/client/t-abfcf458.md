---
uid: a9395e59
id: data.client.t-abfcf458
parent: data.client
state: planned
tags: ["worker:adm-rights", "projection:data-contract"]
name: {zh: "CopyrightConsoleState", en: "CopyrightConsoleState"}
description:
  zh: >
      版权台状态
  en: >
      Copyright console state
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/client/t-abfcf458.json"
apis: []
types:
  - name: "CopyrightConsoleState"
    description: {zh: "版权台状态", en: "Copyright console state"}
    schema: {"type":"object","additionalProperties":false,"properties":{"complaints":{"type":"array","description":"投诉","items":{"$ref":"urn:normify:data.ops.t-dfd1a616:CopyrightComplaint"}},"checks":{"type":"array","description":"核验记录","items":{"$ref":"urn:normify:data.ops.t-153e0ff8:LicenseEvidenceCheck"}},"activeComplaintId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"counterNotices":{"type":"array","description":"反通知","items":{"$ref":"urn:normify:data.ops.t-0c67e3a0:CounterNotice"}}},"required":["complaints"]}
deps:
  - kind: reference
    to: data.ops.t-dfd1a616
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.ops.t-153e0ff8
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.ops.t-0c67e3a0
    label: {zh: "类型引用", en: "Type reference"}
---
