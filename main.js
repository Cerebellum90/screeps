//module imports
require('creep');

var stats = require('stats');
var tower = require('tower');
var builder = require('builder');
var spawn = require('spawn');
var source = require('source');
var geo = require('geo');
var truck = require('truck');

/* Number of creeps of various types, per-room */
var roomDefinitions = {
    "E21S49": {
        "harvestersPerSource": 2,
        "build": 3,
        "truck": 5
    },
    "E21S48": {
        "harvestersPerSource": 1,
        "build": 0,
        "truck": 0
    }
};

module.exports.loop = function () {
    //clear memory
    for (var creepName in Memory.creeps) {
        if (Game.creeps[creepName] == undefined) {
            delete Memory.creeps[creepName];
            console.log('Memory cleared of creep ' + creepName);
        }
    }

    /* Each tick, iterate over rooms we own */
    for (var roomName in roomDefinitions) {
        var room = Game.rooms[roomName];

        //if not yet claimed, try to do so
        if (room == undefined) {
            // var claimCreep = Game.creeps['CLAIMER'];
            // if(claimCreep == undefined){
            //    console.log(roomName + ' not yet claimed');
            //    console.log('no claimer creep. Trying to spawn');
            //
            //    Game.spawns.Spawn1.createCreep([WORK, MOVE, WORK, MOVE], 'CLAIMER');
            //
            // } else {
            //    console.log('Claiming ' + roomName);
            //    var target = new RoomPosition(40, 9, 'E21S48');
            //    console.log(target);
            //    var claimResult = claimCreep.moveTo(target);
            //
            //    console.log(claimResult);
            //
            //    if(claimResult == ERR_NOT_IN_RANGE) {
            //        claimCreep.moveTo(target);
            //    }
            // }

            continue;
        }

        /* Skip it if it's not mine */
        if (!room.controller.my) {
            console.log("This isn't my controller in " + room.name);
            continue;
        }

        /* Move things about in each room */
        handleRoom(room);
    }

    stats.log();
}

/* handleRoom handles the creeps in a Room ro */
handleRoom = function (room) {
    checkRoomSetup(room);

    if (room.memory.sources === undefined) {
        room.memory.sources = room.find(FIND_SOURCES).map(function (source) {
            return source.id;
        });
    }

    /* Harvest energy */
    for (var i in room.memory.sources) {
        source.handle(Game.getObjectById(room.memory.sources[i]), roomDefinitions[room.name].harvestersPerSource);
    }

    //handle all trucks
    for (var i = 0; i < roomDefinitions[room.name].truck; ++i) {
        truck.handle("t-" + room.name + "-" + i, room);
    }

    //handle all builders
    for (var i = 0; i < roomDefinitions[room.name].build; ++i) {
        builder.handle("b-" + room.name + "-" + i, room);
    }

    /* Handle all the towers in the room */
    var towers = room.find(FIND_MY_STRUCTURES, {
        filter: function (x) {
            return STRUCTURE_TOWER === x.structureType;
        }
    });
    for (var i = 0; i < towers.length; ++i) {
        tower.handle(towers[i]);
    }
}

/* hasEnergy returns true if the energy holder h has energy */
hasEnergy = function (holder) {
    /* If we have energy/energyCapacity */
    if (holder.energy !== undefined) {
        return holder.energy !== 0;
    }

    /* Storages, on the other hand, have different names for things */
    return holder.store.energy !== 0;
}

/* Make sure the target t has space for more energy */
canHoldEnergy = function (target) {
    /* If it's a storage, that's easy */
    if (target.storeCapacity !== undefined) {
        return target.storeCapacity > target.store.energy;
    }

    /* Assume towers can hold 20 less than they really can */
    if (target.structureType  !== undefined && target.structureType === STRUCTURE_TOWER) {
        return (target.energyCapacity - 20) > target.energy;
    }
    /* If we have energy/energyCapacity */
    if (target.energyCapacity  !== undefined) {
        /* Adjust for towers */
        return target.energyCapacity > target.energy;
    }
    return false;
}

/* roomEnergyCapacity returns the energy capacity of the Room r, less the
 * spawns. */
roomEnergyCapacity = function (room) {
    /* Known raw energy capacity, for cache invalidation */
    if ((room.energyCapacityAvailable === room.memory.rawecap) && (room.memory.ecap !== undefined)) {
        return room.memory.ecap;
    }

    /* Raw energy capacity */
    var availableEnergyCapacity = room.energyCapacityAvailable;
    room.memory.rawecap = availableEnergyCapacity;
    /* Subtract the capacity from the spawns */
    var spawns = room.find(FIND_MY_SPAWNS);
    for (var i = 0; i < spawns.length; ++i) {
        availableEnergyCapacity -= spawns[i].energyCapacity;
    }

    /* Save that as the effective energy capacity */
    room.memory.ecap = availableEnergyCapacity;
    return availableEnergyCapacity;
}

/* roomHasType returns true if there's already creep of type (role) in
 * Room. */
roomHasType = function (room, creepType) {
    /* Make sure we have storage */
    checkGameCache(room);

    /* See if we know whether we have one */
    if (Game.rcache[room.id].haveType[creepType] !== undefined) {
        var haveResult = Game.rcache[room.id].haveType[creepType];
        if(haveResult === true){
            return true;
        }
    }

    /* Get a list of creept of the type in the room */
    var creeps = room.find(FIND_MY_CREEPS, {
        filter: function (x) {
            return x.memory.role === creepType;
        }
    });

    /* Cache and return whether we have them */
    if (creeps.length === 0) {
        Game.rcache[room.id].haveType[creepType] = false;
        return false;
    }

    Game.rcache[room.id].haveType[creepType] = true;

    return true;
}

/* roomDroppedEnergy returns a list of the dropped energy (Resource objects)
 * in the Room. */
findRoomDroppedEnergy = function (room) {
    /* Make sure we have storage */
    checkGameCache(room);

    /* Use the cached value */
    if (Game.rcache[room.id].denergy !== undefined) {
        return Game.rcache[room.id].denergy;
    }

    /* Find the energy in the room */
    Game.rcache[room.id].denergy = room.find(FIND_DROPPED_RESOURCES,
        {
            filter: function (x) {
                return x.resourceType === RESOURCE_ENERGY;
            }
        }
    );

    return Game.rcache[room.id].denergy;
}

/* findRoomConstructionSites returns a (possibly cached) list of construction
 * sites in the Room r.*/
findRoomConstructionSites = function (room) {
    /* Make sure we have storage */
    checkGameCache(room);

    /* Try to use the cached version */
    if (Game.rcache[room.id].csites !== undefined) {
        return Game.rcache[room.id].csites;
    }
    /* If we don't have it cached, make it */
    Game.rcache[room.id].csites = room.find(FIND_MY_CONSTRUCTION_SITES);
    return Game.rcache[room.id].csites;
}

/* Find bad guys in the Room r. */
findEnemiesInRoom = function (room) {
    /* Make sure we have storage */
    checkGameCache(room);

    /* Try to use the cached version */
    if (Game.rcache[room.id].hcreeps !== undefined) {
        return Game.rcache[room.id].hcreeps;
    }
    /* If we don't have it cached, make it */
    Game.rcache[room.id].hcreeps = room.find(FIND_HOSTILE_CREEPS);
    return Game.rcache[room.id].hcreeps;
}

/* findBrokenInRoom finds an object of FIND_* objectType in Room r with fewer hit
 * points than it ought to have. */
findBrokenInRoom = function (objectType, room) {
    /* If we don't have it cached, get a list of all the creeps and find
     * the one missing the most health */
    var cs = room.find(objectType, {
        filter: function (x) {
            return x.hits < x.hitsMax;
        }
    });
    /* If there's no creeps, note it */
    if (cs.length === 0) {
        return undefined;
    }

    //order broken items to fix so that the structure with the least hits left will be fixed first
    cs.sort(function(a, b) {
        return a.hits > b.hits;
    });

    return cs[0];
}

/* findWoundedCreepInRoom finds a wounded creep in Room r. */
findWoundedCreepInRoom = function (room) {
    /* Make sure we have storage */
    checkGameCache(room);

    /* Try to use the cached version */
    if (Game.rcache[room.id].wcreep !== undefined) {
        return Game.rcache[room.id].wcreep;
    }
    Game.rcache[room.id].wcreep = findBrokenInRoom(FIND_MY_CREEPS, room);
    return Game.rcache[room.id].wcreep;
}

/* findBrokenStructureInRoom finds one of our broken structures in Room r. */
findMyBrokenStructureInRoom = function (room) {
    /* Make sure we have storage */
    checkGameCache(room);

    /* Try to use the cached version */
    if (Game.rcache[room.id].mybstruct !== undefined) {
        return Game.rcache[room.id].mybstruct;
    }
    Game.rcache[room.id].mybstruct = findBrokenInRoom(FIND_MY_STRUCTURES, room);
    return Game.rcache[room.id].mybstruct;
}

/* findABrokenStructureInRoom finds any broken structure in Room r */
findABrokenStructureInRoom = function (room) {
    /* Make sure we have storage */
    checkGameCache(room);

    if (Game.rcache[room.id].structures === undefined) {
        Game.rcache[room.id].structures = room.find(FIND_STRUCTURES);
    }
    /* Try to use the cached version */
    if (Game.rcache[room.id].abstruct !== undefined) {
        return Game.rcache[room.id].abstruct;
    }
    var ab = _.filter(Game.rcache[room.id].structures, function (x) {
        return (x.structureType === STRUCTURE_ROAD) && (x.hits + 200 <= x.hitsMax);
    });
    /* Return the road that needs fixing */
    if (ab.length !== 0) {
        Game.rcache[room.id].abstruct = ab[0];
        return Game.rcache[room.id].abstruct;
    }
    /* Don't return walls or ramparts if we're not at GCL 4 */
    if (room.controller.level < 4) {
        return undefined;
    }
    /* Get all the walls and our ramparts */
    ab = _.filter(Game.rcache[room.id].structures, function (x) {
        return ((x.structureType === STRUCTURE_RAMPART && x.my) || (x.structureType === STRUCTURE_WALL)) && x.hits + 200 <= x.hitsMax;
    });
    /* Give up if there's none */
    if (ab.length === 0) {
        return undefined;
    }
    /* Find the lowest-healthed */
    var mini = 0;
    for (var i = 1; i < ab.length; ++i) {
        if (ab[mini].hits > ab[i].hits) {
            mini = i;
        }
    }
    /* Cache it, return it */
    Game.rcache[room.id].abstruct = ab[mini];
    return ab[mini];
}

/* Find structures of STRUCTURE_* type structureType in Room r */
findStructuresOfTypeInRoom = function (structureType, room) {
    /* Make sure we have storage */
    checkGameCache(room);

    /* If we don't have a cached list, make one */
    if (Game.rcache[room.id].structs[structureType] === undefined) {
        Game.rcache[room.id].structs[structureType] = room.find(FIND_MY_STRUCTURES,
            {
                filter: function (x) {
                    return x.structureType === structureType;
                }
            }
        );
    }
    /* If not, find, cache */
    return Game.rcache[room.id].structs[structureType];
}

/* findSpawnsInRoom finds all the spawns in Room r */
findSpawnsInRoom = function (room) {
    /* Make sure we have storage */
    checkGameCache(room);

    /* Get a list of spawns, if we haven't got them */
    if (Game.rcache[room.id].spawns === undefined) {
        /* Find unspawning spawns */
        Game.rcache[room.id].spawns = room.find(FIND_MY_SPAWNS);
    }

    return Game.rcache[room.id].spawns;
}

checkRoomSetup = function(room){
    //room setup
    if (undefined === roomDefinitions[room.name]) {
        roomDefinitions[room.name] = {};
    }
    if (undefined === roomDefinitions[room.name].harvestersPerSource) {
        roomDefinitions[room.name].harvestersPerSource = 1;
    }
    if (undefined === roomDefinitions[room.name].truck) {
        roomDefinitions[room.name].truck = 1;
    }
    if (undefined === roomDefinitions[room.name].build) {
        roomDefinitions[room.name].build = 1;
    }
}

checkGameCache = function(room){
    /* Make sure we have storage */
    if (Game.rcache === undefined) {
        Game.rcache = {};
    }
    if (Game.rcache[room.id] === undefined) {
        Game.rcache[room.id] = {};
    }
    if (Game.rcache[room.id].structs === undefined) {
        Game.rcache[room.id].structs = {};
    }
    if (Game.rcache[room.id].haveType === undefined) {
        Game.rcache[room.id].haveType = {};
    }
}
