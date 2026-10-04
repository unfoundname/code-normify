---
uid: 34c53ea3
id: bili.infra.deploy
parent: bili.infra
state: planned
tags: [planned, "worker:W-INFRA", leaf]
name: {zh: "部署与配置", en: "Deployment and configuration"}
description:
  zh: >
      容器镜像、编排、环境配置、灰度与回滚
  en: >
      Container images, orchestration, environment configuration, canary and rollback
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source:
  - path: "infra/deploy/k8s/api.yaml"
  - path: "infra/deploy/k8s/worker.yaml"
  - path: "infra/deploy/k8s/tests/api.test.ts"
  - path: "infra/deploy/k8s/tests/worker.test.ts"
apis:
  - protocol: file
    path: "infra/deploy/k8s/api.yaml"
    description:
      zh: >
          部署清单入口
      en: >
          Deployment manifest entry
types:
  - name: "DeployPlan"
    description: {zh: "部署计划", en: "Deploy plan"}
    schema: {"type":"object","description":"部署计划 / Deploy plan","additionalProperties":false,"properties":{"planId":{"$ref":"urn:normify:bili.contract.common:Id","description":"字段 planId（语义见对应领域契约） / Field planId"},"image":{"type":"string","minLength":1,"description":"字段 image（语义见对应领域契约） / Field image"},"replicas":{"type":"integer","description":"字段 replicas（语义见对应领域契约） / Field replicas"},"strategy":{"type":"string","enum":["ROLLING","CANARY","BLUE_GREEN"],"description":"字段 strategy（语义见对应领域契约） / Field strategy"},"rollbackTo":{"type":"string","minLength":1,"description":"字段 rollbackTo（语义见对应领域契约） / Field rollbackTo"}},"required":["planId","image","replicas","strategy"]}
deps:
  - kind: call
    to: bili.infra.config
    label: {zh: "读取环境配置引用", en: "Read environment configuration"}
---
