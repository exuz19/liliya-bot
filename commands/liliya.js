const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('liliya')
        .setDescription('Meet Liliya'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("Liliya — Sorceress of Flames")
            .setDescription("A mysterious fire mage with a dangerous charm.")
            .setColor(0xff4500)
            .addFields(
                { name: "Rarity", value: "Legendary", inline: true },
                { name: "Role", value: "Magic", inline: true },
                { name: "Faction", value: "League of Order", inline: true }
            )
            .setFooter({ text: "Careful… she burns." });

        await interaction.reply({ embeds: [embed] });
    },
};