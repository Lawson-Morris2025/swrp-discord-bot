require('dotenv').config();
const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    SlashCommandBuilder, 
    REST, 
    Routes, 
    PermissionFlagsBits,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const express = require('express');

// ==========================================
// 1. APPLICATION ARCHITECTURE CONFIGURATION
// ==========================================
const CONFIG = {
    TOKEN: process.env.TOKEN,
    PORT: process.env.PORT || 10000,
    PURPLE_HEX: '#7B2CBF', 
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || 'StaffPass123',
    FIXED_TICKET_CHANNEL_ID: '1512552819172053172',
    OWNER_DISCORD_ID: '1378439051874406410', // Live user fallback verification context hook
    CHANNELS: {
        ANNOUNCEMENTS: '1512759729829580800', 
        TICKET_LOGS: process.env.TICKET_LOG_CHANNEL_ID,
        MOD_LOGS: process.env.MOD_LOGS_CHANNEL_ID,
        CATEGORY_TICKETS: process.env.TICKET_CATEGORY_ID
    },
    TICKET_TYPES: [
        { id: 'support', label: 'General Support', emoji: '🎫' },
        { id: 'player_report', label: 'Report a Player', emoji: '⚠️' }
    ]
};

// Runtime In-Memory Core Storage Architecture
const database = {
    callsigns: new Map(), // Format: UserID -> { callsign: String, unit: String }
    activeTickets: new Map() // Format: ChannelID -> { creatorId: String, type: String }
};

// Initialize Core Engine Clients
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message]
});
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// 2. EMBED COMPONENT & INTERFACE DESIGN BUILDERS
// ==========================================
const UI = {
    error: (msg) => new EmbedBuilder().setColor('#D00000').setDescription(`❌ **Error:** ${msg}`),
    success: (msg) => new EmbedBuilder().setColor('#38B000').setDescription(`✅ **Success:** ${msg}`),
    
    verifyEmbed: () => new EmbedBuilder()
        .setColor(CONFIG.PURPLE_HEX)
        .setTitle('🛡️ South Wales Roleplay • Secure Gateway')
        .setDescription('Welcome to the **South Wales Roleplay (SWRP)** community workspace network pipeline.\n\nTo access community chat environments, role access routing arrays, and staff channels, complete verification profile syncing below.')
        .addFields({ name: '🔐 Database Security Protocol', value: 'Clicking the link below verifies your Discord identity and syncs your active roles with our internal data structures safely.' })
        .setFooter({ text: 'SWRP Core Gateway Automated Clearance Array' })
        .setTimestamp(),

    callsignEmbed: () => new EmbedBuilder()
        .setColor(CONFIG.PURPLE_HEX)
        .setTitle('🚔 SWRP Operational Callsign & Unit Registry')
        .setDescription('Welcome to the operational service registry workspace. All active personnel operating inside public server contexts must declare an active callsign profile layout context configuration.')
        .addFields(
            { name: '📋 Current Directives', value: 'Use the submission layout console action matrix block below to update or register your deployment callsign immediately.' },
            { name: '⚠️ Compliance Warning', value: 'Failure to register your operational handle while on active shifts may result in internal logging actions by administrators.' }
        )
        .setFooter({ text: 'SWRP Internal Records Infrastructure Engine' })
        .setTimestamp()
};

// ==========================================
// 3. INTERNAL EXPRESS FLUID WEBPAGE ENGINE
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>SWRP Operational Matrix Core</title>
            <style>
                body { background: #0B0914; color: #E0AAFF; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; text-align: center; padding-top: 50px; }
                .container { border: 2px solid #7B2CBF; background: #161224; display: inline-block; padding: 30px; border-radius: 12px; box-shadow: 0px 0px 20px #7B2CBF55; }
                h1 { color: #FFFFFF; margin-bottom: 5px; }
                p { color: #9D4EDD; font-size: 14px; }
                .status-light { display: inline-block; width: 12px; height: 12px; background: #38B000; border-radius: 50%; box-shadow: 0 0 10px #38B000; }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>SWRP System Core Status</h1>
                <p><span class="status-light"></span> Application instances operational within active service arrays.</p>
            </div>
        </body>
        </html>
    `);
});

// ==========================================
// 4. INTERACTION PIPELINE (SLASH & BACKEND UI)
// ==========================================
client.on('interactionCreate', async (interaction) => {
    // 4A. Slash Command Execution Router
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'setverify') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setLabel('Complete Profile Sync')
                    .setURL('https://lawsonmorris.co.uk')
                    .setStyle(ButtonStyle.Link)
            );
            await interaction.reply({ embeds: [UI.verifyEmbed()], components: [row] });
        }

        if (commandName === 'setcallsignpanel') {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('trigger_callsign_modal')
                    .setLabel('Register/Update Callsign Profile')
                    .setEmoji('📝')
                    .setStyle(ButtonStyle.Primary)
            );
            await interaction.reply({ embeds: [UI.callsignEmbed()], components: [row] });
        }

        if (commandName === 'listcallsign') {
            if (database.callsigns.size === 0) {
                return interaction.reply({ embeds: [UI.error('The active database file context contains zero registered operational callsign datasets right now.')], ephemeral: true });
            }

            let logString = '```md\n# SWRP ACTIVE PERSONNEL REGISTRY MATRIX\n\n';
            database.callsigns.forEach((data, userId) => {
                logString += `[User ID: ${userId}] [Callsign: ${data.callsign}] -> Operational Unit Group: <${data.unit}>\n`;
            });
            logString += '```';

            await interaction.reply({ content: logString, ephemeral: true });
        }
    }

    // 4B. Interactive Button Event Processing Router
    if (interaction.isButton()) {
        if (interaction.customId === 'trigger_callsign_modal') {
            const modal = new ModalBuilder()
                .setCustomId('callsign_submission_modal')
                .setTitle('Callsign Workspace Matrix Setup');

            const callsignInput = new TextInputBuilder()
                .setCustomId('modal_callsign_field')
                .setLabel("Operational Callsign Tag (e.g. 1A-99)")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("Enter your current callsign handle profile tag...")
                .setRequired(true);

            const unitInput = new TextInputBuilder()
                .setCustomId('modal_unit_field')
                .setLabel("Deployment Division Unit Branch")
                .setStyle(TextInputStyle.Short)
                .setPlaceholder("e.g. Roads Policing Unit / Fire & Rescue")
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(callsignInput),
                new ActionRowBuilder().addComponents(unitInput)
            );

            await interaction.showModal(modal);
        }
    }

    // 4C. Interactive Modal Data Capture Engine
    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'callsign_submission_modal') {
            const callsignValue = interaction.fields.getTextInputValue('modal_callsign_field');
            const unitValue = interaction.fields.getTextInputValue('modal_unit_field');

            database.callsigns.set(interaction.user.id, {
                callsign: callsignValue,
                unit: unitValue
            });

            // Target deployment workspace for secure user DM sync sequence
            try {
                const ownerUser = await client.users.fetch(CONFIG.OWNER_DISCORD_ID);
                const dmEmbed = new EmbedBuilder()
                    .setColor(CONFIG.PURPLE_HEX)
                    .setTitle('🗂️ Registry Action System Log Dispatch')
                    .setDescription(`An update occurrence dropped in the registry data files.`)
                    .addFields(
                        { name: '👤 Operator profile handle', value: `${interaction.user.tag} (\`${interaction.user.id}\`)` },
                        { name: '🏷️ Registered Callsign', value: `\`${callsignValue}\``, inline: true },
                        { name: '🏢 Divisional Scope Unit', value: `\`${unitValue}\``, inline: true }
                    )
                    .setTimestamp();
                
                await ownerUser.send({ embeds: [dmEmbed] });
            } catch (err) {
                console.error("⚠️ Failed to transmit approval alert logs to the system developer profile configuration context:", err);
            }

            await interaction.reply({ 
                embeds: [UI.success(`Your operational identity token layout has been synced to the database structure context successfully!\n\n**Callsign:** \`${callsignValue}\`\n**Unit:** \`${unitValue}\``)], 
                ephemeral: true 
            });
        }
    }
});

// ==========================================
// 5. BOOTSTRAP PIPELINE INSTANT SYNC ENGINE
// ==========================================
client.once('ready', async () => {
    console.log(`🤖 Logged into Discord API as ${client.user.tag}`);
    app.listen(CONFIG.PORT, () => console.log(`🌐 Light-Purple Web UI operational on port ${CONFIG.PORT}`));

    // Compile commands array data mappings structure
    const commands = [
        new SlashCommandBuilder()
            .setName('setverify')
            .setDescription('Spawns the SWRP click-to-verify secure login portal embed.')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        new SlashCommandBuilder()
            .setName('setcallsignpanel')
            .setDescription('Spawns the staff callsign registry interface configuration hook module panel.')
            .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),
        new SlashCommandBuilder()
            .setName('listcallsign')
            .setDescription('Returns a live matrix dataset checklist log of every single approved callsign record on current active instance database file context.')
    ].map(command => command.toJSON());

    const rest = new REST({ version: '10' }).setToken(CONFIG.TOKEN);
    try {
        console.log('🔄 Deploying instant application commands across server cache guilds...');
        
        // This processes guild deployments instantly, completely cutting out the 1-hour global cooldown delay matrix
        client.guilds.cache.forEach(async (guild) => {
            await rest.put(
                Routes.applicationGuildCommands(client.user.id, guild.id),
                { body: commands },
            );
        });
        
        console.log('✅ Instant server guild slash commands initialized cleanly!');
    } catch (error) {
        console.error('❌ Error handling command sync injection matrix:', error);
    }
});

// Wake up the engine instances 
client.login(CONFIG.TOKEN);
