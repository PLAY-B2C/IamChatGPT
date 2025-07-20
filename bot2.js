const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { GoalBlock } = goals;

const config = {
  host: 'mc.cloudpixel.fun',
  port: 25565, // Default port
  version: '1.8.9',
  password: 'ABCDEFG',
  botNames: ['DrakonTide', 'ConnieSpringer'],
  targetPos: { x: -30.5, y: 92, z: -5.5 }
};

function createBot(username) {
  const bot = mineflayer.createBot({
    host: config.host,
    port: config.port,
    username,
    version: config.version
  });

  bot.loadPlugin(pathfinder);

  bot.once('spawn', () => {
    console.log(`✅ ${username} joined.`);

    // Step 1: Send /login
    setTimeout(() => {
      bot.chat(`/login ${config.password}`);
      console.log(`🔐 ${username} sent /login`);
    }, 1000);

    // Step 2: Walk to coords
    setTimeout(() => {
      const goal = new GoalBlock(
        Math.floor(config.targetPos.x),
        Math.floor(config.targetPos.y),
        Math.floor(config.targetPos.z)
      );
      const movements = new Movements(bot);
      bot.pathfinder.setMovements(movements);
      bot.pathfinder.setGoal(goal);
    }, 3000);
  });

  // Step 3: After reaching, right click twice then sprint forward
  bot.on('goal_reached', () => {
    console.log(`🎯 ${username} reached target.`);
    rightClickTwiceThenSprint();
  });

  function rightClickTwiceThenSprint() {
    const entity = bot.nearestEntity();
    if (entity) {
      bot.activateEntity(entity); // 1st click
      setTimeout(() => bot.activateEntity(entity), 1000); // 2nd click
    }
    setTimeout(() => {
      bot.setControlState('forward', true);
      bot.setControlState('sprint', true);
      console.log(`🏃 ${username} is sprinting forward.`);
    }, 2000);
  }

  // Auto-reconnect
  bot.on('end', () => {
    console.log(`❌ ${username} disconnected. Reconnecting...`);
    setTimeout(() => createBot(username), 10000);
  });

  bot.on('error', err => {
    console.log(`⚠️ ${username} error: ${err.message}`);
  });
}

// Launch bots
config.botNames.forEach(name => createBot(name));
