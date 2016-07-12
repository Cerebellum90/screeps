var geo = require('geo');
var spawn = require('spawn');

module.exports = {
    /* handleTruck handles the truck named n */
    handle: function (n, r) {
        /* If the truck doesn't exist, make it */
        if (Game.creeps[n] === undefined) {
            if (roomHasType(r, "harvester")) {
                var makeResult = this.make(n, r);
                return makeResult;
            }
            return undefined;
        }

        var truck = Game.creeps[n];

        /* If we're full or partially full but not near a source,
         * deposit energy */
        if ((truck.carry.energy >= truck.carryCapacity) || (truck.carry.energy !== 0 && truck.pos.findInRange(FIND_SOURCES_ACTIVE, 2).length === 0)) {
            return this.depositEnergy(truck);
        }

        /* If we're not full, find energy lying about, or failing that,
         * deposit what we have. */
        var ret = this.pickupEnergy(truck);
        if (ret === undefined && truck.carry.energy !== 0) {
            return this.depositEnergy(truck);
        }
        else if (ret === undefined){
            //waiting, so no pickup location and also no energy left to deposit. such a shame...
            //console.log('jup... magic ' + truck);
        }
        return ret;
    },

    /* makeTruck makes a truck named n in room r */
    make: function (n, r) {
        /* Effective energy capacity */
        var ec = roomEnergyCapacity(r);
        /* Assume at least 300 capacity */
        if (!roomHasType(r, "truck") || ec < 300) {
            ec = 300;
        }

        if(ec > 500){
            ec = 500;
        }

        /* Make an array to hold the appropriate amount of body */
        var ba = new Array(2 * Math.floor(ec / 100));
        for (var i = 0; i < ba.length; i += 2) {
            ba[i] = CARRY;
            ba[i + 1] = MOVE;
        }

        var creepName = spawn.spawnCreep(r, n, ba, "truck");
        console.log('Spawining new builder ' + creepName);
        return creepName;
    },

    /* pickupEnergy causes Creep c to pick up energy in its room */
    pickupEnergy: function (c) {
        /* If we don't have cached energy, work out which to get. */
        if (c.memory.pickupTarget === undefined) {
            c.memory.pickupTarget = this.findBiggestEnergyId(c);
            if (c.memory.pickupTarget === undefined) {
                return undefined;
            }
        }

        /* If we have cached energy, use that */
        var e = Game.getObjectById(c.memory.pickupTarget);
        /* Don't use it if it's not there */
        if (e === null) {
            c.memory.pickupTarget = this.findBiggestEnergyId(c);
            return undefined;
        }

        /* Lay claim to this one */
        //console.log("Laying claim to " + e);
        this.markClaimed(e);

        var pickupResult = c.pickup(e);
        if (pickupResult == ERR_NOT_IN_RANGE) {
            return geo.move(c, e);
        } else {
            c.memory.pickupTarget = undefined;
        }

        return pickupResult;
    },

    /* findBiggestEnergyId finds the ID of the biggest chunk of resource in Creep
     * c's room. */
    findBiggestEnergyId: function (c) {
        /* Make sure we know where the energy is */
        findRoomDroppedEnergy(c.room);

        /* Find the biggest amount of energy which isn't claimed. */
        var maxi; /* Index of resource with most energy */
        for (var i = 0; i < Game.rcache[c.room.id].denergy.length; ++i) {
            /* IF this one's claimed, move on */
            if (this.isClaimed(Game.rcache[c.room.id].denergy[i])) {
                continue;
            }
            /* If we don't have a max, start with this one */
            if (maxi === undefined) {
                maxi = i;
            }

            /* Note the index of the largest dropped energy */
            if (Game.rcache[c.room.id].denergy[i].amount > Game.rcache[c.room.id].denergy[maxi].amount) {
                maxi = i;
            }
        }

        /* If there's no (unclaimed) energy, return undefined */
        if (maxi === undefined) {
            return undefined;
        }

        /* Lay claim to that one, try to harvest or move towards it */
        return Game.rcache[c.room.id].denergy[maxi].id;
    },

    /* depositEnergy tells a Creep c to put energy in the nearest thing that has
     * sufficient space */
    depositEnergy: function (c) {
        var t;
        if (c.memory === undefined) {
            console.log("CM Undef, spawning: " + c.spawning);
        }
        /* If we don't have somewhere to put things, get the nearest non-full
         * energy holder. */
        if (c.memory.targetID === undefined) {
            /* Find the closest non-empty holder */
            t = this.findEnergyStorage(c);
            /* Give up if there's nothing */
            if (t === undefined) {
                return undefined;
            }
            c.memory.targetID = t.id;
        }

        /* Get the target object */
        if (t === undefined) {
            t = Game.getObjectById(c.memory.targetID);
            if (t === null) {
                return undefined;
            }
        }

        /* Try again if a cached holder runs out of space */
        if (!canHoldEnergy(t)) {
            t = this.findEnergyStorage(c);
            if (t === undefined) {
                c.memory.targetID = undefined;
                return undefined;
            }
            c.memory.targetID = t.id;
        }

        var transferResult = c.transfer(t, RESOURCE_ENERGY);
        if (transferResult == ERR_NOT_IN_RANGE) {
            return geo.move(c, t);
        } else {
            c.memory.targetID = undefined;
        }

        return transferResult;
    },

    /* findEnergyStorage finds a place to put the energy held by Creep c */
    findEnergyStorage: function (c) {

        /* Prioritize the spawn and extensions. */
        var ss = _.filter(findSpawnsInRoom(c.room).concat(findStructuresOfTypeInRoom(STRUCTURE_EXTENSION, c.room)), function (x) {
            return canHoldEnergy(x);
        })
        /* If we've not got anything, try towers */
        if (ss.length === 0) {
            /* Failing that, try a tower */
            ss = _.filter(findStructuresOfTypeInRoom(STRUCTURE_TOWER, c.room), function (x) {
                return canHoldEnergy(x);
            })
        }
        if (ss.length !== 0) {
            var s = c.pos.findClosestByPath(ss);
            if (s !== null) {
                return s;
            }
        }
        /* Failing the towers stick it in the storage if we have one */
        if (c.room.storage !== undefined && canHoldEnergy(c.room.storage)) {
            return c.room.storage;
        }
        return undefined;
    },

    /* markClaimed marks Source s as being claimed */
    markClaimed: function (s) {
        /* Make sure we have storage */
        if (Game.claimed == undefined) {
            Game.claimed = {};
        }
        Game.claimed[s.id] = true;
    },

    /* isClaimed returns true if Source s is claimed */
    isClaimed: function (s) {
        /* If nothing's been claimed yet, this one's not */
        if (Game.claimed === undefined) {
            return false;
        }
        return Game.claimed[s.id] === true;
    }
};
