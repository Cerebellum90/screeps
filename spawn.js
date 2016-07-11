module.exports = {
    /* spawnCreep spawns, in room r, a creep named n with body b, role t, and
     * optional memory m.  The type will be placed in the creep's memory's role
     * field.  It will overwrite anything in m. */
    spawnCreep: function (r, n, b, t, m) {
        var rid = r.id; /* Room ID */

        /* Make sure the caches are set up */
        if (Game.rcache === undefined) {
            Game.rcache = {};
        }
        if (Game.rcache[rid] === undefined) {
            Game.rcache[rid] = {};
        }
        if (Game.rcache[rid].spawnInUse === undefined) {
            Game.rcache[rid].spawnInUse = {};
        }

        /* Make sure we have a list of spawns */
        findSpawnsInRoom(r);

        /* Try to create the creep */
        for (var i = 0; i < Game.rcache[rid].spawns.length; ++i) {
            /* Ignore spawns in the process of spawning */
            if (Game.rcache[rid].spawns[i].spawning) {
                continue;
            }
            if (Game.rcache[rid].spawnInUse[Game.rcache[rid].spawns[i].id] === true) {
                continue;
            }

            /* Creep's memory */
            if (m === undefined) {
                m = {};
            }
            m.role = t;

            /* Try to make it */
            var ret = (Game.rcache[rid].spawns[i].createCreep(b, n, m));
            if (_.isString(ret)) {
                Game.rcache[rid].spawnInUse[Game.rcache[rid].spawns[i].id] = true;
                return ret;
            }
            return ret;
        }

        return undefined;
    }
};
