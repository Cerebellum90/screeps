module.exports = {
    /* move moves Creep c to an object t, caching the path.  It sticks the path in
     * the mpath member of the creep's memory and the target's id in the mid
     * member of the creep's memory. */
    move: function (c, t) {
        var path;
        /* If the target has changed get a new path */
        if (c.memory.mpath === undefined || c.memory.mid !== t.id) {
            /* Record the current target */
            c.memory.mid = t.id;

            /* Save the path */
            path = this.getPath(c, t);
            c.memory.mpath = path;
        } else {
            path = c.memory.mpath;
        }

        /* If we're meant to have moved, but our position hasn't changed, try
         * a new path next time. */
        if (c.memory.mx !== undefined && c.memory.mx === c.pos.x && c.memory.my !== undefined && c.memory.my === c.pos.y) {
            c.memory.mpath = undefined;
            c.memory.mx = undefined;
            c.memory.my = undefined;
            this.delPath(c, t);
            return undefined;
        }

        /* If the target's changed, it's the first move, or moving by the
         * cached path failed, come up with a new path. */

        /* Try to move along it */
        var ret = c.moveByPath(path);
        /* If we couldn't try a different path next time */
        if (ret !== OK) {
            c.memory.mpath = undefined;
            return ret;
        }

        /* Record location for checking next time */
        c.memory.mx = c.pos.x;
        c.memory.my = c.pos.y;

        return OK;
    },

    /* getPath returns the path from Creep c to target object t) */
    getPath: function (c, t) {
        var moveCacheLifetime = 10; /* Cached paths only last this long */

        /* Make sure there's path memory */
        if (Memory.paths === undefined) {
            Memory.paths = {};
        }

        /* Path name */
        var pn = this.pathName(c, t);

        /* If we have the path and it's not too old, return it */
        var p = Memory.paths[pn];
        if (p !== undefined && moveCacheLifetime > (Game.time - p[1])) {
            return p[0];
        }

        /* If not, make it, save it, return it */
        p = c.pos.findPathTo(t, { ignoreCreeps: false, serialize: true });
        Memory.paths[pn] = [p, Game.time];
        return p;
    },

    /* delPath deletes the cached path from Creep c to target Object t */
    delPath: function (c, t) {
        /* Make sure there's path memory */
        if (Memory.paths === undefined) {
            Memory.paths = {};
        }
        Memory.paths[this.pathName(c, t)] = undefined;
    },

    /* pathName returns the name of the path from Creep to target Object t */
    pathName: function (c, t) {
        return c.pos.x + "," + c.pos.y + "->" + t.pos.x + "," + t.pos.y;
    }
};
