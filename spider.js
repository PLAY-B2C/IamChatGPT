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

  bot.once('spawn', async () => {
    console.log('✅ Logged in');
    bot.chat('/login 3043AA');

    await bot.waitForTicks(20);
    bot.activateItem(); // Right-click to open GUI

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
          startFlowerPatrol(bot);
        }, 8000);
      }, 2000);
    });
  });

  bot.on('death', () => {
    console.log('💀 Bot died. Restarting patrol in 10 seconds...');
    setTimeout(() => {
      bot.chat('/warp spider');
      setTimeout(() => {
        startFlowerPatrol(bot);
      }, 8000);
    }, 10000);
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

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

function startFlowerPatrol(bot) {
  const mcData = require('minecraft-data')(bot.version);
  const movements = new Movements(bot, mcData);
  movements.maxStepHeight = 2.5;
  movements.canDig = false;
  movements.allowSprinting = true;
  movements.allowParkour = true;

  // 🏃 Boost movement speed (345% = 3.45x vanilla)
  movements.walkSpeed *= 3.45;
  movements.sprintSpeed *= 3.45;

  bot.pathfinder.setMovements(movements);

  const waypoints = [
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
    new Vec3(-300, 45, -273),
  ];

  let index = 0;

  function moveToNext() {
    if (index >= waypoints.length) index = 0;

    const point = waypoints[index];
    bot.pathfinder.setGoal(new goals.GoalNear(point.x, point.y, point.z, 2)); // Radius 2

    const checkInterval = setInterval(() => {
      if (bot.entity.position.distanceTo(point) < 2.5) {
        clearInterval(checkInterval);
        index++;
        setTimeout(moveToNext, 300);
      }
    }, 500);
  }

  moveToNext();

  // 🌼 Flower shooting (every 300ms)
  setInterval(() => {
    bot.setQuickBarSlot(0);
    bot.activateItem();
  }, 300);

  // 🚨 Stuck detection
  let lastPos = null;
  setInterval(() => {
    const pos = bot.entity.position;
    if (lastPos && pos.distanceTo(lastPos) < 0.5) {
      console.log('⚠️ Bot might be stuck. Rebooting patrol.');
      bot.chat('/warp spider');
      setTimeout(() => startFlowerPatrol(bot), 8000);
    }
    lastPos = pos;
  }, 15000);
}

createBot();
