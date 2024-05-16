let fakePlayerAttick = {};
mc.listen("onServerStarted", () = > {
    const cmd = mc.newCommand("tianyFakerPlayer", "Fake Player Manager", PermType.GameMasters);
    cmd.setAlias("tfp");
    cmd.setEnum("ChangeAction", ["add", "remove"]);
    cmd.setEnum("ListAction", ["list", "status"]);
    cmd.mandatory("action", ParamType.Enum, "ChangeAction", 1);
    cmd.mandatory("action", ParamType.Enum, "ListAction", 1);
    cmd.mandatory("name", ParamType.RawText);
    cmd.overload(["ChangeAction", "name"]);
    cmd.overload(["ListAction", "name"]);
    cmd.setCallback((_cmd, _ori, out, res) = > {
        switch (res.action) {
            case "add":
                if (res.name) {
                    const result = checkPlayer(res.name);
                    if (!result) {
                        const player = createFakePlayer(res.name, _ori.pos);
                        if (player) {
                            player.simulateLookAt(_ori.getBlockFromViewVector());
                            return out.success(`add "${res.name}"
                                on($ {
                                    JSON.stringify(player.pos)
                                }) success.`)
                        }
                    }
                }
                return out.error(`fake player "${res.name}"
                    already exist or create failed.`);
            case "remove":
                if (res.name) {
                    if (isFakePlayer(res.name)) {
                        const player = mc.getPlayer(res.name);
                        player.simulateDisconnect()
                    }
                }
                return out.success(`remove fake player "${res.name}"
                    success`);
            case "list":
                if (res.name) {
                    const player = mc.getPlayer(res.name);
                    if (player) {
                        return out.success(`Player info: $ {
                            player
                        }`)
                    }
                } else {
                    const players = mc.getOnlinePlayer();
                    const fakePlayers = [];
                    players.forEach((player) = > {
                        if (player.isSimulatedPlayer()) {
                            fakePlayers.push(JSON.stringify(player))
                        }
                    });
                    return out.success(`Name List: $ {
                        fakePlayers
                    }`)
                }
                return out.success(`Name List: `)
        }
    });
    cmd.setup();
    const cmdplayer = mc.newCommand("player", "Fake Player Control", PermType.GameMasters);
    cmdplayer.setEnum("playerAction", ["attick", "use", "stop"]);
    cmdplayer.mandatory("name", ParamType.Player);
    cmdplayer.mandatory("action", PermType.Enum, "playerAction", 1);
    cmdplayer.overload(["name", "playerAction"]);
    cmdplayer.setCallback((_cmd, _ori, out, res) = > {
        switch (res.action) {
            case "attick":
                if (fakePlayerAttick[`$ {
                    res.name
                }`]) {
                    clearInterval(fakePlayerAttick[`$ {
                        res.name
                    }`])
                }
                fakePlayerAttick[`$ {
                    res.name
                }`] = setInterval(function() {
                    _ori.player.mc.getPlayer(res.name).simulateAttack()
                }, 1000);
                return out.success("attick 15gt/1t");
            case "use":
                return out.success("use success")
        }
    });
    cmdplayer.setup()
});

function createFakePlayer(a, b) {
    const player = mc.spawnSimulatedPlayer(a, b);
    if (player) {
        return player
    }
}

function checkPlayer(a) {
    const player = mc.getPlayer(a);
    if (player) {
        return false
    }
    return true
}

function isFakePlayer(a) {
    const player = mc.getPlayer(a);
    if (player) {
        if (player.isSimulatedPlayer()) {
            return true
        } else {
            return false
        }
    }
    return false
}

function isEmpty(a) {
    if (a === null || a === undefined) {
        return true
    }
    if (typeof a === "string") {
        return a.trim() === ""
    }
    if (Array.isArray(a) || (typeof a === "object" && a.constructor === Object)) {
        return Object.keys(a).length === 0
    }
    return false
}