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
        console.log(`📦 Chest opened. Listing all slots:`);

        window.slots.forEach((slot, index) => {
          if (slot) {
            console.log(`🔍 Slot ${index}: ${slot.name} x${slot.count}`);
          }
        });

        // Optional: click slot if you know the correct one
        const slotToClick = 21; // Change this after checking logs
        const slot = window.slots[slotToClick];

        if (slot) {
          try {
            await bot.clickWindow(slotToClick, 0, 1); // shift-click
            console.log(`👉 Shift-clicked slot ${slotToClick}`);
          } catch (err) {
            console.error(`⚠️ Failed to click slot ${slotToClick}:`, err.message);
          }
        } else {
          console.log(`❌ Slot ${slotToClick} is empty or undefined.`);
        }
      });
    }, 1500);
  } catch (err) {
    console.error('❌ Error during chest interaction:', err.message);
  }
}

startBot();
