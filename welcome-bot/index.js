const {
  Client,
  GatewayIntentBits,
  PermissionsBitField
} = require("discord.js");

const fs = require("fs");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

const TOKEN = process.env.TOKEN;
const PREFIX = "!";

let welcomeData = {};
if (fs.existsSync("./welcomeData.json")) {
  welcomeData = JSON.parse(fs.readFileSync("./welcomeData.json"));
}

function saveData() {
  fs.writeFileSync("./welcomeData.json", JSON.stringify(welcomeData, null, 2));
}

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});


// =====================
// MOD COMMANDS
// =====================
client.on("messageCreate", (message) => {
  if (!message.guild) return;
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
    return message.reply("❌ You need **Manage Server** permission.");
  }

  const args = message.content.slice(PREFIX.length).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  // !setwelcome
  if (command === "setwelcome") {
    const text = args.join(" ");
    if (!text) {
      return message.reply(
        "❌ Usage: `!setwelcome Welcome {user} to {server}!`"
      );
    }

    if (!welcomeData[message.guild.id]) {
      welcomeData[message.guild.id] = {
        channelId: message.channel.id,
        text,
        lastMessageId: null
      };
    } else {
      welcomeData[message.guild.id].text = text;
    }

    saveData();
    return message.reply("✅ Welcome message set!");
  }

  // !setwelcomechannel
  if (command === "setwelcomechannel") {
    const channel = message.mentions.channels.first();
    if (!channel) {
      return message.reply(
        "❌ Usage: `!setwelcomechannel #welcome`"
      );
    }

    if (!welcomeData[message.guild.id]) {
      welcomeData[message.guild.id] = {
        channelId: channel.id,
        text: "Welcome {user}!",
        lastMessageId: null
      };
    } else {
      welcomeData[message.guild.id].channelId = channel.id;
    }

    saveData();
    return message.reply(`✅ Welcome channel set to ${channel}`);
  }
});


// =====================
// MEMBER JOIN EVENT
// =====================
client.on("guildMemberAdd", async (member) => {
  const data = welcomeData[member.guild.id];
  if (!data) return;

  const channel = member.guild.channels.cache.get(data.channelId);
  if (!channel) return;

  try {
    if (data.lastMessageId) {
      const oldMsg = await channel.messages
        .fetch(data.lastMessageId)
        .catch(() => null);
      if (oldMsg) await oldMsg.delete();
    }

    const text = data.text
      .replace("{user}", `<@${member.id}>`)
      .replace("{server}", member.guild.name);

    const msg = await channel.send(text);

    data.lastMessageId = msg.id;
    saveData();

  } catch (err) {
    console.error("Welcome error:", err);
  }
});

client.login(TOKEN);
