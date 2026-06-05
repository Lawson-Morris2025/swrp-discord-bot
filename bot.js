const { 
    Client, 
    GatewayIntentBits, 
    REST, 
    Routes, 
    SlashCommandBuilder, 
    PermissionsBitField 
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
    intents: [GatewayIntentBits.Guilds]
});

// ---------------- COMMANDS ----------------

const commands = [
    new SlashCommandBuilder()
        .setName('startsession')
        .setDescription('Start a session'),

    new SlashCommandBuilder()
        .setName('endsession')
        .setDescription('End a session'),

    new SlashCommandBuilder()
        .setName('announce')
        .setDescription('Send an announcement')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('Announcement message')
                .setRequired(true)
        )
].map(cmd => cmd.toJSON());

// Register commands
const rest = new REST({ version: '10' }).setToken(TOKEN);

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);

    try {
        await rest.put(
            Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
            { body: commands }
        );
        console.log("Commands registered");
    } catch (err) {
        console.error(err);
    }
});

// ---------------- COMMAND HANDLER ----------------

client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;

    // ---------------- START SESSION ----------------
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

        return interaction.reply(
`🟢 **SOUTH WALES RP SESSION STARTED**

A roleplay session is now officially active. Please ensure you follow all server rules and maintain realistic roleplay at all times.

━━━━━━━━━━━━━━━━━━
✅ Active Staff Monitoring
🚓 Emergency Services Available
👮 Law Enforcement On Duty
🏥 Medical Services Active
🚗 Civilian RP Fully Open
━━━━━━━━━━━━━━━━━━

Have fun and enjoy your time in South Wales RP!`
        );
    }

    // ---------------- END SESSION ----------------
    if (interaction.commandName === 'endsession') {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "No permission.", ephemeral: true });
        }

        return interaction.reply(
`🔴 **SOUTH WALES RP SESSION ENDED**

The current roleplay session has now officially ended.

━━━━━━━━━━━━━━━━━━
📌 All RP activities are now closed
🚓 Emergency services are off duty
👮 Staff are no longer actively moderating RP
🚗 Civilian operations paused
━━━━━━━━━━━━━━━━━━

Thank you to everyone who participated today.
We hope to see you in the next session.`
        );
    }

    // ---------------- ANNOUNCEMENT ----------------
    if (interaction.commandName === 'announce') {

        if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: "No permission.", ephemeral: true });
        }

        const msg = interaction.options.getString('message');

        const channel = interaction.guild.channels.cache.find(c => c.name === "announcements");

        const text = `📢 **SOUTH WALES RP ANNOUNCEMENT**\n\n${msg}\n\n— Staff Team`;

        if (channel) {
            channel.send(text);
        }

        return interaction.reply({ content: "Announcement sent ✅", ephemeral: true });
    }
});

// ---------------- LOGIN ----------------
client.login(TOKEN);            .setColor("Blue");

        message.channel.send({ embeds: [embed], components: [button] });
    }

    // ANNOUNCEMENTS
    if (message.content.startsWith("!announce")) {
        if (!message.member.roles.cache.has(STAFF_ROLE_ID)) return;

        const msg = message.content.slice(10);

        const channel = await client.channels.fetch(ANNOUNCE_CHANNEL_ID);

        const embed = new EmbedBuilder()
            .setTitle("📢 Announcement")
            .setDescription(msg)
            .setColor("Red");

        channel.send({ embeds: [embed] });
    }

    // START SESSION
    if (message.content === "!startsession") {
        if (!message.member.roles.cache.has(STAFF_ROLE_ID)) return;

        const channel = message.channel;

        const embed = new EmbedBuilder()
            .setTitle("SOUTH WALES RP SESSION STARTED")
            .setDescription("A roleplay session is now active.\n\n✅ Active Staff\n✅ Professional RP\n✅ Emergency Services Available\n✅ Civilian Opportunities")
            .setColor("Green");

        channel.send({ embeds: [embed] });
    }

    // END SESSION
    if (message.content === "!endsession") {
        if (!message.member.roles.cache.has(STAFF_ROLE_ID)) return;

        const channel = message.channel;

        const embed = new EmbedBuilder()
            .setTitle("🔴 SOUTH WALES RP SESSION ENDED")
            .setDescription("The roleplay session has ended.\nThank you for participating.")
            .setColor("Red");

        channel.send({ embeds: [embed] });
    }
});

// ---------------- BUTTON HANDLER ----------------
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "verify") {
        const member = interaction.member;

        await member.roles.add(CIVILIAN_ROLE_ID);

        await interaction.reply({
            content: "✅ You are now verified!",
            ephemeral: true
        });
    }
});

client.login(TOKEN);        )
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
