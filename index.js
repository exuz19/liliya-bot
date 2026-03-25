// ✅ Load .env ONLY locally (Render uses its own env system)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const OpenAI = require('openai');
const express = require('express');

// 🌐 Web server (RENDER FIX)
const app = express();
const PORT = process.env.PORT || 10000;

app.get('/', (req, res) => {
    res.send('🔥 Liliya is alive');
});

app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
});

// 🤖 Discord Client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 🧠 OpenAI
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// 🧾 Memory
const memory = {};

// 📦 Load commands
client.commands = new Collection();
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(`./commands/${file}`);
    client.commands.set(command.data.name, command);
}

// 🔍 DEBUG ENV (IMPORTANT)
console.log("TOKEN EXISTS:", !!process.env.TOKEN);
console.log("OPENAI KEY EXISTS:", !!process.env.OPENAI_API_KEY);

// 🔥 Ready
client.once('clientReady', () => {
    console.log(`🔥 Liliya awakens... Logged in as ${client.user.tag}`);
});

// ⚡ Slash commands
client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: 'Even flames falter...', ephemeral: true });
    }
});

// 💬 AI Chat
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const content = message.content.toLowerCase();

    const isTriggered =
        content.includes('liliya') ||
        content.includes('lilya') ||
        message.mentions.has(client.user);

    if (!isTriggered) return;

    const userId = message.author.id;

    const cleanedMessage = content
        .replace('liliya', '')
        .replace('lilya', '')
        .trim();

    if (!memory[userId]) memory[userId] = [];

    memory[userId].push({
        role: "user",
        content: cleanedMessage || message.content
    });

    if (memory[userId].length > 10) {
        memory[userId].shift();
    }

    try {
        await message.channel.sendTyping();

        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `
You are Liliya, a confident, playful, slightly dominant fire sorceress.
You are teasing, mysterious, sometimes flirty.
Speak like a real human. Keep replies short and natural.
Never say you're an AI.
`
                },
                ...memory[userId]
            ]
        });

        const reply = completion.choices[0].message.content;

        memory[userId].push({
            role: "assistant",
            content: reply
        });

        await message.reply(reply);

    } catch (err) {
        console.error("AI ERROR:", err);
        message.reply("Hmm… even flames flicker sometimes.");
    }
});

// 🔐 LOGIN WITH ERROR HANDLING
client.login(process.env.TOKEN).catch(err => {
    console.error("LOGIN ERROR:", err);
});