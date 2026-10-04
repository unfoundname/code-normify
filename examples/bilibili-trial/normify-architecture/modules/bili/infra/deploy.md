---
uid: f54c7a38
id: bili.infra.deploy
parent: bili.infra
state: planned
tags: ["worker:infra-deploy"]
name: {zh: "部署、备份与容量", en: "Deployment, Backup and Capacity"}
description:
  zh: >
      应用编排、配置与密钥绑定、备份恢复演练目标、容量规划；服务器数量与地域待用户确认。
      
  en: >
      App topology, config/secret binding, backup-restore drills and capacity planning; server sizing pending.
      
revision: "0000000000000000000000000000000000000000"
updated_at: "2026-06-01T00:00:00Z"
fingerprint: pending
source:
  - path: "infra/deploy/topology.yaml"
  - path: "infra/deploy/backup-plan.md"
  - path: "infra/deploy/capacity.md"
apis: []
types:
  - name: "DeploymentTopology"
    description: {zh: "部署拓扑", en: "Deployment topology"}
    schema: {"type":"object","additionalProperties":false,"description":"用户已提供服务器但配置/数量/地域未给出，不假定无限容量","properties":{"role":{"type":"string","enum":["web_api","media_worker","job_worker","live_gateway","search_indexer","admin_api"],"description":"节点角色"},"replicas":{"type":"integer","description":"副本数","minimum":1},"cpuRequest":{"type":"string","description":"CPU 请求"},"memoryRequest":{"type":"string","description":"内存请求"},"autoscale":{"type":"boolean","description":"是否自动扩缩"},"region":{"type":"string","description":"地域，待用户确认"},"confirmed":{"type":"boolean","description":"资源参数是否已确认"}},"required":["role","replicas","confirmed"]}
  - name: "BackupPolicy"
    description: {zh: "备份策略", en: "Backup policy"}
    schema: {"type":"object","additionalProperties":false,"properties":{"target":{"type":"string","enum":["rds_full","rds_incremental","oss_metadata","config","outbox_snapshot"],"description":"备份对象"},"frequency":{"type":"string","description":"频率，如 daily 03:00Z"},"retentionDays":{"type":"integer","description":"保留天数","minimum":1},"offsite":{"type":"boolean","description":"是否异地"},"restoreDrillDays":{"type":"integer","description":"恢复演练周期天","minimum":1}},"required":["target","frequency","retentionDays"]}
  - name: "CapacityPlan"
    description: {zh: "容量规划", en: "Capacity plan"}
    schema: {"type":"object","additionalProperties":false,"description":"未采集真实数据前不得声称容量充足","properties":{"resource":{"type":"string","enum":["rds_storage","rds_iops","oss_storage","egress_bandwidth","transcode_cpu","db_connections"],"description":"资源"},"currentAssumption":{"type":"string","description":"当前假设（待测量）"},"growthPerMonthPercent":{"type":"integer","description":"月增长假设 %","minimum":0},"thresholdPercent":{"type":"integer","description":"告警阈值 %","minimum":1,"maximum":100},"measuredAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["resource","currentAssumption","thresholdPercent"]}
  - name: "SecretBinding"
    description: {zh: "配置与密钥绑定", en: "Secret binding"}
    schema: {"type":"object","additionalProperties":false,"properties":{"name":{"type":"string","description":"配置项名"},"scope":{"type":"string","enum":["rds","oss","sms","payment","rtc","search","cdn"],"description":"作用域"},"source":{"type":"string","enum":["env","secret_manager","file"],"description":"来源"},"configured":{"type":"boolean","description":"是否已配置"},"rotatedAt":{"$ref":"urn:normify:bili.contract.core.ids:IsoInstant"}},"required":["name","scope","source","configured"]}
---
