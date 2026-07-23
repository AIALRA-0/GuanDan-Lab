# 贯策

贯策是面向严肃学习的科学掼蛋训练平台

它把高性能本地对局、合法着生成、团队协同评估、逐手解释、反事实比较、专项训练与长期进度放在同一个中文界面内

## 核心能力

- 完整双副牌发牌与竞技牌型识别
- 逢人配、炸弹层级、接风与名次结算
- 三档可解释 AI 对手
- 每手牌的原因、后果、搭档视角与备选方案
- 牌型、搭档、记牌与残局专项训练
- Cloudflare D1 学习进度
- 桌面端与移动端响应式牌桌

## 本地运行

```bash
npm install
npm run dev
```

## 验证

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
npm run test:render
```

## 设计边界

贯策是学习和训练工具，不包含充值、下注、抽成或任何博彩导向功能

当前 AI 是可审计的启发式团队策略层，架构允许后续接入 IS-MCTS、Deep Monte Carlo 与自博弈模型

## 生产环境

- 正式入口 `https://guandan.aialra.online`
- 入口由 AIALRA Authentik 统一身份中心保护
- 应用仅监听服务器回环地址 `127.0.0.1:13100`
- 学习进度保存在 `/srv/aialra/state/guandan/wrangler`
- systemd 服务名为 `aialra-guandan.service`

生产构建使用单包 Worker 模式，避免 Linux Wrangler 多模块直载差异

```bash
npm run build:vps
```

部署脚本位于 `deploy/`

- `install-vps.sh` 安装只读发布版本、运行时和持久化状态
- `prepare-hostname.sh` 启用域名并签发或复用 TLS 证书
- `configure-auth-nginx.sh` 接入 Authentik、身份网关和 Nginx

发布后至少执行以下检查

```bash
systemctl is-active aialra-guandan.service
curl -I https://guandan.aialra.online
HOST_UNDER_TEST=guandan.aialra.online \
EXPECTED_APP_SLUG=guandan \
RETURN_PATH=/ \
/srv/aialra/apps/auth-gateway/test_oidc_flow.sh
```
