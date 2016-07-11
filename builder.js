var geo = require('geo');
var spawn = require('spawn');

module.exports = {
    handle: function (n, r) {
        /* Get or make the creep */
        if (Game.creeps[n] === undefined) {
            return this.make(n, r);
        }

        /* If we're out of energy, get some from something */
        if (Game.creeps[n].carry.energy === 0) {
            return Game.creeps[n].fillUpEnergy();
        }

        /* If we don't have a construction target, try to get one */
        if (Game.creeps[n].memory.targetID === undefined) {
            Game.creeps[n].memory.targetID = Game.creeps[n].findNearestConstructionSiteID();
            /* If there is none, upgrade the controller */
            if (Game.creeps[n].memory.targetID === undefined) {
                return Game.creeps[n].moveOrUpgradeController();
            }
        }

        /* Try to get the construction site */
        var cs = Game.getObjectById(Game.creeps[n].memory.targetID);
        if (cs === null) {
            Game.creeps[n].memory.targetID = undefined;
        }

        /* Construct there */
        var ret = Game.creeps[n].build(cs);
        if (ret === ERR_NOT_IN_RANGE) {
            return geo.move(Game.creeps[n], cs);
        } else if (ret === ERR_INVALID_TARGET) {
            Game.creeps[n].memory.targetID = undefined;
        }
        return ret;
    },

    /* makeBuilder makes a builder named n in Room r. */
    make: function (n, r) {
        var ec = roomEnergyCapacity(r); /* Effective energy capacity */
        /* Assume at least 300 capacity */
        if (!roomHasType(r, "truck") || ec < 300) {
            ec = 300;
        }

        if(ec > 500){
            ec = 500;
        }

        /* Make an array to hold the appropriate amount of body */
        var ba = new Array(4 * Math.floor(ec / 250));
        for (var i = 0; i < ba.length; i += 4) {
            ba[i] = CARRY;
            ba[i + 1] = MOVE;
            ba[i + 2] = WORK;
            ba[i + 3] = MOVE;
        }

        return spawn.spawnCreep(r, n, ba, "builder");
    }
};
