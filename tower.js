module.exports = {
    handle: function(t) {
        var minTowerEnergy = 10; /* Minimum energy for a tower to be useful */

        /* If the tower hasn't enough energy, give up */
        if (t.energy < minTowerEnergy) {
            return undefined;
        }

        /* Make sure there's memory for the tower */
        if (Memory.towers === undefined) {
            Memory.towers = {};
        }
        /* Make sure there's memory for this tower */
        if (Memory.towers[t.id] === undefined) {
            Memory.towers[t.id] = {};
        }

        /* Attack/heal/repair target */
        var tgt;

        /* If we have an attack target ID, attack it */
        if (Memory.towers[t.id].attackID !== undefined) {
            /* Try to get the saved target */
            tgt = Game.getObjectById(Memory.towers[t.id].attackID);
            if (tgt !== null) {
                return t.attack(tgt);
            }
            /* If it doesn't exist any more, find another target */
            Memory.towers[t.id].attackID = undefined;
        }

        /* See if there's any bad guys in the room */
        tgt = t.pos.findClosestByRange(findEnemiesInRoom(t.room));
        /* If so, attack and save for next tick */
        if (tgt !== null) {
            console.log('Tower attacking');
            Memory.towers[t.id] = tgt.id;
            return t.attack(tgt);
        }

        /* See if we've get anything of our own saved to fix */
        if (Memory.towers[t.id].myRepairID !== undefined) {
            /* Get the structure to heal */
            tgt = Game.getObjectById(Memory.towers[t.id].myRepairID);

            /* If it's still broke, fix it */
            if (tgt !== undefined && tgt !== null && tgt.hits < tgt.hitsMax) {
                return t.repair(tgt);
            }
            /* If not, note it and try something else */
            Memory.towers[t.id].myRepairID = undefined;
        }

        /* See if there's anything else we own to fix */
        tgt = findMyBrokenStructureInRoom(t.room);
        if (tgt !== undefined) {
            Memory.towers[t.id].myRepairID = tgt.id;
            return t.repair(tgt);
        }

        /* See if we've got anything saved to heal */
        if (Memory.towers[t.id].healID !== undefined) {
            /* Get the creep to heal */
            tgt = Game.getObjectById(Memory.towers[t.id].healID);
            if (tgt !== undefined && tgt.hits < tgt.hitsMax) {
                console.log('Tower healing 1');
                return t.heal(tgt);
            }
            Memory.towers[t.id].healID = undefined;
        }

        /* See if there's anything that needs healing */
        tgt = findWoundedCreepInRoom(t.room);
        if (tgt !== undefined) {
            Memory.towers[t.id].healID = tgt.id;
            console.log('Tower healing 2');
            return t.heal(tgt);
        }

        /* See if there's anything else to fix */
        tgt = findABrokenStructureInRoom(t.room);
        if (tgt !== undefined) {
            return t.repair(tgt);
        }

        return undefined;
    }
};
