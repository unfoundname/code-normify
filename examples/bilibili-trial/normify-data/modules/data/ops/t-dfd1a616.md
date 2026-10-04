---
uid: 4598a49e
id: data.ops.t-dfd1a616
parent: data.ops
state: planned
tags: ["worker:ops-rights", "projection:data-contract"]
name: {zh: "CopyrightComplaint", en: "CopyrightComplaint"}
description:
  zh: >
      版权投诉
  en: >
      Copyright complaint
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/ops/t-dfd1a616.json"
apis: []
types:
  - name: "CopyrightComplaint"
    description: {zh: "版权投诉", en: "Copyright complaint"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 copyright_complaint；证据原件存 OSS","properties":{"complaintId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"complainantType":{"type":"string","enum":["individual","company","agency","platform"],"description":"投诉人类型"},"complainantName":{"type":"string","description":"投诉人/机构名"},"claimType":{"type":"string","enum":["copyright","trademark","portrait","defamation","privacy"],"description":"主张类型"},"targetType":{"type":"string","enum":["video","season","episode","course","article","audio","live_replay"],"description":"对象类型"},"targetId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"description":{"type":"string","description":"投诉说明","maxLength":2000},"evidenceAssetIds":{"type":"array","description":"证据附件","items":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"minItems":1},"licenseId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"state":{"type":"string","enum":["submitted","evidence_pending","reviewing","accepted","rejected","counter_notice","closed"],"description":"状态机"},"slaDeadlineAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"decidedAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"},"decidedBy":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"decisionReason":{"type":"string","description":"处理说明"}},"required":["complaintId","complainantType","claimType","targetType","targetId","state","createdAt"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
