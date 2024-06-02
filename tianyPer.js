mc.listen("onServerStarted", () => {
  initCommand();
});

mc.listen("onPlayerDie",(player,source)=>{
  if(player.isSimulatedPlayer()){
    player.simulateRespawn();
    player.talkAs(`我在${player.pos} 重生了，这一世，我必将拿回我的一切`)
  }
})

mc.listen("onUseItemOn", (player, item, block, side, pos) => {
  itemCommand(player, item, block, side, pos);
});

function itemCommand(player, item, block, side, pos) {}
/**
 * init command
 */
function initCommand() {
  //fake player manager
  const cmd = mc.newCommand(
    "tianyfakerplayer",
    "Fake Player Manager",
    PermType.GameMasters
  );
  cmd.setAlias("tfp");
  cmd.setEnum("ChangeAction", ["add", "remove"]);
  cmd.setEnum("ListAction", ["list", "status"]);
  cmd.mandatory("action", ParamType.Enum, "ChangeAction", 1);
  cmd.mandatory("action", ParamType.Enum, "ListAction", 1);
  cmd.mandatory("userName", ParamType.RawText);
  cmd.overload(["ChangeAction", "userName"]);
  cmd.overload(["ListAction", "userName"]);
  cmd.setCallback((_cmd, _ori, out, res) => {
    logger.info("res:", res, " cmd:", _cmd, " _ori:", _ori.player);
    switch (res.action) {
      case "add":
        if (res.userName) {
          if (!mc.getPlayer(res.userName)) {
            const player = mc.spawnSimulatedPlayer(res.userName, _ori.pos);
            if (player) {
              player.simulateLookAt(_ori.player.getBlockFromViewVector());
              return out.success(
                `add"${res.userName}"on(${player.pos})success.`
              );
            }
          }
        }
        return out.error(`create failed.`);
      case "remove":
        if (res.userName)
          if (isFakePlayer(res.userName))
            mc.getPlayer(res.userName).simulateDisconnect();
        return out.success(`remove fake player"${res.userName}"success`);
      case "list":
        if (res.userName) {
          const player = mc.getPlayer(res.userName);
          if (player) {
            return out.success(`Player info:${player}`);
          }
        } else {
          const ps = mc.getOnlinePlayers();
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
  const cmp = mc.newCommand(
    "player",
    "Fake Player Control",
    PermType.GameMasters
  );
  cmp.setEnum("PlayerAction", ["attick", "stop", "drop"]);
  cmp.setEnum("UseAction", ["use"]);
  cmp.mandatory("userName", ParamType.Player);
  cmp.mandatory("myItem", ParamType.RawText);
  cmp.mandatory("action", ParamType.Enum, "PlayerAction", 1);
  cmp.mandatory("useAction", ParamType.Enum, "UseAction", 1);
  cmp.overload(["userName", "action"]);
  cmp.overload(["userName", "useAction", "myItem"]);
  cmp.setCallback((_cmd, _ori, out, res) => {
    logger.info("res:", res);
    logger.info("res.userName:", res.userName);
    logger.info("res.userName:", res.userName[0]);
    switch (res.action) {
      case "attick":
        attickAction(res.userName[0]);
        return out.success("attick 20gt/1t");
      case "stop":
        stopAction(res.userName[0]);
        return out.success("stop success");
      case "drop":
        dropAction(res.userName[0]);
        return out.success("已全部扔出");
    }
    if (res.useAction == "use") {
      useAction(res.userName[0], `${res.myItem}`);
      return out.success("use success");
    }
  });
  cmp.setup();

  //show particle
  const hsa = mc.newCommand("hsa", "draw scope", PermType.GameMasters);
  hsa.setEnum("DrawAction", ["show", "stop"]);
  hsa.mandatory("action", ParamType.Enum, "DrawAction", 1);
  hsa.overload(["DrawAction"]);
  hsa.setCallback((_cmd, _ori, out, res) => {
    logger.info("res:", res);
    switch (res.action) {
      case "show":
        logger.info("111");
        clearAction();
        showAction(_ori.pos);
        return out.success("hsa show");
      case "stop":
        clearAction();
        return out.success("hsa stop");
    }
  });
  hsa.setup();

  //仙人掌扳手
  const fan = mc.newCommand("fan", "仙人掌扳手", PermType.GameMasters);
  fan.mandatory("FanAction", ParamType.Bool);
  fan.overload(["FanAction"]);
  fan.setCallback((_cmd, _ori, out, res) => {
    const db = new KVDatabase("db");
    const status = db.get("fan");
    switch (res.FanAction) {
      case true:
        if (!status || status !== true) {
          db.set("fan", true);
        }
        return out.success("开启成功");
      case false:
        if (status && status !== false) {
          db.set("fan", false);
        }
        return out.success("关闭成功");
    }
  });
  fan.setup();

  //结构群系UI
  const structUi = mc.newCommand("ui", "显示群系", PermType.GameMasters);
  structUi.mandatory("StructAction", ParamType.Bool);
  structUi.overload(["StructAction"]);
  structUi.setCallback((_cmd, _ori, out, res) => {
    const db = new KVDatabase("db");
    let id = 0;
    switch (res.StructAction) {
      case true:
        id = setInterval(
          _ori.setSidebar("Tiany UI", { 群系: `${_ori.getBiomeName()}` }),
          1000
        );
        db.set("sidebar", id);
      case false:
        id = db.get("sidebar");
        clearInterval(parseInt(id));
        db.delete("sidebar");
    }
    db.close();
    out.success("设置成功");
  });
}

function setPlayerSidebar(name, title, data) {
  const player = mc.getPlayer(`${name}`);
  if (player) {
    player.setSidebar(title, data);
  }
}

/**
 * 清除加载范围显示
 */
function clearAction() {
  const db = new KVDatabase("db");
  let id24r = db.get("draw24");
  let id128r = db.get("draw128");
  clearInterval(parseInt(id24r));
  clearInterval(parseInt(id128r));
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
  logger.info("showAction:", pos);
  const db = new KVDatabase("db");
  const ps = mc.newParticleSpawner(4294967295, true, true);
  let id24 = setInterval(() => {
    drawYuan(ps,pos, 24, 4, 1, 64, ParticleColor.Red);
  }, 2000);
  let id128 = setInterval(() => {
    drawYuan(ps,pos, 128, 4, 1, 342, ParticleColor.Green);
  }, 2000);
  db.set("draw24", id24);
  db.set("draw128", id128);
  db.close();
}

/**
 * 自动攻击
 * @param {String} userName 假人名称
 */
function attickAction(userName) {
  const db = new KVDatabase("db");
  let id = db.get(`${userName?.name}`);
  if (id) {
    clearInterval(parseInt(id));
  }
  // const player = mc.getPlayer(`${userName}`);
  logger.info("获取玩家:", userName);
  if (userName) {
    //获取背包物品
    let item = findItem(userName, "剑");
    if (item) {
      //设置主手物品为剑
      swapHand(userName, item);
      //开始攻击
    }
    id = setInterval(() => {
      userName.simulateAttack();
    }, 1000);
    db.set(`${userName.name}`, id);
    userName.talkAs("开始攻击");
  }
  db.close();
}
/**
 * 模拟使用物品
 * @param {string} player 假人名称
 * @param {object} item 使用物品
 */
function useAction(player, itemType = "") {
  logger.info(`[useAction](${player?.name})准备使用:${itemType}`);
  if (player) {
    const item = findItem(player, itemType);
    if (item) {
      swapHand(player, item);
      player.simulateUseItem();
      player.talkAs(`使用:${player.getHand()?.name}`);
      if (itemType == "三叉戟") {
        // player.simulateAttack();
        // player.simulateStopUsingItem();

        // player.simulateStopInteracting();
        setTimeout(()=>{
          // player.simulateStopDestroyingBlock();
          // player.simulateStopMoving();
          player.simulateStopUsingItem();
        },1000);
        player.talkAs("吃我一戟吧！");
      }
    } else {
      player.talkAs(`啥也没找到`);
    }
  } else {
    logger.error("用户不存在");
  }
}

/**
 * 交换用户背包和主手物品
 * @param {Player} player 用户对象
 * @param {Item} item 物品对象
 */
function swapHand(player, item) {
  logger.info(`[swapHand](${player?.name})swap item:${item.name}`);
  if (player && item) {
    const tmp = item.clone();
    const handInBackpak = player.getInventory()?.getAllItems()[
      findBackpack(player, player.getHand())
    ];
    const itemInBackpak = player.getInventory()?.getAllItems()[
      findBackpack(player, item)
    ];
    const cloneHand = handInBackpak.clone();
    player.getHand().set(tmp);
    itemInBackpak.set(cloneHand);
    player.refreshItems();
  }
}

/**
 *
 * @param {*} player
 * @param {*} item
 */
function findBackpack(player, item) {
  if (player) {
    const items = player.getInventory()?.getAllItems();
    if (items) {
      return items.findIndex((i) => i.id == item.id);
    }
  }
  return -1;
}

/**
 * 查找用户背包中的物品
 * @param {Player} player 用户对象
 * @param {string} itemTypee 查找物品的标准类型
 */
function findItem(player, itemType = "") {
  logger.info(`[findItem]开始从用户(${player?.name})查找(${itemType})`);
  if (player) {
    const keyValues = {
      剑: "sword",
      镐: "pickaxe",
      三叉戟: "trident",
    };
    const items = player.getInventory()?.getAllItems();
    return items[
      items.findIndex((i) => {
        const values = keyValues[`${itemType}`]
          ? [keyValues[`${itemType}`]]
          : itemType
          ? [itemType]
          : Object.values(keyValues);
        return values.some((sub) => i.type.includes(sub));
      })
    ];
  } else {
    return {};
  }
}

/**
 * 模拟扔出背包中的全部物品
 * @param {Player} player 假人对象
 */
function dropAction(player) {
  logger.info(`[dropAction]player:${player?.name}`);
  if (player) {
    const items = player.getInventory()?.getAllItems();
    items.forEach((item) => {
      if (!item.isNull()) {
        mc.spawnItem(
          item,
          player.pos.x + 5,
          player.pos.y,
          player.pos.z,
          player.pos.dimid
        );
        item.setNull();
      }
    });
    logger.info("drop all");
  }
}
/**
 * 停止所有动作
 * @param {String} userName 假人名称
 */
function stopAction(player) {
  const db = new KVDatabase("db");
  // const userName = mc.getPlayer(`${userName}`);
  if (player) {
    //停止其他动作
    player.simulateStopDestroyingBlock();
    player.simulateStopInteracting();
    player.simulateStopMoving();
    player.simulateStopUsingItem();
    //停止攻击
    let id = db.get(`${player.name}`);
    clearInterval(parseInt(id));
    db.delete(`${player.name}`);
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
function drawYuan(ps,center, radio, length, minS, maxP, color) {
  const b = new FloatPos(center.x, center.y - radio, center.z, center.dimid);

  logger.info("drawYuan:", center, b);
  ps.drawCircle(b, 0, 2, length, minS, maxP, color);

  for (let i = 0; i < radio * 2; i++) {
    if (i <= radio) {
      ps.drawCircle(
        new FloatPos(center.x, b.y + i, center.z, center.dimid),
        0, i,
        length,
        minS,
        maxP,
        color
      );
    } else {
      ps.drawCircle(
        new FloatPos(center.x, b.y + i, center.z, center.dimid),
        0,
        (radio = 2 * radio - i),
        length,
        minS,
        maxP,
        color
      );
    }
  }
}
