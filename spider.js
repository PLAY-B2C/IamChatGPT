const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');

let reconnecting = false;

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DrakonTide',
    version: '1.16.5',
  });

  bot.loadPlugin(pathfinder);

  let waypoints = [
    new Vec3(-233, 80, -244),
    new Vec3(-261, 86, -237),
    new Vec3(-281, 95, -233),
    new Vec3(-292, 95, -211),
    new Vec3(-315, 96, -191),
    new Vec3(-331, 81, -228),
    new Vec3(-347, 79, -236),
    new Vec3(-360, 72, -256),
    new Vec3(-357, 67, -270),
    new Vec3(-333, 60, -276),
    new Vec3(-322, 57, -280),
    new Vec3(-300, 45, -273),
    new Vec3(-291, 45, -278),
    new Vec3(-284, 44, -250),
    new Vec3(-271, 44, -238),
    new Vec3(-273, 44, -224),
    new Vec3(-292, 43, -228),
    new Vec3(-326, 44, -224),
    new Vec3(-336, 44, -236),
    new Vec3(-326, 42, -252),
    new Vec3(-313, 43, -234),
    new Vec3(-288, 44, -259),
    new Vec3(-300, 45, -273)
  ];

  let patrolIndex = 0;
  let mcData;

  bot.once('spawn', async () => {
    console.log('✅ Logged in');
    bot.chat('/login 3043AA');
    bot.settings.viewDistance = 'far';

    await bot.waitForTicks(20);
    bot.activateItem();

    bot.once('windowOpen', async (window) => {
      await bot.waitForTicks(30);
      const slotIndex = 20;
      const slot = window.slots[slotIndex];

      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1);
        } catch (err) {
          console.log('❌ Click error:', err.message);
        }
      }

      setTimeout(() => {
        bot.chat('/warp spider');
        setTimeout(() => {
          mcData = require('minecraft-data')(bot.version);
          startFlowerPatrol(bot);
        }, 8000);
      }, 2000);
    });
  });

  bot.on('end', () => {
    if (reconnecting) return;
    reconnecting = true;
    console.log('🔁 Disconnected, retrying in 10s...');
    setTimeout(() => {
      reconnecting = false;
      createBot();
    }, 10000);
  });

  bot.on('death', () => {
    console.log('💀 Bot died. Restarting patrol from nearest point...');
    patrolIndex = findNearestWaypointIndex(bot.entity.position);
    moveToNext(bot);
  });

  function setupMovement(bot) {
    const movements = new Movements(bot, mcData);
    movements.maxStepHeight = 2.5;
    movements.canDig = false;
    movements.allowSprinting = true;
    movements.allowParkour = true;
    movements.allow1by1towers = true;
    movements.scafoldingBlocks = [];

    movements.sprintSpeed = 0.45; // ~345% boosted sprint
    bot.pathfinder.setMovements(movements);
  }

  function findNearestWaypointIndex(pos) {
    let nearest = 0;
    let minDist = Infinity;
    waypoints.forEach((wp, i) => {
      const dist = wp.distanceTo(pos);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    });
    return nearest;
  }

  function moveToNext(bot) {
    if (!bot || !bot.entity || !bot.entity.position) return;

    if (patrolIndex >= waypoints.length) patrolIndex = 0;

    const point = waypoints[patrolIndex];
    console.log(`➡️ Moving to [${patrolIndex}]: ${point.x} ${point.y} ${point.z}`);
    bot.pathfinder.setGoal(new goals.GoalNear(point.x, point.y, point.z, 1));

    const startTime = Date.now();

    const check = setInterval(() => {
      if (!bot || !bot.entity) {
        clearInterval(check);
        return;
      }

      const dist = bot.entity.position.distanceTo(point);

      if (dist < 2) {
        clearInterval(check);
        patrolIndex++;
        setTimeout(() => moveToNext(bot), 300);
      }

      // Timeout if stuck >10 seconds
      if (Date.now() - startTime > 10000) {
        console.log(`⏱️ Stuck at waypoint, retrying`);
        bot.pathfinder.setGoal(null);
        setTimeout(() => moveToNext(bot), 500);
        clearInterval(check);
      }
    }, 500);
  }

  function startFlowerPatrol(bot) {
    setupMovement(bot);
    patrolIndex = findNearestWaypointIndex(bot.entity.position);
    moveToNext(bot);

    // Auto fire flower every 300ms
    setInterval(() => {
      bot.setQuickBarSlot(0);
      bot.activateItem();
    }, 300);
  }

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });

  bot.on('path_reset', (reason) => {
    console.log('⚠️ Path reset:', reason);
    if (reason.includes('chunk')) {
      console.log('🔄 Retrying current waypoint after chunk fail...');
      setTimeout(() => moveToNext(bot), 1000);
    }
  });
}

createBot();
