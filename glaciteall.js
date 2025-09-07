const mineflayer = require('mineflayer');
const Vec3 = require('vec3');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalNear } = goals;

const originalWarn = console.warn;
console.warn = (msg, ...args) => {
  if (typeof msg === 'string' && msg.includes('objectType is deprecated')) return;
  originalWarn(msg, ...args);
};

// ---- BOT CONFIGS ----
const botConfigs = [
  {
    username: 'B2C',
    loginCommand: '/login 3043AA',
    warpCommand: '/warp dwarven'
  },
  {
    username: 'JamaaLcaliph',
    loginCommand: '/login 3043AA',
    warpCommand: '/warp dwarven'
  }
];

const sharedSettings = {
  host: 'mc.fakepixel.fun',
  version: '1.16.5',
  glaciteCenter: new Vec3(0, 128, 160),
  waypoints: [
    new Vec3(66, 200, -104),
    new Vec3(70, 198, -88),
    new Vec3(-17, 177, -55),
    new Vec3(-53, 165, -40),
    new Vec3(-54, 168, -22),
    new Vec3(-53, 147, -12),
    new Vec3(-51, 137, 17),
    new Vec3(-28, 131, 31),
    new Vec3(-7, 128, 59),
    new Vec3(0, 128, 160)
  ]
};

// ---- CREATE BOT ----
function createBot(config) {
  const bot = mineflayer.createBot({
    host: sharedSettings.host,
    username: config.username,
    version: sharedSettings.version,
    connectTimeout: 0,               // no TCP connection timeout
    checkTimeoutInterval: 86400000   // 24h watchdog timeout
  });

  let patrolIndex = 0;
  let reachedGlacite = false;

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log(`✅ ${config.username} spawned`);
    patrolIndex = 0;
    reachedGlacite = false;
    bot.manualQuit = false;

    setTimeout(() => {
      bot.chat(config.loginCommand);
      setTimeout(() => openTeleportGUI(bot, config), 2000);
    }, 2000);
  });

  bot.on('death', () => {
    console.log(`☠️ ${config.username} died. Restarting patrol...`);
    patrolIndex = 0;
    reachedGlacite = false;
    setTimeout(() => {
      bot.chat(config.warpCommand);
      setTimeout(() => startPatrol(bot, config), 8000);
    }, 2000);
  });

  bot.on('end', () => {
    if (!bot.manualQuit) {
      console.log(`🔁 ${config.username} disconnected. Reconnecting in 10s...`);
      setTimeout(() => {
        createBot(config);
      }, 10000);
    } else {
      console.log(`🛑 ${config.username} quit manually. No reconnect.`);
    }
  });

  bot.on('error', err => {
    console.log(`❌ ${config.username} error:`, err.message);
  });

  function openTeleportGUI(bot, config) {
    bot.setQuickBarSlot(0);
    bot.activateItem();
    bot.once('windowOpen', async window => {
      await bot.waitForTicks(20);
      const slot = window.slots[20];
      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(20, 0, 1);
          console.log(`🎯 ${config.username} clicked teleport item.`);
        } catch (err) {
          console.log(`❌ ${config.username} GUI click error:`, err.message);
        }
      }
      setTimeout(() => {
        bot.chat(config.warpCommand);
        setTimeout(() => startPatrol(bot, config), 8000);
      }, 2000);
    });
  }

  function startPatrol(bot, config) {
    const mcData = require('minecraft-data')(bot.version);
    const movements = new Movements(bot, mcData);
    movements.maxDropDown = 10;
    movements.allowParkour = true;
    movements.canDig = false;
    bot.pathfinder.setMovements(movements);

    let retryCount = 0;
    const maxRetries = 3;

    function moveToNext() {
      if (patrolIndex >= sharedSettings.waypoints.length)
        patrolIndex = sharedSettings.waypoints.length - 1;

      const target = sharedSettings.waypoints[patrolIndex];
      bot.pathfinder.setGoal(new GoalNear(target.x, target.y - 3, target.z, 1));

      const interval = setInterval(() => {
        const distXZ = Math.hypot(
          bot.entity.position.x - target.x,
          bot.entity.position.z - target.z
        );
        if (distXZ < 2) {
          clearInterval(interval);
          retryCount = 0;
          console.log(`📍 ${config.username} reached waypoint ${patrolIndex}`);
          if (patrolIndex === sharedSettings.waypoints.length - 1) {
            console.log(`🌟 ${config.username} reached Glacite. Executing final right-click...`);
            afterReachingGlacite(bot);
          } else {
            patrolIndex++;
            setTimeout(moveToNext, 600);
          }
        } else if (!bot.pathfinder.isMoving()) {
          clearInterval(interval);
          retryCount++;
          if (retryCount <= maxRetries) {
            console.log(`🔁 ${config.username} retry ${retryCount}/${maxRetries} for waypoint ${patrolIndex}`);
            setTimeout(moveToNext, 800);
          } else {
            console.log(`⚠️ ${config.username} stuck at waypoint ${patrolIndex}. Finding next nearest...`);
            patrolIndex = getNextNearestWaypointIndex(bot, patrolIndex + 1);
            retryCount = 0;
            setTimeout(moveToNext, 800);
          }
        }
      }, 500);
    }

    moveToNext();
  }

  function getNextNearestWaypointIndex(bot, minIndex = 0) {
    const pos = bot.entity.position;
    let nearestIndex = minIndex;
    let minDist = Infinity;
    for (let i = minIndex; i < sharedSettings.waypoints.length; i++) {
      const wp = sharedSettings.waypoints[i];
      const dist = pos.distanceTo(wp);
      if (dist < minDist) {
        minDist = dist;
        nearestIndex = i;
      }
    }
    return nearestIndex;
  }

  function afterReachingGlacite(bot) {
    reachedGlacite = true;
    bot.setQuickBarSlot(2);
    bot.activateItem();

    setTimeout(() => {
      bot.setQuickBarSlot(0);
      bot.clearControlStates();
      console.log(`🧍 ${config.username} holding slot 0 and standing still.`);
    }, 1000);
  }

  // ---- CHAT TRIGGER HANDLER ----
  bot.on('message', (jsonMsg) => {
    if (!reachedGlacite) return;
    const msg = jsonMsg.toString().toLowerCase();

    if (
      msg.includes(config.username.toLowerCase()) ||
      msg.includes('this server will restart') ||
      msg.includes('you were killed by')
    ) {
      console.log(`📨 ${config.username} trigger phrase detected. Disconnecting in 5s...`);
      setTimeout(() => {
        bot.quit(); // auto-reconnect, since manualQuit not set
      }, 5000);
    }
  });

  // ---- OPTIONAL: MANUAL QUIT FUNCTION ----
  bot.quitBot = function () {
    bot.manualQuit = true; // prevents reconnect
    bot.quit();
  };
}

// ---- RUN BOTH BOTS WITH 30s GAP ----
createBot(botConfigs[0]);
setTimeout(() => createBot(botConfigs[1]), 30000);
