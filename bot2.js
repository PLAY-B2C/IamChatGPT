const mineflayer = require('mineflayer');

const config = {
  host: 'mc.fakepixel.fun',
  username: 'DrakonTide',
  version: '1.16.5',
  password: '3043AA'
};

let bot;

function startBot() {
  bot = mineflayer.createBot({
    host: config.host,
    username: config.username,
    version: config.version,
  });

  bot.once('spawn', async () => {
    console.log(`✅ ${config.username} spawned.`);

    // Login
    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
      console.log(`🔐 Logged in with /login ${config.password}`);

      setTimeout(openTeleportChest, 2000);
    }, 1000);
  });

  bot.on('error', err => {
    console.log(`❌ ${config.username} error:`, err);
  });

  bot.on('end', () => {
    console.log(`🔁 ${config.username} disconnected. Reconnecting in 10s...`);
    setTimeout(startBot, 10000);
  });
}

function openTeleportChest() {
  try {
    bot.setQuickBarSlot(0); // Select slot 1
    setTimeout(() => {
      bot.activateItem(); // Right-click with item
      console.log(`🧤 Attempted to open chest with held item`);

      bot.once('windowOpen', async (window) => {
        console.log(`📦 Chest opened. Spamming shift-click on slot 21...`);

        const slotToClick = 20;
        let attempts = 1;

        const interval = setInterval(async () => {
          if (attempts <= 0 || !bot.currentWindow) {
            clearInterval(interval);
            console.log(`✅ Finished clicking or window closed.`);
            startPostTeleportBehavior();
            return;
          }

          const slot = bot.currentWindow.slots[slotToClick];
          if (slot) {
            try {
              await bot.clickWindow(slotToClick, 0, 1); // shift-click
              console.log(`👉 Shift-clicked slot 21`);
            } catch (err) {
              console.error(`⚠️ Failed to click slot 21:`, err.message);
            }
          } else {
            console.log(`❌ Slot 21 is empty or undefined.`);
          }

          attempts--;
        }, 300);
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error during chest interaction:', err.message);
  }
}

// ✅ Post-teleport behaviors
function startPostTeleportBehavior() {
  console.log(`⏳ Waiting 10 seconds before starting post-teleport behavior...`);
  setTimeout(() => {
    console.log(`🎯 Maintaining current view direction`);
    startConstantDigging(); // ✅ Just hold left click and let blocks break
    loopStrafe();
  }, 10000);
}

// ✅ Constant left-click hold simulation
function startConstantDigging() {
  console.log(`👊 Simulating constant left click to break blocks`);

  const digLoop = () => {
    const block = bot.blockAtCursor(4);
    if (block && bot.canDigBlock(block) && !bot.targetDigBlock) {
      bot.dig(block).catch(() => {});
    }
  };

  setInterval(digLoop, 200); // Check every 200ms
}

// ✅ Strafe left/right forever (35s each)
function loopStrafe() {
  console.log(`🚶 Starting strafe loop...`);

  function strafe(direction, duration, callback) {
    bot.setControlState(direction, true);
    console.log(`↔️ Strafing ${direction} for ${duration / 1000}s`);

    setTimeout(() => {
      bot.setControlState(direction, false);
      callback();
    }, duration);
  }

  function strafeLoop() {
    strafe('left', 35000, () => {
      strafe('right', 35000, () => {
        strafeLoop(); // Repeat forever
      });
    });
  }

  strafeLoop();
}

startBot();
