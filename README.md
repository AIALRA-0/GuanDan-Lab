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
