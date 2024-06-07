mc.listen("onServerStarted", () => {
  initCommand();
});

mc.listen("onPlayerDie", (player, source) => {
  if (player.isSimulatedPlayer()) {
    player.simulateRespawn();
    const pos = player.getRespawnPosition(); //获取重生坐标
    player.talkAs(`我在${pos} 重生了，这一世，我必将拿回我的一切`);
  }
});

//处理win10右键防抖
let debounceTimeout;
let fanFlag = false;

function debounce(func, wait) {
  return function (...args) {
    if (!debounceTimeout) {
      func.apply(this, args);
      debounceTimeout = setTimeout(() => {
        debounceTimeout = null;
      }, wait);
    }
  };
}
const debouncedItemCommand = debounce(itemCommand, 1000); // 1秒的防抖时间

mc.listen("onUseItemOn", (player, item, block, side, pos) => {
  if (fanFlag) {
    debouncedItemCommand(player, item, block, side, pos);
  }
});

function itemCommand(player, item, block, side, pos) {
  if (item?.name.includes("cactus")) {
    //TODO:没找到旋转的接口，要删除重建？
  }
  return true;
}
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
              _ori.player.direction;
              player.simulateLookAt(_ori.player?.getBlockFromViewVector()?.pos);
              return out.success(
                `add"${res.userName}"on(${player.pos})success.`
              );
            }
          }
        }
        return out.error(`create failed.`);
      case "remove":
        if (res.userName) {
          const player = mc.getPlayer(res.userName);
          if (player && player.isSimulatedPlayer()) {
            stopAction(player);
            player.simulateDisconnect();
            return out.success(`remove fake player"${res.userName}"success`);
          }
        }
        return out.error(`[${res.userName}]不是假人或者不存在`);
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
  cmp.setEnum("PlayerAction", ["attick", "stop", "drop", "here"]);
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
      case "here":
        res.userName[0]?.teleport(_ori.pos);
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
    switch (res.FanAction) {
      case true:
        fanFlag = true;
        return out.success("开启成功");
      case false:
        fanFlag = false;
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

/**
 * 设置用户侧边栏
 * @param {Player} player 用户对象
 * @param {string} title 标题
 * @param {object} data 显示内容:{k,v}
 */
function setPlayerSidebar(player, title, data) {
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
  const intPos = {
    x: parseInt(pos.x),
    y: parseInt(pos.y),
    z: parseInt(pos.z),
    dimid: pos.dimid,
  };
  const db = new KVDatabase("db");
  const ps = mc.newParticleSpawner(4294967295, true, true);
  let id24 = setInterval(() => {
    drawYuan(ps, intPos, 24, 4, 1, 64, ParticleColor.Red);
  }, 2000);
  let id128 = setInterval(() => {
    drawYuan(ps, intPos, 128, 4, 1, 342, ParticleColor.Green);
  }, 2000);
  db.set("draw24", id24);
  db.set("draw128", id128);
  db.close();
}

/**
 * 自动攻击
 * @param {String} player 假人对象
 */
function attickAction(player) {
  const db = new KVDatabase("db");
  let id = db.get(`${player?.name}`);
  if (id) {
    clearInterval(parseInt(id));
  }
  // const player = mc.getPlayer(`${userName}`);
  logger.info("获取玩家:", player);
  if (player) {
    //获取背包物品
    let item = findItem(player, "剑");
    if (item) {
      //设置主手物品为剑
      swapHand(player, item);
      //开始攻击
    }
    id = setInterval(() => {
      player.simulateAttack();
    }, 1000);
    db.set(`${player.name}`, id);
    player.talkAs("开始攻击");
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
        setTimeout(() => {
          //因为三叉戟需要蓄力，所以等待1s
          player.simulateStopUsingItem();
        }, 1000);
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
    try {
      clearInterval(parseInt(id));
    } catch (error) {
      logger.error(`[stopAction]error:`, error);
    }
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
 * @param {int} lineWidth 线宽1,2,3,8,16
 * @param {int} minS 圆点最小间隔
 * @param {int} maxP 最大粒子数
 * @param {object} color 颜色
 */
function drawYuan(ps, center, radio, lineWidth, minS, maxP, color) {
  const b = new IntPos(center.x, center.y - radio, center.z, center.dimid);
  ps.drawCircle(b, 0, radio, lineWidth, minS, maxP, color);

  for (let i = 0; i < radio * 2; i++) {
    const currentRadio = i <= radio ? i : 2 * radio - i; // 计算当前半径
    const yPosition = b.y + i; // 计算当前y坐标
    ps.drawCircle(
      new IntPos(center.x, yPosition, center.z, center.dimid),
      0,
      currentRadio,
      lineWidth,
      minS,
      maxP,
      color
    );
  }
}
