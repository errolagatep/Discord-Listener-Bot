require("dotenv").config();
const { Client, GatewayIntentBits } = require("discord.js");
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

async function fetchWithRetry(url, payload, retries = 50, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("✅ Sent to n8n successfully!");
      return data;

    } catch (error) {
      console.error(`❌ Attempt ${i + 1}/50 failed:`, error.message);

      if (i === retries - 1) {
        throw error;
      }

      await new Promise((r) => setTimeout(r, delay));
    }
  }
}

client.on("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  message.channel.sendTyping();

  const payload = {
    content: message.content,
    channelId: message.channel.id,
    channelName: message.channel.name,
    guildId: message.guild.id,
    userId: message.author.id,
    username: message.author.username,
  };

  try {
    const result = await fetchWithRetry(N8N_WEBHOOK_URL, payload);
  } catch (error) {
    console.error("❌ Final failure:", error.message);
    await message.reply("⚠️ Failed to reach n8n after many retries.");
  }
});

client.login(process.env.DISCORD_BOT_TOKEN);
