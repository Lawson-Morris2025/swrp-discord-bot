const { 
    Client, 
    GatewayIntentBits, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    REST,
    Routes,
    ApplicationCommandOptionType,
    ChannelType
} = require('discord.js');
require('dotenv').config();
const http = require('http');

// ---- 1. Dummy Web Server for Render ----
const PORT = process.env.PORT || 10000;
http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('South Wales RP Bot is alive and running 24/7!\n');
}).listen(PORT, () => {
    console.log(`🌐 Dummy web server is listening on port ${PORT}`);
});

// ---- 2. Configuration Check ----
const config = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID,
    ANNOUNCEMENT_CHANNEL_ID: process.env.ANNOUNCEMENT_CHANNEL_ID,
    SESSION_CHANNEL_ID: process.env.SESSION_CHANNEL_ID, // Added for separate sessions channel
    UNVERIFIED_ROLE_ID: process.env.VERIFY_ROLE_ID,
    CIVILIAN_ROLE_ID: process.env.CIVILIAN_ROLE_ID
};

for (const [key, value] of Object.entries(config)) {
    if (!value) {
        console.error(`❌ CRITICAL ERROR: Environment variable "${key}" is missing.`);
        process.exit(1);
    }
}

// ---- 3. Client Initialization ----
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages
    ]
});

// ---- 4. Slash Command Definitions ----
const commands = [
    {
        name: 'startsession',
        description: 'Starts a South Wales RP session',
        default_member_permissions: PermissionFlagsBits.Administrator.toString()
    },
    {
        name: 'endsession',
        description: 'Ends the active South Wales RP session',
        default_member_permissions: PermissionFlagsBits.Administrator.toString()
    },
    {
        name: 'announce',
        description: 'Sends a professional server announcement',
        default_member_permissions: PermissionFlagsBits.Administrator.toString(),
        options: [
            {
                name: 'title',
                description: 'The title of your announcement',
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'message',
                description: 'The content of your announcement',
                type: ApplicationCommandOptionType.String,
                required: true
            },
            {
                name: 'image',
                description: 'Optional image attachment',
                type: ApplicationCommandOptionType.Attachment,
                required: false
            }
        ]
    },
    {
        name: 'setverify',
        description: 'Spawns the verification panel in this channel',
        default_member_permissions: PermissionFlagsBits.Administrator.toString()
    }
];

// ---- 5. Register Slash Commands ----
const rest = new REST({ version: '10' }).setToken(config.TOKEN);

(async () => {
    try {
        console.log('🔄 Started refreshing application (/) commands...');
        await rest.put(
            Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Successfully reloaded application (/) commands.');
    } catch (error) {
        console.error('❌ Error registering slash commands:', error);
    }
})();

// ---- 6. Bot Events ----
client.once('ready', () => {
    console.log(`🚀 Logged in as ${client.user.tag}! Bot is ready 24/7.`);
    client.user.setActivity('South Wales RP', { type: 3 });
});

// Auto Role Assignment on Join
client.on('guildMemberAdd', async (member) => {
    try {
        const unverifiedRole = await member.guild.roles.fetch(config.UNVERIFIED_ROLE_ID).catch(() => null);
        if (unverifiedRole) {
            await member.roles.add(unverifiedRole);
            console.log(`Assigned Unverified role to ${member.user.tag}`);
        }
    } catch (error) {
        console.error(`Failed to assign unverified role to joining member ${member.user.tag}:`, error);
    }
});

// Interaction Handling
client.on('interactionCreate', async (interaction) => {
    const isDM = interaction.channel?.type === ChannelType.DM || (!interaction.guildId && !interaction.guild);
    
    if (isDM) {
        if (interaction.isRepliable()) {
            return interaction.reply({ 
                content: '❌ This command can only be used inside the South Wales RP Discord Server!', 
                ephemeral: true 
            }).catch(() => {});
        }
        return;
    }

    const currentGuild = interaction.guild || await client.guilds.fetch(interaction.guildId).catch(() => null);
    if (!currentGuild) {
        if (interaction.isRepliable()) {
            return interaction.reply({ content: '❌ Failed to connect to server data cache.', ephemeral: true }).catch(() => {});
        }
        return;
    }

    // ---- Handle Slash Commands ----
    if (interaction.isChatInputCommand()) {
        const { commandName, channel } = interaction;

        try {
            if (commandName === 'startsession') {
                const sessionChannel = await currentGuild.channels.fetch(config.SESSION_CHANNEL_ID).catch(() => null);
                if (!sessionChannel) return interaction.reply({ content: '❌ Sessions channel not found. Check your SESSION_CHANNEL_ID environment variable on Render!', ephemeral: true });
                
                const embed = new EmbedBuilder()
                    .setTitle('🔵 SOUTH WALES RP SESSION STARTED')
                    .setDescription(
                        'A roleplay session is now active.\n\n' +
                        'Please follow all server rules and maintain realistic roleplay.\n\n' +
                        '✅ **Active Staff**\n\n' +
                        '✅ **Professional RP**\n\n' +
                        '✅ **Emergency Services Available**\n\n' +
                        '✅ **Civilian Opportunities**\n\n' +
                        'Enjoy your time in South Wales RP.'
                    )
                    .setColor('#0000FF')
                    .setTimestamp();

                await sessionChannel.send({ content: '@everyone', embeds: [embed] });
                return interaction.reply({ content: '✅ Session startup posted to sessions channel!', ephemeral: true });
            }

            if (commandName === 'endsession') {
                const sessionChannel = await currentGuild.channels.fetch(config.SESSION_CHANNEL_ID).catch(() => null);
                if (!sessionChannel) return interaction.reply({ content: '❌ Sessions channel not found. Check your SESSION_CHANNEL_ID environment variable on Render!', ephemeral: true });

                const embed = new EmbedBuilder()
                    .setTitle('🔴 SOUTH WALES RP SESSION ENDED')
                    .setDescription(
                        'The current roleplay session has ended.\n\n' +
                        'Thank you to everyone who attended.\n\n' +
                        'We appreciate your support and hope to see you next time.'
                    )
                    .setColor('#FF0000')
                    .setTimestamp();

                await sessionChannel.send({ content: '@everyone', embeds: [embed] });
                return interaction.reply({ content: '✅ Session end posted to sessions channel!', ephemeral: true });
            }

            if (commandName === 'announce') {
                const announcementChannel = await currentGuild.channels.fetch(config.ANNOUNCEMENT_CHANNEL_ID).catch(() => null);
                if (!announcementChannel) return interaction.reply({ content: '❌ Announcement channel not found. Check your ANNOUNCEMENT_CHANNEL_ID environment variable on Render!', ephemeral: true });

                const title = interaction.options.getString('title');
                const message = interaction.options.getString('message');
                const image = interaction.options.getAttachment('image');

                const embed = new EmbedBuilder()
                    .setTitle(title)
                    .setDescription(message)
                    .setColor('#0000FF')
                    .setTimestamp();

                if (image) {
                    embed.setImage(image.url);
                }

                await announcementChannel.send({ content: '@everyone', embeds: [embed] });
                return interaction.reply({ content: '✅ Announcement broadcasted!', ephemeral: true });
            }

            if (commandName === 'setverify') {
                const embed = new EmbedBuilder()
                    .setTitle('✅ Verification Required')
                    .setDescription('Welcome to South Wales RP.\n\nTo access the server, click Verify below and enter your Roblox username.')
                    .setColor('#00FF00');

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('verify_btn')
                        .setLabel('Verify')
                        .setStyle(ButtonStyle.Success)
                );

                await channel.send({ embeds: [embed], components: [row] });
                return interaction.reply({ content: '✅ Verification panel setup complete!', ephemeral: true });
            }

        } catch (error) {
            console.error(`Error processing command ${commandName}:`, error);
            return interaction.reply({ content: '❌ An error occurred executing this command.', ephemeral: true }).catch(() => {});
        }
    }

    // ---- Handle Button Click ----
    if (interaction.isButton()) {
        if (interaction.customId === 'verify_btn') {
            const modal = new ModalBuilder()
                .setCustomId('verify_modal')
                .setTitle('Roblox Verification');

            const robloxInput = new TextInputBuilder()
                .setCustomId('roblox_username')
                .setLabel('Roblox Username')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Enter your exact username here')
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(robloxInput);
            modal.addComponents(row);

            await interaction.showModal(modal);
        }
    }

    // ---- Handle Modal Submission ----
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'verify_modal') {
            await interaction.deferReply({ ephemeral: true });

            const robloxUsername = interaction.fields.getTextInputValue('roblox_username');
            const member = interaction.member;
            const discordName = member.user.username;

            try {
                const targetNickname = `${discordName} - ${robloxUsername}`;
                await member.setNickname(targetNickname.substring(0, 32));

                const unverifiedRole = await currentGuild.roles.fetch(config.UNVERIFIED_ROLE_ID).catch(() => null);
                const civilianRole = await currentGuild.roles.fetch(config.CIVILIAN_ROLE_ID).catch(() => null);

                if (civilianRole) await member.roles.add(civilianRole);
                if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
                    await member.roles.remove(unverifiedRole);
                }

                return interaction.editReply({ 
                    content: '✅ Verification successful.\n\nYou now have access to the server.' 
                });

            } catch (error) {
                console.error('Verification System Error:', error);
                return interaction.editReply({ 
                    content: '❌ Verification partially failed. Ensure the bot\'s role is higher than the target roles and it has permission to change your nickname.' 
                });
            }
        }
    }
});

// Global error handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});

client.login(config.TOKEN);
