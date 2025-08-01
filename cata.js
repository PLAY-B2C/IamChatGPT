const mineflayer = require('mineflayer')
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')
const mcDataLoader = require('minecraft-data')

let rightClickInterval = null

function createBot() {
  const bot = mineflayer.createBot({
    host: 'mc.fakepixel.fun',
    port: 25565,
    username: 'DrakonTide',
    auth: 'offline',
    checkTimeoutInterval: 120000
  })

  bot.loadPlugin(pathfinder)

  bot.once('spawn', () => {
    console.log('✅ Bot spawned.')
    bot.chat('/login 3043AA')

    // Debug nearby entities after login
    setTimeout(() => {
      console.log('📋 Listing nearby entities:')
      Object.values(bot.entities).forEach(e => {
        console.log(`[${e.type}] name=${e.name || e.username || '???'} pos=${e.position}`)
      })
    }, 3000)
  })

  bot.on('message', (message) => {
    const msg = message.toString().toLowerCase()

    if (msg.includes('login failed') || msg.includes('please login')) {
      console.log('🔐 Login required, retrying...')
      setTimeout(() => bot.chat('/login 3043AA'), 2000)
    }

    if (msg.includes('the dungeon will begin')) {
      console.log('🏃 Dungeon starting — moving to NPC.')
      goToAndClickNPC()
    }

    if (msg.includes('this dungeon will close in')) {
      console.log('⛔ Dungeon closing — disconnecting.')
      bot.quit('Dungeon closing')
    }

    if (msg.includes('i first entered the dungeon')) {
      console.log('🔁 Start spamming right-click.')
      startRightClickSpam()
    }

    if (msg.includes('you have dealt')) {
      console.log('😴 Stopping spam, going AFK.')
      stopRightClickSpam()
      startKeepAlive()
    }
  })

  function goToAndClickNPC() {
    const npc = Object.values(bot.entities).find(e =>
      (e.type === 'player' && e.username && e.username.length <= 16)
    )

    if (!npc) {
      console.log('❌ No NPC found (type=player).')
      return
    }

    const mcData = mcDataLoader(bot.version)
    const movements = new Movements(bot, mcData)
    bot.pathfinder.setMovements(movements)

    const pos = npc.position
    const goal = new goals.GoalNear(pos.x, pos.y, pos.z, 0.3)
    bot.pathfinder.setGoal(goal)

    bot.once('goal_reached', async () => {
      console.log(`🎯 Reached NPC at (${pos.x.toFixed(1)}, ${pos.y.toFixed(1)}, ${pos.z.toFixed(1)})`)
      bot.setQuickBarSlot(0)

      try {
        await bot.lookAt(npc.position.offset(0, npc.height, 0))
        bot.attack(npc) // Left click
        console.log('🖱️ Looked at and left-clicked NPC')
      } catch (err) {
        console.error('😵 Failed to look or click NPC:', err)
        return
      }

      bot.once('windowOpen', (window) => {
        console.log('📦 GUI opened:', window.title)

        let clickedAny = false
        for (let i = 0; i < window.slots.length; i++) {
          const item = window.slots[i]
          if (
            item &&
            (
              item.name === 'red_stained_glass_pane' ||
              (item.name === 'stained_glass_pane' && item.metadata === 14) ||
              item.displayName?.toLowerCase().includes('not ready')
            )
          ) {
            bot.clickWindow(i, 0, 1)
            console.log(`✅ Shift-clicked: ${item.displayName || item.name} at slot ${i}`)
            clickedAny = true
          }
        }

        if (!clickedAny) {
          console.log('❌ No red glass panes or "Not Ready" found.')
        }

        bot.pathfinder.setGoal(null)
        console.log('⏳ Waiting for dungeon entry...')
      })
    })
  }

  function startRightClickSpam() {
    if (rightClickInterval) return
    bot.setQuickBarSlot(0)
    rightClickInterval = setInterval(() => {
      bot.activateItem()
    }, 300)
  }

  function stopRightClickSpam() {
    if (rightClickInterval) {
      clearInterval(rightClickInterval)
      rightClickInterval = null
    }
  }

  function startKeepAlive() {
    setInterval(() => {
      if (bot && bot.player) {
        bot._client.write('ping', { keepAliveId: Date.now() })
        console.log('📶 Keep-alive ping sent.')
      }
    }, 30000)
  }

  bot.on('kicked', (reason) => {
    console.log('❌ Kicked:', reason)
  })

  bot.on('error', (err) => {
    console.log('💥 Error:', err.message)
  })

  bot.on('end', () => {
    console.log('🔌 Disconnected. Reconnecting in 5 seconds...')
    setTimeout(createBot, 5000)
  })

  process.on('uncaughtException', (err) => {
    console.error('🛑 Uncaught Exception:', err)
  })

  process.on('unhandledRejection', (reason, promise) => {
    console.error('🛑 Unhandled Promise:', reason)
  })

  return bot
}

createBot()
