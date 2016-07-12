var geo = require('geo');
var spawn = require('spawn');

module.exports = {
    /* handleSource handles harvesting from a Source so */
    handle: function (so, hps) {
        var sid = so.id; /* Source ID */

        var harvestersPerSource = hps;

        /* Make sure we have memory */
        if (Memory[sid] === undefined) {
            Memory[sid] = {};
        }

        //handle all harvesters
        for (var i = 0; i < harvestersPerSource; ++i) {
            var c = this.getHarvesterFromSource(so, "h-" + so.room.name + "-" + so.pos.x + "," + so.pos.y + "-" + i);
            if (c !== undefined) {
                /* If we're not near the source, get there */
                if (!c.pos.isNearTo(so)) {
                    geo.move(c, so);
                }

                /* If the source has energy, harvest it */
                if (so.energy > 0) {
                    c.harvest(so);
                }
            }
        }

        return OK;
    },

    /* getHarvester returns a harvester object from a Source so, or tries to make
     * one and returns undefined. */
    getHarvesterFromSource: function (so, harvesterName) {
        /* Get hold of the harvester, if undefined, then make! */
        var c = Game.creeps[harvesterName];
        if (c === undefined) {
            this.makeHarvester(so, harvesterName);
            return undefined;
        }

        return c;
    },

    /* makeHarvester makes a harvester for Source so */
    makeHarvester: function (so, harvesterName) {
        var ec = roomEnergyCapacity(so.room); /* Effective energy capacity */
        /* Assume at least 300 capacity */
        if (ec < 300 ||
            !roomHasType(so.room, "harvester") ||
            !roomHasType(so.room, "truck")) {
            ec = 300;
        }

        if(ec > 900){
            ec = 900;
        }

        /* Make an array to hold the appropriate amount of body */
        var ba = new Array(2 * Math.floor(ec / 150));
        for (var i = 0; i < ba.length; i += 2) {
            ba[i] = WORK;
            ba[i + 1] = MOVE;
        }

        var creepName = spawn.spawnCreep(so.room, harvesterName, ba, "harvester");
        console.log('Spawining new harvester ' + creepName);
        return creepName;
    }
};
