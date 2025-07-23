const mineflayer = require('mineflayer');
const { setTimeout } = require('timers');

let reconnecting = false;

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    username: 'DeakonTide',
    version: '1.16.5',
  });

  bot.once('spawn', async () => {
    console.log('✅ Logged in, locking view');

    // Log in to the server
    bot.chat('/login 3043AA');

    // Wait 1s then right-click the held item to open a menu
    await bot.waitForTicks(20);
    bot.activateItem();
    console.log('🖱️ Right-clicked item to open menu');

    // Wait for a window (GUI) to open
    bot.once('windowOpen', async (window) => {
      console.log('📦 Window opened');

      // Wait 1.5s for items to fully load
      await bot.waitForTicks(30);

      const slotIndex = 20; // Slot 21 is index 20
      const slot = window.slots[slotIndex];

      if (slot && slot.name !== 'air') {
        try {
          await bot.clickWindow(slotIndex, 0, 1); // Shift-click the item
          console.log('✅ Shift-clicked slot 21');
        } catch (err) {
          console.log('❌ Click error:', err.message);
        }
      } else {
        console.log('⚠️ Slot 21 is empty or not loaded');
      }

      // Warp to island after short delay
      setTimeout(() => {
        bot.chat('/warp is');
        bot.chat('/warp is');
        console.log('💬 Sent /warp is x2');
      }, 2000);

      // Start mining and strafing after warp finishes
      setTimeout(() => {
        console.log('⛏️ Starting dig + strafe loop');
        holdLeftClickForever(bot);
        startStrafing(bot);
      }, 10000);
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

  bot.on('error', (err) => {
    console.log('❌ Bot error:', err.message);
  });
}

// Function to hold left-click continuously (dig)
function holdLeftClickForever(bot) {
  try {
    bot.setControlState('swing', true); // This simulates holding left-click
  } catch (e) {
    console.log('⛏️ Digging error:', e.message);
  }
}

// Function to alternate strafing every 45 seconds
function startStrafing(bot) {
  let strafeLeft = true;

  bot.setControlState('left', true);

  setInterval(() => {
    strafeLeft = !strafeLeft;
    bot.setControlState('left', strafeLeft);
    bot.setControlState('right', !strafeLeft);
  }, 45000);
}

// Start the bot
createBot();
