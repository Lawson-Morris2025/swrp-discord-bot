const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionsBitField 
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ================= COMMANDS =================

const commands = [
    new SlashCommandBuilder()
        .setName('startsession')
        .setDescription('Start RP session'),

    new SlashCommandBuilder()
        .setName('endsession')
        .setDescription('End RP session'),

    new SlashCommandBuilder()
        .setName('message')
        .setDescription('Send a custom announcement')
        .addStringOption(option =>
            option.setName('text')
                .setDescription('What you want the bot to say')
                .setRequired(true)
        )
].map(c => c.toJSON());

// ================= REGISTER COMMANDS =================

const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    await rest.put(
        Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
        { body: commands }
    );

    console.log("Slash commands registered");
});

// ================= COMMAND HANDLER =================

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    // OPTIONAL: admin only
    const isAdmin = interaction.memberPermissions?.has(
        PermissionsBitField.Flags.Administrator
    );

    // ================= START SESSION =================
    if (interaction.commandName === 'startsession') {
        if (!isAdmin)
            return interaction.reply({ content: "No permission.", ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle("🟢 SOUTH WALES RP SESSION STARTED")
            .setDescription(
                "A roleplay session is now active.\n\n" +
                "Please follow all server rules and maintain realistic roleplay.\n\n" +
                "✅ Active Staff\n" +
                "🚓 Emergency Services Available\n" +
                "🚗 Civilian Opportunities\n\n" +
                "Enjoy your time in South Wales RP."
            )
            .setColor(0x00ff00)
            .setFooter({ text: "South Wales RP Bot" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // ================= END SESSION =================
    if (interaction.commandName === 'endsession') {
        if (!isAdmin)
            return interaction.reply({ content: "No permission.", ephemeral: true });

        const embed = new EmbedBuilder()
            .setTitle("🔴 SOUTH WALES RP SESSION ENDED")
            .setDescription(
                "The current roleplay session has ended.\n\n" +
                "Thank you to everyone who attended.\n" +
                "We appreciate your support and hope to see you next time."
            )
            .setColor(0xff0000)
            .setFooter({ text: "South Wales RP Bot" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }

    // ================= CUSTOM MESSAGE =================
    if (interaction.commandName === 'message') {
        if (!isAdmin)
            return interaction.reply({ content: "No permission.", ephemeral: true });

        const text = interaction.options.getString('text');

        const embed = new EmbedBuilder()
            .setTitle("📢 SOUTH WALES RP ANNOUNCEMENT")
            .setDescription(text)
            .setColor(0x3498db)
            .setFooter({ text: "South Wales RP Bot" })
            .setTimestamp();

        return interaction.reply({ embeds: [embed] });
    }
});

// ================= LOGIN =================
client.login(TOKEN);    }
});

// ---------------- COMMAND HANDLER ----------------

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // START SESSION
    if (interaction.commandName === 'startsession') {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "No permission.", ephemeral: true });
        }

        const channel = interaction.guild.channels.cache.find(c => c.name === "verify");
        if (channel) {
            channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
                SendMessages: false
            });
        }

        return interaction.reply("Session started ✅");
    }

    // END SESSION
    if (interaction.commandName === 'endsession') {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "No permission.", ephemeral: true });
        }

        return interaction.reply("Session ended ✅");
    }
});

// LOGIN (IMPORTANT — NOTHING AFTER THIS LINE)
client.login(TOKEN);
