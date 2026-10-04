---
uid: 7e1a0001
id: data.relations
parent: data
state: planned
tags: [planned, "worker:W-INFRA", "storage:rds"]
name: {zh: "关系目录（自引用与合法环）", en: "Relation catalog (self references and legal cycles)"}
description:
  zh: >
      自引用与合法 ER 环、外键目标列与合并说明的机器可读目录；补足 Normify 不允许 dep 自环的表达限制
  en: >
      Machine-readable catalog of self references, legal ER cycles, foreign key target columns and merge notes, covering the normify no-self-loop restriction
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-10-03T00:00:00Z"
fingerprint: pending
source: []
apis:
  - protocol: file
    path: "plan/data-relations.json"
    description:
      zh: >
          关系目录文件
      en: >
          Relation catalog file
types:
  - name: "DataRelationCatalog"
    description: {zh: "实体关系目录", en: "Entity relation catalog"}
    schema: {"type":"object","additionalProperties":false,"description":"实体关系目录：自引用、合法环、外键目标列与合并规则 / Relation catalog: self references, legal cycles, FK target columns and merge rules","properties":{"note":{"type":"string","description":"目录说明 / Catalog note"},"self_references":{"type":"array","description":"自引用外键（在实体 Schema 中已落字段与索引）/ Self-reference foreign keys","items":{"type":"object","additionalProperties":false,"description":"自引用边 / Self-reference edge","properties":{"from_entity":{"type":"string","description":"源实体 / Source entity"},"from_column":{"type":"string","description":"源列 / Source column"},"to_entity":{"type":"string","description":"目标实体 / Target entity"},"to_column":{"type":"string","description":"目标列 / Target column"},"cardinality":{"type":"string","enum":["many-to-one","one-to-many","many-to-many"],"description":"基数 / Cardinality"},"enforced_by":{"type":"string","enum":["rds","application"],"description":"约束实施方 / Enforcer"}},"required":["from_entity","from_column","to_entity","to_column","cardinality","enforced_by"]}},"cycles":{"type":"array","description":"合法 ER 环 / Legal ER cycles","items":{"type":"object","additionalProperties":false,"description":"环边 / Cycle edge","properties":{"from_entity":{"type":"string","description":"源实体 / Source entity"},"from_column":{"type":"string","description":"源列 / Source column"},"to_entity":{"type":"string","description":"目标实体 / Target entity"},"to_column":{"type":"string","description":"目标列 / Target column"},"note":{"type":"string","description":"说明 / Note"}},"required":["from_entity","from_column","to_entity","to_column"]}},"fk_column_targets":{"type":"array","description":"外键目标列（当目标不是主键时显式声明）/ Foreign key target columns when not the primary key","items":{"type":"object","additionalProperties":false,"description":"目标列声明 / Target column declaration","properties":{"entity":{"type":"string","description":"实体 / Entity"},"column":{"type":"string","description":"外键列 / FK column"},"target_column":{"type":"string","description":"目标列 / Target column"}},"required":["entity","column","target_column"]}},"multi_fk_merge_note":{"type":"string","description":"多外键合并说明 / Multi-FK merge note"},"oss_boundary_note":{"type":"string","description":"对象存储边界说明 / Object storage boundary note"}},"required":["note","self_references","cycles","fk_column_targets","multi_fk_merge_note","oss_boundary_note"]}
---
