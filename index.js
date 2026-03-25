// Load .env locally only
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const OpenAI = require('openai');
const express = require('express');

// Web server (Render fix)
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('Bot alive');
});

app.listen(PORT, () => {
    console.log(`Web server running on port ${PORT}`);
});

// Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 🔥 FORCE LOG EVERYTHING
client.on('ready', () => {
    console.log(`✅ LOGGED IN AS: ${client.user.tag}`);
});

// 🧪 DEBUG CONNECTION EVENTS
client.on('debug', console.log);
client.on('error', console.error);

// OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Commands
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

// Slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await interaction.deferReply();
        await command.execute(interaction);
    } catch (err) {
        console.error(err);
        await interaction.editReply("Error");
    }
});

// Login (CRITICAL DEBUG)
console.log("TOKEN LENGTH:", process.env.TOKEN?.length);

client.login(process.env.TOKEN)
    .then(() => console.log("🚀 LOGIN SUCCESS"))
    .catch(err => console.error("❌ LOGIN FAILED:", err));