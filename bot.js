const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType,
    PermissionFlagsBits
} = require('discord.js');
const express = require('express');

// ==========================================
// 1. INITIALIZATION & CONFIGURATION
// ==========================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

const app = express();
app.use(express.json());

// Main Configuration Object
const CONFIG = {
    TOKEN: 'YOUR_BOT_TOKEN_HERE',
    PORT: 3000,
    PURPLE_HEX: '#7B2CBF', // Clean royal purple accent color
    CHANNELS: {
        ANNOUNCEMENTS: 'YOUR_ANNOUNCEMENTS_CHANNEL_ID',
        TICKET_LOGS: 'YOUR_TICKET_LOGS_CHANNEL_ID',
        MOD_LOGS: 'YOUR_MOD_LOGS_CHANNEL_ID',
        CATEGORY_TICKETS: 'YOUR_TICKETS_CATEGORY_ID'
    },
    // Dynamically managed ticket categories (You can add or remove items here safely)
    TICKET_TYPES: [
        { id: 'support', label: 'General Support', emoji: '🎫' },
        { id: 'player_report', label: 'Player Report', emoji: '⚠️' },
        { id: 'civ_application', label: 'Civilian Application', emoji: '🚘' }
    ]
};

// ==========================================
// 2. ANNOUNCEMENTS HUB (Preset Scripts)
// ==========================================
function sendSessionAnnouncement(type, customText = null, imageUrl = null) {
    const channel = client.channels.cache.get(CONFIG.CHANNELS.ANNOUNCEMENTS);
    if (!channel) return false;

    const embed = new EmbedBuilder().setColor(CONFIG.PURPLE_HEX);

    if (type === 'START') {
        embed
            .setTitle('🏴󠁧󠁢󠁷󠁬󠁳󠁿 SOUTH WALES RP SESSION STARTED 🏴󠁧󠁢󠁷󠁬󠁳󠁿')
            .setDescription(
                'A roleplay session is now active. Please follow all server rules and maintain realistic roleplay.\n\n' +
                '🔹 **Active Staff On Duty**\n' +
                '🔹 **Professional RP Expected**\n' +
                '🔹 **Emergency Services Available**\n' +
                '🔹 **Civilian Opportunities Open**\n\n' +
                'Enjoy your time in South Wales RP!'
            );
    } else if (type === 'END') {
        embed
            .setTitle('🏴󠁧󠁢󠁷󠁬󠁳󠁿 SOUTH WALES RP SESSION ENDED 🏴󠁧󠁢󠁷󠁬󠁳󠁿')
            .setDescription(
                'The current roleplay session has ended. Thank you to everyone who attended.\n\n' +
                'We appreciate your support and hope to see you next time.'
            );
    } else if (type === 'CUSTOM') {
        embed
            .setTitle('🏴󠁧󠁢󠁷󠁬󠁳󠁿 SOUTH WALES RP ANNOUNCEMENT 🏴󠁧󠁢󠁷󠁬󠁳󠁿')
            .setDescription(customText);
        
        if (imageUrl) {
            embed.setImage(imageUrl);
        }
    }

    channel.send({ embeds: [embed] });
    return true;
}

// ==========================================
// 3. DYNAMIC TICKET PANEL
// ==========================================
async function deployTicketPanel(channelId) {
    const channel = client.channels.cache.get(channelId);
    if (!channel) return console.log('Ticket channel not found.');

    const embed = new EmbedBuilder()
        .setColor(CONFIG.PURPLE_HEX)
        .setTitle('South Wales RP | Support Terminal')
        .setDescription('Select the appropriate department below to open a private support ticket with our team.');

    const row = new ActionRowBuilder();
    
    // Loops through the dynamic array so you can add/remove buttons instantly
    CONFIG.TICKET_TYPES.forEach(ticket => {
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`ticket_${ticket.id}`)
                .setLabel(ticket.label)
                .setEmoji(ticket.emoji)
                .setStyle(ButtonStyle.Secondary)
        );
    });

    await channel.send({ embeds: [embed], components: [row] });
}

// Handle Ticket Generation Interactive Logic
async function handleTicketInteraction(interaction) {
    if (!interaction.isButton()) return;

    // Check if button belongs to the dynamic ticket types
    const ticketType = CONFIG.TICKET_TYPES.find(t => `ticket_${t.id}` === interaction.customId);
    if (!ticketType) return;

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const channelName = `${ticketType.id}-${interaction.user.username}`.toLowerCase();

    // Spawn the private text channel under the configured category
    const ticketChannel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        parent: CONFIG.CHANNELS.CATEGORY_TICKETS,
        permissionOverwrites: [
            {
                id: guild.roles.everyone.id,
                deny: [PermissionFlagsBits.ViewChannel],
            },
            {
                id: interaction.user.id,
                allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
            },
            // Give staff permissions implicitly here if required
        ],
    });

    const ticketEmbed = new EmbedBuilder()
        .setColor(CONFIG.PURPLE_HEX)
        .setTitle(`Ticket: ${ticketType.label}`)
        .setDescription(`Welcome ${interaction.user}. Staff have been alerted. Please outline your issue or request below layout clearly.`);

    const closeRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId('close_ticket')
            .setLabel('Close Ticket')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ content: `${interaction.user}`, embeds: [ticketEmbed], components: [closeRow] });
    await interaction.editReply({ content: `Your ticket has been opened: ${ticketChannel}` });
}

// ==========================================
// 4. MODDING CENTRE (Core Actions)
// ==========================================
async function executeModAction(actionType, targetUserId, reason, executorTag) {
    const guild = client.guilds.cache.first(); // Grab primary guild context
    if (!guild) return false;

    try {
        const member = await guild.members.fetch(targetUserId);
        if (!member) return false;

        const logChannel = client.channels.cache.get(CONFIG.CHANNELS.MOD_LOGS);
        const logEmbed = new EmbedBuilder()
            .setColor(CONFIG.PURPLE_HEX)
            .setTitle(`Modding Centre | Action Execution`)
            .setTimestamp()
            .addFields(
                { name: 'Target User', value: `${member.user.tag} (${targetUserId})`, inline: true },
                { name: 'Action Taken', value: actionType.toUpperCase(), inline: true },
                { name: 'Authorized By', value: executorTag, inline: true },
                { name: 'Reason', value: reason || 'No specific reason given.' }
            );

        if (actionType === 'kick') {
            await member.kick(reason);
        } else if (actionType === 'ban') {
            await member.ban({ reason: reason });
        } else if (actionType === 'warn') {
            // Send direct message warning cleanly
            await member.send({ content: `⚠️ **South Wales RP Warning**\nYou have been issued a formal warning for: *${reason}*` }).catch(() => null);
        }

        if (logChannel) logChannel.send({ embeds: [logEmbed] });
        return true;
    } catch (err) {
        console.error('Error executing mod action:', err);
        return false;
    }
}

// ==========================================
// 5. WEB DASHBOARD INTEGRATION API (REST)
// ==========================================
// Trigger session start script externally
app.post('/api/announcements/start', (req, res) => {
    const success = sendSessionAnnouncement('START');
    return success ? res.json({ success: true }) : res.status(500).json({ error: 'Failed to broadcast' });
});

// Trigger session end script externally
app.post('/api/announcements/end', (req, res) => {
    const success = sendSessionAnnouncement('END');
    return success ? res.json({ success: true }) : res.status(500).json({ error: 'Failed to broadcast' });
});

// Trigger custom announcement containing image option properties
app.post('/api/announcements/custom', (req, res) => {
    const { message, imageUrl } = req.body;
    if (!message) return res.status(400).json({ error: 'Message body required' });
    
    const success = sendSessionAnnouncement('CUSTOM', message, imageUrl);
    return success ? res.json({ success: true }) : res.status(500).json({ error: 'Failed to broadcast' });
});

// Endpoint to execute tools in the Modding Centre remotely
app.post('/api/modding/execute', async (req, res) => {
    const { action, userId, reason, executor } = req.body;
    if (!action || !userId) return res.status(400).json({ error: 'Missing core attributes' });

    const result = await executeModAction(action, userId, reason, executor || 'Web Control Panel');
    return result ? res.json({ success: true }) : res.status(500).json({ error: 'Action execution failed' });
});

// ==========================================
// 6. EVENT HANDLERS & BOT RUNTIME
// ==========================================
client.once('ready', () => {
    console.log(`🤖 South Wales RP Bot online as ${client.user.tag}`);
    
    // Start Express listener server for dashboard linkups
    app.listen(CONFIG.PORT, () => {
        console.log(`🌐 Dashboard API tunnel open on port ${CONFIG.PORT}`);
    });
});

client.on('interactionCreate', async (interaction) => {
    // Process main dynamic ticket selections
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('ticket_')) {
            await handleTicketInteraction(interaction);
        }
        
        // Handle Ticket closing logic clean closure
        if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Locking down ticket channel environment in 5 seconds...' });
            setTimeout(() => {
                interaction.channel.delete().catch(() => null);
            }, 5000);
        }
    }
});

// Log the application instance layer online
client.login(CONFIG.TOKEN);
