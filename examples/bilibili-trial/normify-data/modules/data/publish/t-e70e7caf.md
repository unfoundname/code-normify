---
uid: 9d06901d
id: data.publish.t-e70e7caf
parent: data.publish
state: planned
tags: ["worker:pub-collection", "projection:data-contract"]
name: {zh: "CollectionRecord", en: "CollectionRecord"}
description:
  zh: >
      合集
  en: >
      Collection
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T20:15:11.767Z"
fingerprint: pending
source:
  - path: "design/data/data/publish/t-e70e7caf.json"
apis: []
types:
  - name: "CollectionRecord"
    description: {zh: "合集", en: "Collection"}
    schema: {"type":"object","additionalProperties":false,"description":"权威表 collection","properties":{"collectionId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"ownerId":{"$ref":"urn:normify:data.contract.t-bdd25c72:EntityId"},"title":{"type":"string","description":"合集标题","maxLength":80},"description":{"type":"string","description":"简介","maxLength":1000},"type":{"type":"string","enum":["collection","season","series","course"],"description":"类型"},"visibility":{"$ref":"urn:normify:data.contract.t-44cc0b8c:Visibility"},"itemCount":{"type":"integer","description":"条目数","minimum":0},"createdAt":{"$ref":"urn:normify:data.contract.t-7a625dbd:IsoInstant"}},"required":["collectionId","ownerId","title","type","visibility"]}
deps:
  - kind: reference
    to: data.contract.t-bdd25c72
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-44cc0b8c
    label: {zh: "类型引用", en: "Type reference"}
  - kind: reference
    to: data.contract.t-7a625dbd
    label: {zh: "类型引用", en: "Type reference"}
---
