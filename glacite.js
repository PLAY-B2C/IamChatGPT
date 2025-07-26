const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const botConfig = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  loginCommand: '/login 3043AA',
  warpCommand: '/warp dwarven',
  glaciteCenter: new Vec3(0, 128, 160),
  targetMobNames: ['Glacite', 'Glacite Protector'],
  waypoints: [
    new Vec3(66, 200, -104),
    new Vec3(140, 187, 14),
    new Vec3(110, 154, 42),
    new Vec3(63, 133, 33),
    new Vec3(6, 128, 55),
    new Vec3(-55, 168, -26),
    new Vec3(0, 128, 160),
  ]
};

let patrolIndex = 0;
let reachedGlacite = false;

function createBot() {
  const bot = mineflayer.createBot({
    host: botConfig.host,
    username: botConfig.username,
    version: botConfig.version,
    keepAlive: true,
    connectTimeout: 60000,
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log('✅ Spawned. Logging in...');
    setTimeout(() => {
      bot.chat(botConfig.loginCommand);
      setTimeout(() => useTeleportGUI(bot), 2000);
    }, 2000);
  });

  bot.on('death', () => {
    console.log('☠️ Bot died. Restarting patrol...');
    patrolIndex = 0;
    reachedGlacite = false;
    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    console.log('🔁 Disconnected. Reconnecting in 10s...');
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    console.log('❌ Error:', err.message);
  });
}

function useTeleportGUI(bot) {
  bot.setQuickBarSlot(0);
  bot.activateItem();

  bot.once('windowOpen', async window => {
    await bot.waitForTicks(30);
    const slot = window.slots[20]; // 21st slot (index 20)

    if (slot && slot.name !== 'air') {
      try {
        await bot.clickWindow(20, 0, 1); // shift-click
        console.log('🎯 Clicked teleport item.');
      } catch (err) {
        console.log('❌ GUI click error:', err.message);
      }
    }

    setTimeout(() => {
      bot.chat(botConfig.warpCommand);
      setTimeout(() => startPatrol(bot), 8000);
    }, 2000);
  });
}

function startPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.allowParkour = true;
  movements.canDig = false;
  bot.pathfinder.setMovements(movements);

  const moveToNext = () => {
    if (patrolIndex >= botConfig.waypoints.length) {
      patrolIndex = botConfig.waypoints.length - 1;
    }

    const target = botConfig.waypoints[patrolIndex];
    bot.pathfinder.setGoal(new GoalNear(target.x, target.y, target.z, 1));

    const interval = setInterval(() => {
      const dist = bot.entity.position.distanceTo(target);
      if (dist < 2) {
        clearInterval(interval);
        console.log(`📍 Reached waypoint ${patrolIndex}`);
        if (patrolIndex === botConfig.waypoints.length - 1) {
          reachedGlacite = true;
          console.log('🌟 Arrived at Glacite. Starting engagement...');
          startRandomWander(bot);
          startRightClickLoop(bot);
          startCombatLoop(bot);
        } else {
          patrolIndex++;
          setTimeout(moveToNext, 500);
        }
      } else if (!bot.pathfinder.isMoving()) {
        console.log(`⚠️ Stuck at waypoint ${patrolIndex}, skipping...`);
        clearInterval(interval);
        patrolIndex++;
        setTimeout(moveToNext, 500);
      }
    }, 500);
  };

  moveToNext();
}

function startRandomWander(bot) {
  const wander = () => {
    const offsetX = Math.floor(Math.random() * 25) - 12;
    const offsetZ = Math.floor(Math.random() * 25) - 12;
    const target = botConfig.glaciteCenter.offset(offsetX, 0, offsetZ);
    const y = bot.blockAt(target)?.position.y || botConfig.glaciteCenter.y;

    bot.pathfinder.setGoal(new GoalNear(target.x, y, target.z, 1));

    setTimeout(wander, 5000 + Math.random() * 3000);
  };

  wander();
}

function startRightClickLoop(bot) {
  setInterval(() => {
    if (reachedGlacite && bot.entity?.health > 0) {
      try {
        bot.setQuickBarSlot(0);
        bot.activateItem();
      } catch (err) {
        console.log('⚠️ Right click failed:', err.message);
      }
    }
  }, 300);
}

function startCombatLoop(bot) {
  setInterval(() => {
    if (!reachedGlacite || bot.entity?.health <= 0) return;

    const target = bot.nearestEntity(e =>
      e.type === 'mob' &&
      e.name &&
      botConfig.targetMobNames.some(name =>
        e.name.toLowerCase().includes(name.toLowerCase())
      )
    );

    if (target) {
      bot.lookAt(target.position.offset(0, target.height, 0), true, () => {
        if (bot.canSeeEntity(target)) {
          bot.attack(target);
        }
      });
    }
  }, 250);
}

createBot();
