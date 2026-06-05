const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, PermissionsBitField } = require('discord.js');

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
        .setDescription('End a session')
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
