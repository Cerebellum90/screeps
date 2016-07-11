/**
 * require("stats").COMMAND
 */
module.exports = {

    log:function(){

        console.log("- INFO -");
        console.log("> Flags        " + _.size(Game.flags));
        console.log("> Rooms        " + _.size(Game.rooms));
        console.log("> Spawns       " + _.size(Game.spawns));
        console.log("> Structures   " + _.size(Game.structures));
        console.log("> Creeps       " + _.size(Game.creeps));
        console.log("> Time         " + Game.time);
        console.log("> GCL          Level " + Game.gcl.level + " Progress " + (Game.gcl.progressTotal-Game.gcl.progress) );

        if((Game.time % (60 * 60)) == 0){
            Game.notify("> Creeps       " + _.size(Game.creeps));
            Game.notify("> GCL          Level " + Game.gcl.level + " Progress " + (Game.gcl.progressTotal-Game.gcl.progress));
        }

        console.log("-----");
    },

};
