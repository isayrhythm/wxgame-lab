# wxgame-lab

一个适合手机端直接玩的网页小游戏合集，使用原生 HTML、CSS、Canvas、本地 Phaser 3 和 Three.js 实现。

## 在线游玩

GitHub Pages:

```text
https://isayrhythm.github.io/wxgame-lab/
```

## 游戏列表

- **木板冲刺** (`wood-runner/`)  
  收集木板、穿过倍率门，在断桥前自动铺路冲过去。

- **企鹅打枪** (`shooter/`)  
  操控企鹅小队迎战虫群，拾取武器补给和人数门，挑战夜鹭 Boss。

- **猪群突围** (`pig-charge/`)  
  拖动猪群过数量、攻击力和攻速门；进入猪栏后围攻敌人，接近敌人时自动丢元宝攻击，Boss 阶段还会出现石头和绿色弹幕。

- **贪吃蛇吃苹果** (`snake-apple-3d/`)  
  在峡谷 MOBA 风格地图里操控 3D 小蛇，沿三路吃苹果，也可以进野区吃野怪和蓝红 buff。每掉 10 个红苹果会追加 1 个精品大果；蓝 buff 让移动速度变为 2 倍，红 buff 会在 10 秒内让苹果刷新数变为 5 倍。

- **画个圆** (`perfect-circle/`)
  用鼠标或手指一笔画圆，根据圆度、闭合度和完整度即时评分，并记录本机最高分。

- **合成大西瓜** (`merge-watermelon/`)
  左右拖动并落下水果，相同水果碰撞后会逐级合成，挑战更高分和大西瓜。

- **物种起源** (`origin-species/`)
  操控变形虫探索无限微生态，吞噬比自己弱小的生物积累变异，并在每次变异固定时选择新的进化分支。

## 本地运行

这个项目是静态页面，可以直接用任意静态服务器打开。示例：

```bash
python -m http.server 4173
```

然后访问：

```text
http://127.0.0.1:4173/
```

## 目录

```text
wood-runner/     木板冲刺
shooter/         企鹅打枪
pig-charge/      猪群突围
snake-apple-3d/  贪吃蛇吃苹果
perfect-circle/   画个圆
merge-watermelon/ 合成大西瓜
origin-species/    物种起源
shared/          公共 UI、本地 Phaser 3 与 Three.js
```
