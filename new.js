mc.listen("onServerStarted", () => {
  initCommand();
});

/**
 * init command
 */
function initCommand() {
  //fake player manager
  const cmd = mc.newCommand("tianyFakerPlayer", "FPM", PermType.GameMasters);
  cmd.setAlias("tfp");
  cmd.setEnum("ChangeAction", ["add", "remove"]);
  cmd.setEnum("ListAction", ["list", "status"]);
  cmd.mandatory("action", ParamType.Enum, "ChangeAction", 1);
  cmd.mandatory("action", ParamType.Enum, "ListAction", 1);
  cmd.mandatory("name", ParamType.RawText);
  cmd.overload(["ChangeAction", "name"]);
  cmd.overload(["ListAction", "name"]);
  cmd.setCallback((_cmd, _ori, out, res) => {
    switch (res.action) {
      case "add":
        if (res.name) {
          if (!mc.getPlayer(res.name)) {
            const player = mc.spawnSimulatedPlayer(res.name, _ori.pos);
            if (player) {
              player.simulateLookAt(_ori.getBlockFromViewVector());
              return out.success(
                `add"${res.name}"on(${JSON.stringify(player.pos)})success.`
              );
            }
          }
        }
        return out.error(`create failed.`);
      case "remove":
        if (res.name)
          if (isFakePlayer(res.name))
            mc.getPlayer(res.name).simulateDisconnect();
        return out.success(`remove fake player"${res.name}"success`);
      case "list":
        if (res.name) {
          const player = mc.getPlayer(res.name);
          if (player) {
            return out.success(`Player info:${player}`);
          }
        } else {
          const ps = mc.getOnlinePlayer();
          const fps = [];
          ps.forEach((p) => {
            if (p.isSimulatedPlayer()) {
              fps.push(JSON.stringify(p));
            }
          });
          return out.success(`Name List:${fps}`);
        }
        return out.success(`Name List:`);
    }
  });
  cmd.setup();

  //faker player controller
  const cmp = mc.newCommand("player", "Fake Player Control", PermType.GameMasters);
  cmp.setEnum("PlayerAction", ["attick", "use", "stop"]);
  cmp.mandatory("name", ParamType.Player);
  cmp.mandatory("myItem", ParamType.RawText);
  cmp.mandatory("action", PermType.Enum, "PlayerAction", 1);
  cmp.overload(["name", "PlayerAction"]);
  cmp.overload(["name", "use", "myItem"]);
  cmp.setCallback((_cmd, _ori, out, res) => {
    switch (res.action) {
      case "attick":
        attickAction(`${res.name}`);
        return out.success("attick 20gt/1t");
      case "stop":
        stopAction(`${res.name}`);
        return out.success("stop success");
      case "use":
        useAction(`${res.name}`, `${res.myItem}`);
        return out.success("use success");
    }
  });
  cmp.setup();

  //show particle
  const hsa = mc.newCommand("hsa", "draw scope", PermType.GameMasters);
  hsa.setEnum("DrawAction", ["show", "stop"]);
  hsa.mandatory("action", PermType.Enum, "DrawAction", 1);
  hsa.overload(["DrawAction"]);
  hsa.setCallback((_cmd, _ori, out, res) => {
    switch (res.action) {
      case "show":
        clearAction();
        showAction(_ori.pos);
        return out.success("hsa show");
      case "stop":
        clearAction();
        return out.success("hsa stop");
    }
  });
  hsa.setup();
}

/**
 * 模拟使用物品
 * @param {string} name 假人名称
 * @param {object} item 使用物品
 */
function useAction(name, item = "") {
  const player = mc.getPlayer(name);
  const hand = player.getHand();
  if (item) {
    hand = item;
  } else {
    const items = player.getInventory()?.getAllItems();
    hand =
      items[
        items.findIndex((i) =>
          ["三叉戟", "剑", "镐"].some((substring) => i.name.includes(substring))
        )
      ];
  }
  player.refreshItems();
  player.simulateUseItem();
  player.talkAs(`使用:${hand?.name}`);
}

/**
 * 清除加载范围显示
 */
function clearAction() {
  const db = new KVDatabase("db");
  let id24r = db.get("draw24");
  let id128r = db.get("draw128");
  clearInterval(id24r);
  clearInterval(id128r);
  db.delete("draw24");
  db.delete("draw128");
  db.close();
}

/**
 * 显示加载球形范围
 * TODO:根据模拟距离自动调整半径
 * @param {object} pos 球心
 */
function showAction(pos) {
  const db = new KVDatabase("db");
  let id24 = setInterval(() => {
    drawYuan(pos, 24, 2, 2, 64, ParticleColor.Red);
  }, 2000);
  let id128 = setInterval(() => {
    drawYuan(pos, 128, 2, 2, 342, ParticleColor.Green);
  }, 2000);
  db.set("draw24", id24);
  db.set("draw128", id128);
  db.close();
}

/**
 * 自动攻击
 * @param {String} name 假人名称
 */
function attickAction(name) {
  const db = new KVDatabase("db");
  let id = db.get(`${name}`);
  if (id) {
    clearInterval(id);
  }
  const player = mc.getPlayer(`${name}`);
  //获取背包
  const container = player.getInventory();
  //获取背包中所有的物品
  const items = container.getAllItems();
  //获取主手物品
  let item = player.getHand();
  //设置主手物品为剑
  item = items[items.findIndex((i) => i.name.includes("剑"))];
  player.talkAs("尝试寻找武器....");
  player.talkAs(`使用武器:${item.name}`);

  //刷新主手
  player.refreshItems();
  //开始攻击
  id = setInterval(() => {
    player.simulateAttack();
  }, 1000);
  db.set(`${res.name}`, id);
  player.talkAs("开始攻击");
  db.close();
}

/**
 * 停止所有动作
 * @param {String} name 假人名称
 */
function stopAction(name) {
  const db = new KVDatabase("db");
  const player = mc.getPlayer(`${name}`);
  if (player) {
    //停止其他动作
    player.simulateStopDestroyingBlock();
    player.simulateStopInteracting();
    player.simulateStopMoving();
    player.simulateStopUsingItem();
    //停止攻击
    let id = db.get(`${name}`);
    clearInterval(id);
    db.delete(`${res.name}`);
    player.talkAs("已停止所有动作");
  }
  db.close();
}

/**
 * 检查传入的名称对应的玩家是否是假人
 * @param {string} n 名称
 * @returns {boolean} 布尔值
 */
function isFakePlayer(n) {
  const p = mc.getPlayer(n);
  if (p) return p.isSimulatedPlayer();
  else return false;
}

/**
 * 绘制一个球体
 * @param {pos} center 球心坐标
 * @param {int} radio 半径
 * @param {int} length 忘记了
 * @param {int} minS 忘记了，最小间隔还是啥来着
 * @param {int} maxP 最大粒子数还是啥来着
 * @param {object} color 颜色
 */
function drawYuan(center, radio, length, minS, maxP, color) {
  const b = new FloatPos(center.x, center.y - radio, center.z, center.dimid);
  const ps = mc.newParticleSpawner(42949, true, true);
  ps.drawCircle(b, NEG_Y, (radio = 1), length, minS, maxP, color);

  for (let i = 0; i < radio * 2; i++) {
    if (i <= radio) {
      ps.drawCircle(
        new FloatPos(center.x, b.y + i, center.z, center.dimid),
        NEG_Y,
        (radio = i),
        length,
        minS,
        maxP,
        color
      );
    } else {
      ps.drawCircle(
        new FloatPos(center.x, b.y + i, center.z, center.dimid),
        NEG_Y,
        (radio = 2 * radio - i),
        length,
        minS,
        maxP,
        color
      );
    }
  }
}