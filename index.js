// ================= CRASH VISIBILITY =================
process.on('unhandledRejection', err => {
    console.error('❌ UNHANDLED REJECTION:', err);
});

process.on('uncaughtException', err => {
    console.error('❌ UNCAUGHT EXCEPTION:', err);
});

// ================= LOAD ENV =================
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

// ================= IMPORTS =================
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const OpenAI = require('openai');
const express = require('express');

// ================= EXPRESS (REQUIRED FOR FREE RENDER) =================
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => res.send('Bot alive'));

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// ================= DISCORD CLIENT =================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ================= OPENAI =================
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ================= MEMORY =================
const userMemory = new Map();

// ================= READY =================
client.once('clientReady', () => {
    console.log(`✅ LOGGED IN AS: ${client.user.tag}`);
});

// ================= AUTO RECONNECT =================
async function startBot() {
    try {
        console.log("🔑 TOKEN LENGTH:", process.env.TOKEN?.length);
        console.log("⏳ Attempting Discord login...");

        await client.login(process.env.TOKEN);

        console.log("🚀 LOGIN SUCCESS");

    } catch (err) {
        console.error("❌ LOGIN FAILED, retrying in 5s...", err);
        setTimeout(startBot, 5000); // retry
    }
}

// ================= COMMANDS =================
client.commands = new Collection();

if (fs.existsSync('./commands')) {
    const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));

    for (const file of commandFiles) {
        const command = require(`./commands/${file}`);
        client.commands.set(command.data.name, command);
    }
}

// ================= SLASH COMMAND =================
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await interaction.deferReply();
        await command.execute(interaction);
    } catch (err) {
        console.error("❌ COMMAND ERROR:", err);

        if (interaction.deferred || interaction.replied) {
            await interaction.editReply("Error executing command.");
        } else {
            await interaction.reply("Error executing command.");
        }
    }
});

// ================= AI MESSAGE =================
client.on('messageCreate', async message => {
    if (message.author.bot) return;

    const trigger =
        message.content.toLowerCase().includes("liliya") ||
        message.content.toLowerCase().includes("lilya") ||
        message.mentions.has(client.user);

    if (!trigger) return;

    try {
        await message.channel.sendTyping();

        const userId = message.author.id;

        if (!userMemory.has(userId)) userMemory.set(userId, []);
        const history = userMemory.get(userId);

        history.push({ role: "user", content: message.content });
        if (history.length > 10) history.shift();

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are Liliya, a smart, playful AI companion." },
                ...history
            ]
        });

        const reply = response.choices[0].message.content;

        history.push({ role: "assistant", content: reply });

        await message.reply(reply);

    } catch (err) {
        console.error("❌ AI ERROR:", err);
        await message.reply("Something went wrong...");
    }
});

// ================= START =================
console.log("🔥 FILE LOADED");
startBot();