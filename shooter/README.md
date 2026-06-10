# 打枪

纯前端 Canvas 手机小游戏。

- 入口：`index.html`
- 操作：手指或鼠标左右拖动队伍
- 玩法：企鹅小队自动射击，战斗段和补给段交替出现；补给段可能是人数门，也可能是武器箱
- 暂停：点击右上角暂停按钮，或按 `P` / `Esc`

主要数值在 `game.js`：

- 初始怪物数：`state.monsters`
- 初始队伍人数：`state.squad`
- 加成门：`makeLevel()` 里的 `state.gates`
- 虫潮波次：`spawnBugWave()`
- 补给段：`spawnRewardSegment()`
- 最终 Boss：`spawnBoss()`，夜鹭
