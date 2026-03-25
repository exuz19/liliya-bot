// Load .env locally
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const fs = require('fs');
const OpenAI = require('openai');
const express = require('express');

// ================= EXPRESS =================
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
    ],
    partials: [Partials.Channel]
});

// ================= OPENAI =================
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// ================= MEMORY =================
const userMemory = new Map();

// ================= READY =================
client.once('ready', () => {
    console.log(`✅ LOGGED IN AS: ${client.user.tag}`);
});

// ================= CONNECTION DEBUG =================
client.on('shardReady', id => {
    console.log(`🟢 Shard ${id} ready`);
});

client.on('shardError', error => {
    console.error('🔴 Shard error:', error);
});

client.on('shardDisconnect', event => {
    console.warn('⚠️ Shard disconnected:', event.code);
});

// ================= COMMANDS =================
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
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

// ================= LOGIN =================
console.log("🔑 TOKEN LENGTH:", process.env.TOKEN?.length);

client.login(process.env.TOKEN)
    .then(() => console.log("🚀 LOGIN SUCCESS"))
    .catch(err => console.error("❌ LOGIN FAILED:", err));