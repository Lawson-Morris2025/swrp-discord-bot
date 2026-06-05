const { Client, GatewayIntentBits, Partials, PermissionsBitField, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

const STAFF_ROLE_ID = "PUT_STAFF_ROLE_ID_HERE";
const CIVILIAN_ROLE_ID = "PUT_CIVILIAN_ROLE_ID_HERE";
const VERIFY_CHANNEL_ID = "PUT_VERIFY_CHANNEL_ID_HERE";
const ANNOUNCE_CHANNEL_ID = "PUT_ANNOUNCE_CHANNEL_ID_HERE";

// ---------------- READY ----------------
client.once("ready", () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// ---------------- VERIFY MESSAGE ----------------
client.on("messageCreate", async (message) => {
    if (message.content === "!verify-panel") {
        const button = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("verify")
                .setLabel("VERIFY")
                .setStyle(ButtonStyle.Success)
        );

        const embed = new EmbedBuilder()
            .setTitle("Verification Required")
            .setDescription("Click verify to gain access to the server.")
            .setColor("Blue");

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
