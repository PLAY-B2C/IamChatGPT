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
    version: config.version
  });

  bot.once('spawn', () => {
    console.log(`✅ ${config.username} spawned.`);

    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
      console.log(`🔐 Logged in with /login ${config.password}`);

      setTimeout(() => {
        openTeleportChest();
      }, 2000);
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
        const delay = 300;

        const interval = setInterval(async () => {
          if (attempts <= 0 || !bot.currentWindow) {
            clearInterval(interval);
            console.log(`✅ Finished clicking or window closed.`);
            bot.closeWindow(bot.currentWindow);
            beginBreakingRoutine();
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
        }, delay);
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error during chest interaction:', err.message);
  }
}

function beginBreakingRoutine() {
  console.log('🕒 Waiting 10 seconds before starting breaking...');
  setTimeout(() => {
    holdLeftClick();
    startStrafing();
    monitorInventory();
  }, 10000);
}

function holdLeftClick() {
  bot.setControlState('attack', true);
  console.log('🪓 Holding left click to break blocks...');
}

function startStrafing() {
  let movingLeft = true;

  function strafe() {
    bot.setControlState('left', movingLeft);
    bot.setControlState('right', !movingLeft);

    console.log(`🚶 Strafing ${movingLeft ? 'left' : 'right'} for 40s...`);

    setTimeout(() => {
      bot.setControlState('left', false);
      bot.setControlState('right', false);
      movingLeft = !movingLeft;
      strafe();
    }, 40000);
  }

  strafe();
}

function monitorInventory() {
  setInterval(() => {
    const full = bot.inventory.items().length >= bot.inventory.slots.length - 9;
    if (full) {
      console.log('📦 Inventory is full!');
    }
  }, 5000);
}

startBot();
