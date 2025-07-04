const mineflayer = require('mineflayer');

function createBot() {
  const bot = mineflayer.createBot({
    host: 'EternxlsSMP.aternos.me',
    port: 48918,
    username: 'IamChatGPT',
    auth: 'offline',
    version: false
  });

  bot.once('spawn', () => {
    console.log('✅ Joined server');
    setTimeout(() => {
      bot.chat('/login 3043AA');
      startFishing(bot);
    }, 3000);
  });

  bot.on('kicked', (reason) => {
    console.log('❌ Kicked:', reason);
    reconnect();
  });

  bot.on('end', () => {
    console.log('🔌 Disconnected.');
    reconnect();
  });

  bot.on('error', (err) => {
    console.log('⚠️ Error:', err.message);
    reconnect();
  });
}

function reconnect() {
  setTimeout(() => {
    console.log('🔁 Reconnecting...');
    createBot();
  }, 5000);
}

function startFishing(bot) {
  const rod = bot.inventory.items().find(i => i.name.includes('fishing_rod'));
  if (!rod) {
    console.log('❌ No fishing rod found.');
    return;
  }

  bot.equip(rod, 'hand').then(() => {
    cast(bot);
  }).catch(err => console.log('❌ Equip error:', err));
}

function cast(bot) {
  bot.activateItem(); // Cast
  bot.once('soundEffectHeard', (sound) => {
    if (sound?.soundName?.includes('entity.fishing_bobber.splash')) {
      bot.deactivateItem(); // Reel in
      setTimeout(() => cast(bot), 1000); // Wait and recast
    } else {
      // Retry if wrong sound
      cast(bot);
    }
  });
}

createBot();
