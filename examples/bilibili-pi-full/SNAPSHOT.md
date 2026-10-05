# 完整视频网站需求试用快照

`index.html` 是结果入口，三张 HTML 图及对应 JSON、报告、分支交接包和验证记录保存本次试用结果。此处保存设计与契约验证产物；产品业务实现和前端渲染测试栈尚未完成。

独立示例仓库的完整历史保存为 `frozen-project.bundle`，包含分支计划引用的固定基线 `7b0ea7f5a56933f004bdd50d29b6ffae7bc74cde`。本机 `project/`、验证工作树和运行会话未直接加入主仓库。

在本目录恢复示例仓库：

```powershell
git clone frozen-project.bundle project
```

`pi-mcp.ts`、`run-pi.mjs` 及示例仓库脚本中的绝对路径是本次 Windows 试用环境配置。换环境时应显式配置仓库、Node、pi 与 MCP adapter 路径。原始运行日志和会话继续保留在本机。运行前需自备 `pi-mcp-adapter`（该包不是本仓库依赖，未列入 `package.json`、锁文件或 `node_modules`），并按实际安装位置修改 `pi-mcp.ts` 第 1 行的 import 路径。
