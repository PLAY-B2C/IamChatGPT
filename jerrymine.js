const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals: { GoalBlock } } = require('mineflayer-pathfinder');
const Vec3 = require('vec3');

let triedPositions = new Set();

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565, // default port
    username: 'DrakonTide',
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Bot spawned');
    bot.chat('/login 3043AA');

    setTimeout(() => {
      goToIceArea(bot);
    }, 3000);
  });

  bot.on('error', (err) => console.log('❌ Bot error:', err.message));

  bot.on('end', () => {
    console.log('🔁 Bot disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });

  // ✅ Only log when chat says "You found"
  bot.on('chat', (username, message) => {
    if (message.includes("You found")) {
      console.log(`🎉 Game message: ${message}`);
    }
  });
}

createBot();

function goToIceArea(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.canDig = false;
  movements.allow1by1towers = false;
  movements.jumpHeight = 2.5;
  movements.allowParkour = true;
  movements.canJump = true;
  movements.allowFreeMotion = true;

  bot.pathfinder.setMovements(movements);

  const waypoints = [new Vec3(1, 76, 58), new Vec3(40, 76, 55)];
  let currentWaypoint = 0;

  function goNextWaypoint() {
    if (currentWaypoint >= waypoints.length) {
      console.log('📍 Reached mining area. Scanning for ice...');
      scanAndMineNearbyIce(bot);
      return;
    }

    const target = waypoints[currentWaypoint++];
    bot.pathfinder.setGoal(new GoalBlock(target.x, target.y, target.z));

    bot.once('goal_reached', () => {
      console.log(`✅ Reached waypoint: ${target}`);
      setTimeout(goNextWaypoint, 300);
    });
  }

  goNextWaypoint();
}

function scanAndMineNearbyIce(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const range = 10;
  const origin = bot.entity.position.floored();

  let found = null;

  for (let dx = -range; dx <= range; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      for (let dz = -range; dz <= range; dz++) {
        const pos = origin.offset(dx, dy, dz);
        const key = `${pos.x},${pos.y},${pos.z}`;
        if (triedPositions.has(key)) continue;

        const block = bot.blockAt(pos);
        if (!block || !block.name.includes('ice')) continue;
        if (pos.y > bot.entity.position.y + 1.5) continue;

        const distance = bot.entity.position.distanceTo(pos);
        if (!found || distance < bot.entity.position.distanceTo(found)) {
          found = pos;
        }
      }
    }
  }

  if (!found) {
    console.log('❌ No reachable ice blocks nearby.');
    setTimeout(() => scanAndMineNearbyIce(bot), 3000);
    return;
  }

  const goal = new GoalBlock(found.x, found.y, found.z);
  bot.pathfinder.setGoal(goal);

  const key = `${found.x},${found.y},${found.z}`;
  const startTime = Date.now();

  const stuckCheck = setInterval(() => {
    if (Date.now() - startTime > 5000) {
      console.log('⚠️ Stuck while reaching ice. Skipping...');
      bot.pathfinder.setGoal(null);
      clearInterval(stuckCheck);
      triedPositions.add(key);
      scanAndMineNearbyIce(bot);
    }
  }, 1000);

  bot.once('goal_reached', async () => {
    clearInterval(stuckCheck);
    const block = bot.blockAt(found);
    if (!block || !block.name.includes('ice')) {
      console.log('❌ Ice block disappeared or invalid.');
      triedPositions.add(key);
      scanAndMineNearbyIce(bot);
      return;
    }

    await bot.lookAt(block.position.offset(0.5, 0.5, 0.5));

    // Equip best pickaxe
    const pickaxe = bot.inventory.items().find(i =>
      i.name.includes('netherite_pickaxe') || i.name.includes('diamond_pickaxe') || i.name.includes('iron_pickaxe') || i.name.includes('stone_pickaxe') || i.name.includes('wooden_pickaxe')
    );

    if (pickaxe) {
      try {
        await bot.equip(pickaxe, 'hand');
        console.log('🪓 Equipped best pickaxe.');
      } catch (err) {
        console.log('❌ Failed to equip pickaxe:', err.message);
      }
    } else {
      console.log('⚠️ No pickaxe in inventory. Mining with hand.');
    }

    bot.swingArm('right', true);
    setTimeout(() => {
      const stillThere = bot.blockAt(found);
      if (!stillThere || !stillThere.name.includes('ice')) {
        triedPositions.add(key);
      }
      scanAndMineNearbyIce(bot);
    }, 1500);
  });
}
