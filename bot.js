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
    // Reads directly from your Render environment configuration
    TOKEN: process.env.TOKEN || 'YOUR_BOT_TOKEN_HERE',
    PORT: process.env.PORT || 3000,
    PURPLE_HEX: '#7B2CBF', // Welsh royal purple dashboard accent theme
    CHANNELS: {
        ANNOUNCEMENTS: 'YOUR_ANNOUNCEMENTS_CHANNEL_ID',
        TICKET_LOGS: 'YOUR_TICKET_LOGS_CHANNEL_ID',
        MOD_LOGS: 'YOUR_MOD_LOGS_CHANNEL_ID',
        CATEGORY_TICKETS: 'YOUR_TICKETS_CATEGORY_ID'
    },
    // Dynamically managed support panel arrays (Add or remove modules safely here)
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
            .setTitle('A roleplay session is now active. Please follow all server rules and maintain realistic roleplay.')
            .setDescription(
                '🔹 **Active Staff On Duty**\n' +
                '🔹 **Professional RP Expected**\n' +
                '🔹 **Emergency Services Available**\n' +
                '🔹 **Civilian Opportunities Open**\n\n' +
                'Enjoy your time in South Wales RP!'
            );
    } else if (type === 'END') {
        embed
            .setTitle('The current roleplay session has ended. Thank you to everyone who attended.')
            .setDescription('We appreciate your support and hope to see you next time.');
    } else if (type === 'CUSTOM') {
        embed
            .setTitle('South Wales RP | Community Announcement')
            .setDescription(customText);
        
        if (imageUrl) {
            embed.setImage(imageUrl);
        }
    }

    // Sends a clean message with the raw title text exactly like the reference format
    channel.send({ 
        content: type === 'START' ? '**SOUTH WALES RP SESSION STARTED**' : type === 'END' ? '**SOUTH WALES RP SESSION ENDED**' : null, 
        embeds: [embed] 
    });
    return true;
}

// ==========================================
// 3. MODULAR TICKET PANEL
// ==========================================
async function deployTicketPanel(channelId) {
    const channel = client.channels.cache.get(channelId);
    if (!channel) return console.log('Target ticket log channel trace broken.');

    const embed = new EmbedBuilder()
        .setColor(CONFIG.PURPLE_HEX)
        .setTitle('South Wales RP | Support Hub')
        .setDescription('Need assistance? Click one of the buttons below to open a direct support ticket with our server moderators.');

    const row = new ActionRowBuilder();
    
    // Loops dynamically through your custom configuration setup array
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

// Process Ticket Button Hits
async function handleTicketInteraction(interaction) {
    if (!interaction.isButton()) return;

    const ticketType = CONFIG.TICKET_TYPES.find(t => `ticket_${t.id}` === interaction.customId);
    if (!ticketType) return;

    await interaction.deferReply({ ephemeral: true });

    const guild = interaction.guild;
    const channelName = `${ticketType.id}-${interaction.user.username}`.toLowerCase();

    // Generate isolated staff text space
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
        ],
    });

    const ticketEmbed = new EmbedBuilder()
        .setColor(CONFIG.PURPLE_HEX)
        .setTitle(`Support Room: ${ticketType.label}`)
        .setDescription(`Welcome ${interaction.user}. A member of our staff team will be with you shortly. Please explain your situation in detail below.`);

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
// 4. MODDING CENTRE (Core Management Actions)
// ==========================================
async function executeModAction(actionType, targetUserId, reason, executorTag) {
    const guild = client.guilds.cache.first();
    if (!guild) return false;

    try {
        const member = await guild.members.fetch(targetUserId);
        if (!member) return false;

        const logChannel = client.channels.cache.get(CONFIG.CHANNELS.MOD_LOGS);
        const logEmbed = new EmbedBuilder()
            .setColor(CONFIG.PURPLE_HEX)
            .setTitle(`Modding Centre Logs`)
            .setTimestamp()
            .addFields(
                { name: 'User Actioned', value: `${member.user.tag} (${targetUserId})`, inline: true },
                { name: 'Mod Action Type', value: actionType.toUpperCase(), inline: true },
                { name: 'Authorized Staff', value: executorTag, inline: true },
                { name: 'Reason Given', value: reason || 'No details provided.' }
            );

        if (actionType === 'kick') {
            await member.kick(reason);
        } else if (actionType === 'ban') {
            await member.ban({ reason: reason });
        } else if (actionType === 'warn') {
            await member.send({ content: `⚠️ **South Wales RP Notice**\nYour account has been formally warned for: *${reason}*` }).catch(() => null);
        }

        if (logChannel) logChannel.send({ embeds: [logEmbed] });
        return true;
    } catch (err) {
        console.error('Modding action processing failure:', err);
        return false;
    }
}

// ==========================================
// 5. WEB DASHBOARD ENDPOINTS (REST API)
// ==========================================
app.post('/api/announcements/start', (req, res) => {
    const success = sendSessionAnnouncement('START');
    return success ? res.json({ success: true }) : res.status(500).json({ error: 'Broadcast pipeline error' });
});

app.post('/api/announcements/end', (req, res) => {
    const success = sendSessionAnnouncement('END');
    return success ? res.json({ success: true }) : res.status(500).json({ error: 'Broadcast pipeline error' });
});

app.post('/api/announcements/custom', (req, res) => {
    const { message, imageUrl } = req.body;
    if (!message) return res.status(400).json({ error: 'Message body content required' });
    
    const success = sendSessionAnnouncement('CUSTOM', message, imageUrl);
    return success ? res.json({ success: true }) : res.status(500).json({ error: 'Broadcast pipeline error' });
});

app.post('/api/modding/execute', async (req, res) => {
    const { action, userId, reason, executor } = req.body;
    if (!action || !userId) return res.status(400).json({ error: 'Missing target parameters' });

    const result = await executeModAction(action, userId, reason, executor || 'Modding Centre Web Panel');
    return result ? res.json({ success: true }) : res.status(500).json({ error: 'Failed to complete moderation task' });
});

// ==========================================
// 6. LIFE CYCLE ROUTERS & LOGIN
// ==========================================
client.once('ready', () => {
    console.log(`🤖 South Wales RP Bot successfully running as: ${client.user.tag}`);
    
    app.listen(CONFIG.PORT, () => {
        console.log(`🌐 Modding Centre API processing traffic safely on port ${CONFIG.PORT}`);
    });
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId.startsWith('ticket_')) {
            await handleTicketInteraction(interaction);
        }
        
        if (interaction.customId === 'close_ticket') {
            await interaction.reply({ content: 'Closing channel workspace setup cleanly in 5 seconds...' });
            setTimeout(() => {
                interaction.channel.delete().catch(() => null);
            }, 5000);
        }
    }
});

client.login(CONFIG.TOKEN);
