var geo = require('geo');

/* fillUpEnergy fills up Creep's energy tanks at the storage, if there is
 * one, or the nearest energy holder. */
Creep.prototype.fillUpEnergy = function () {
    /* Don't fill up if there's not a truck and a harvester */
    if (!roomHasType(this.room, "truck") || !roomHasType(this.room, "harvester")) {
        return undefined;
    }

    var transferFromStorage = true;

    /* Get the energy holder target */
    if (this.memory.fillTargetID === undefined) {
        /* Use the storage if we have one and it has energy. */
        if (this.room.storage !== undefined && this.room.storage.store.energy !== 0) {
            this.memory.fillTargetID = this.room.storage.id;
            /* If we haven't a storage, use the closest spawn with energy
             * in it. */
        } else {
            holder = this.pos.findClosestByPath(FIND_MY_SPAWNS,
                {
                    filter: function (x) {
                        return 0 !== x.energy;
                    }
                }
            )

            transferFromStorage = false;

            if (holder === null) {
                return undefined;
            }

            this.memory.fillTargetID = holder.id;
        }
    }

    /* Get hold of the current holder object */
    holder = Game.getObjectById(this.memory.fillTargetID);

    /* Try again next tick if the holder disappeared or if it has no
     * energy left. */
    if (holder === null || !hasEnergy(holder)) {
        this.memory.fillTargetID = undefined;
        return undefined;
    }

    /* If we're not in range, move to it */
    if (!this.pos.isNearTo(holder)) {
        return geo.move(this, holder);
    }

    /* Try to collect some energy */
    this.memory.fillTargetID = undefined;

    var transferResult = -1;
    if(transferFromStorage == true && holder.structureType != STRUCTURE_SPAWN){
        transferResult = holder.transfer(this, RESOURCE_ENERGY);
    } else {
        transferResult = holder.transferEnergy(this);
    }

    return transferResult;
}

/* findNearestConstructionSiteID gets the ID of the nearest construction site
 * to Creep. */
Creep.prototype.findNearestConstructionSiteID = function () {
    var nc = this.pos.findClosestByPath(findRoomConstructionSites(this.room));
    if (nc !== null) {
        return nc.id;
    }
    return undefined;
}

/* upgradeController has Creep upgrade its rooms controller */
Creep.prototype.moveOrUpgradeController = function () {
    /* Move to the controller if we're not there already */
    if (!this.pos.isNearTo(this.room.controller)) {
        return geo.move(this, this.room.controller);
    }

    /* Try to upgrade */
    return this.upgradeController(this.room.controller);
}
