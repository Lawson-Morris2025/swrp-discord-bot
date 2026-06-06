const { 
    Client, 
    GatewayIntentBits, 
    PermissionFlagsBits, 
    EmbedBuilder, 
    REST,
    Routes,
    ApplicationCommandOptionType,
    ChannelType,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle
} = require('discord.js');
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// ---- 1. Data Persistence Layer (Local JSON Files) ----
const WARNS_FILE = path.join(__dirname, 'warns.json');
const TICKETS_FILE = path.join(__dirname, 'tickets.json');

function readJSON(filePath) {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify({}));
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } 
    catch { return {}; }
}
function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

// ---- 2. Configuration Mappings ----
const config = {
    TOKEN: process.env.TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID,
    ANNOUNCEMENT_CHANNEL_ID: process.env.ANNOUNCEMENT_CHANNEL_ID,
    SESSION_CHANNEL_ID: process.env.SESSION_CHANNEL_ID,
    UNVERIFIED_ROLE_ID: process.env.VERIFY_ROLE_ID,
    CIVILIAN_ROLE_ID: process.env.CIVILIAN_ROLE_ID,
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || 'AdminStaffPass123!',
    TICKET_CATEGORY_ID: process.env.TICKET_CATEGORY_ID,
    TICKET_LOG_CHANNEL_ID: process.env.TICKET_LOG_CHANNEL_ID
};

// ---- 3. Bot Client Initialization ----
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ---- 4. Slash Commands Deployment Specification ----
const commands = [
    { name: 'startsession', description: 'Starts a South Wales RP session', default_member_permissions: PermissionFlagsBits.Administrator.toString() },
    { name: 'endsession', description: 'Ends the active South Wales RP session', default_member_permissions: PermissionFlagsBits.Administrator.toString() },
    { name: 'setverify', description: 'Spawns the verification instructions embed', default_member_permissions: PermissionFlagsBits.Administrator.toString() },
    { name: 'setuptickets', description: 'Spawns the multi-option ticket control panel', default_member_permissions: PermissionFlagsBits.Administrator.toString() },
    {
        name: 'verify',
        description: 'Verify your account using your Roblox username',
        options: [{ name: 'username', description: 'Your exact Roblox username', type: ApplicationCommandOptionType.String, required: true }]
    },
    {
        name: 'warn',
        description: 'Issue an official infraction to a member',
        default_member_permissions: PermissionFlagsBits.ManageMessages.toString(),
        options: [
            { name: 'target', description: 'The member to warn', type: ApplicationCommandOptionType.User, required: true },
            { name: 'reason', description: 'Reason for this warning assignment', type: ApplicationCommandOptionType.String, required: true }
        ]
    }
];

const rest = new REST({ version: '10' }).setToken(config.TOKEN);
(async () => {
    try {
        console.log('🔄 Syncing slash interactions...');
        await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
        console.log('✅ Slash interaction array synchronized globally.');
    } catch (e) { console.error('❌ Slash Command Error:', e); }
})();

// ---- 5. Progressive Punishment Logic Engine ----
async function applyWarning(guild, targetUser, reason, staffName) {
    const data = readJSON(WARNS_FILE);
    if (!data[targetUser.id]) data[targetUser.id] = [];
    
    data[targetUser.id].push({ reason, staff: staffName, timestamp: new Date().toISOString() });
    writeJSON(WARNS_FILE, data);

    const activeCount = data[targetUser.id].length;
    const member = await guild.members.fetch(targetUser.id).catch(() => null);

    let actionTaken = `Warning #${activeCount} recorded.`;
    let embedColor = '#FFFF00';

    const dmEmbed = new EmbedBuilder()
        .setTitle(`⚠️ Official Infraction Issued | South Wales RP`)
        .setDescription(`An official strike has been placed against your account.\n\n**Reason:** ${reason}\n**Current Warning Count:** ${activeCount}`)
        .setTimestamp();

    if (activeCount === 1) {
        dmEmbed.setColor('#FFFF00').setFooter({ text: 'Please read our community rules to ensure this stays an isolated issue.' });
        if (member) await member.send({ embeds: [dmEmbed] }).catch(() => {});
    } else if (activeCount === 2) {
        embedColor = '#FFA500';
        dmEmbed.setColor('#FFA500').setTitle('⚠️ FINAL NOTICE | South Wales RP').setDescription(`This is your absolute final warning. Any further infractions will result in automated account removal.\n\n**Reason:** ${reason}`);
        if (member) await member.send({ embeds: [dmEmbed] }).catch(() => {});
    } else if (activeCount === 3) {
        embedColor = '#FF0000';
        actionTaken = 'User automatically KICKED from the guild environment.';
        dmEmbed.setColor('#FF0000').setTitle('🔴 Account Kicked | South Wales RP').setDescription(`You have been automatically kicked after receiving 3 warnings.\n\n**Trigger Reason:** ${reason}`);
        if (member) {
            await member.send({ embeds: [dmEmbed] }).catch(() => {});
            await member.kick(`Automated system enforcement: 3 accumulated warnings. Trigger: ${reason}`).catch(() => {});
        }
    } else if (activeCount >= 4) {
        embedColor = '#000000';
        actionTaken = 'User permanently BANNED from the community.';
        dmEmbed.setColor('#000000').setTitle('🚫 Permanent Ban Executed | South Wales RP').setDescription(`Your access has been permanently revoked due to excessive rule violations.\n\n**Final Trigger:** ${reason}`);
        if (member) await member.send({ embeds: [dmEmbed] }).catch(() => {});
        await guild.bans.create(targetUser.id, { reason: `Automated system enforcement: 4+ warnings. Trigger: ${reason}` }).catch(() => {});
    }

    return { activeCount, actionTaken, embedColor };
}

// ---- 6. Core Discord Events & Commands ----
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName, guild, channel, options, member } = interaction;
        if (!guild) return interaction.reply({ content: 'Commands can only be run inside the server.', ephemeral: true });

        if (commandName === 'setverify') {
            const embed = new EmbedBuilder()
                .setTitle('🔐 Verification Portal')
                .setDescription('Welcome to **South Wales Roleplay**!\n\nTo access our full array of channels and operations, type **`/verify`** below, supply your exact Roblox username, and submit.')
                .setColor('#00FF00');
            await channel.send({ embeds: [embed] });
            return interaction.reply({ content: 'Verification frame posted.', ephemeral: true });
        }

        if (commandName === 'setuptickets') {
            const embed = new EmbedBuilder()
                .setTitle('🎫 South Wales RP Support Center')
                .setDescription('Need help from an administrator or want to file a formal complaint? Click one of the buttons below to open a private ticket room.')
                .setColor('#00A8F3');

            // Two distinct buttons on one control bar
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('open_ticket_general')
                    .setLabel('General Support')
                    .setEmoji('🎫')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('open_ticket_report')
                    .setLabel('Report a Player')
                    .setEmoji('⚠️')
                    .setStyle(ButtonStyle.Danger)
            );

            await channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: 'Multi-button support widget spawned successfully.', ephemeral: true });
        }

        if (commandName === 'verify') {
            const robloxUser = options.getString('username');
            const targetName = `${member.user.username} - ${robloxUser}`;
            try {
                await member.setNickname(targetName.substring(0, 32));
                const unv = await guild.roles.fetch(config.UNVERIFIED_ROLE_ID).catch(() => null);
                const civ = await guild.roles.fetch(config.CIVILIAN_ROLE_ID).catch(() => null);
                if (civ) await member.roles.add(civ);
                if (unv && member.roles.cache.has(unv.id)) await member.roles.remove(unv);
                return interaction.reply({ content: `✅ Successfully verified as **${targetName}**! Welcome to the community.`, ephemeral: true });
            } catch {
                return interaction.reply({ content: '❌ Role assignment error. Check that the bot is placed above roles in server settings.', ephemeral: true });
            }
        }

        if (commandName === 'warn') {
            const target = options.getUser('target');
            const reason = options.getString('reason');
            await interaction.deferReply({ ephemeral: true });
            const result = await applyWarning(guild, target, reason, member.user.tag);
            
            const logEmbed = new EmbedBuilder()
                .setTitle('⚖️ System Dispatched Action')
                .setDescription(`**Target:** <@${target.id}>\n**Strike Level:** ${result.activeCount}\n**Reason:** ${reason}\n**Action Implemented:** ${result.actionTaken}`)
                .setColor(result.embedColor);
            return interaction.editReply({ embeds: [logEmbed] });
        }
    }

    // ---- 7. Interactive Ticket Processing Logic ----
    if (interaction.isButton()) {
        const { guild, user, channel } = interaction;

        if (interaction.customId === 'open_ticket_general' || interaction.customId === 'open_ticket_report') {
            await interaction.deferReply({ ephemeral: true });
            const isReport = interaction.customId === 'open_ticket_report';

            const tickets = readJSON(TICKETS_FILE);
            if (Object.values(tickets).some(t => t.userId === user.id && t.status === 'open')) {
                return interaction.editReply({ content: '❌ You already have an active support request open.' });
            }

            // Create private textual channel under designated parent folder
            const ticketChannel = await guild.channels.create({
                name: `${isReport ? 'report' : 'ticket'}-${user.username}`,
                type: ChannelType.GuildText,
                parent: config.TICKET_CATEGORY_ID || null,
                permissionOverwrites: [
                    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                    { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                ]
            });

            tickets[ticketChannel.id] = { userId: user.id, status: 'open', type: isReport ? 'report' : 'general', timestamp: new Date().toISOString() };
            writeJSON(TICKETS_FILE, tickets);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
            );

            // Conditional Scripting based on which button was pushed
            const welcomeEmbed = new EmbedBuilder().setTimestamp();
            if (isReport) {
                welcomeEmbed
                    .setTitle(`⚠️ Player Report Filed | ${user.username}`)
                    .setDescription('Thank you for submitting a player report. To speed up the process, please provide:\n\n• **Username of offender**\n• **Rule they broke**\n• **Video or screenshot evidence**\n\nStaff will review this layout shortly.')
                    .setColor('#FF0000');
            } else {
                welcomeEmbed
                    .setTitle(`🎫 General Ticket Opened | ${user.username}`)
                    .setDescription('Welcome to your support channel. Please drop a detailed message explaining your inquiry or issue, and our staff team will assist you shortly.\n\nTo lock this channel, press the button below.')
                    .setColor('#00A8F3');
            }

            await ticketChannel.send({ content: `<@${user.id}> | Support Channel Pinned`, embeds: [welcomeEmbed], components: [row] });
            return interaction.editReply({ content: `✅ Private workspace prepared: <#${ticketChannel.id}>` });
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.deferReply();
            
            const tickets = readJSON(TICKETS_FILE);
            if (tickets[channel.id]) {
                tickets[channel.id].status = 'closed';
                writeJSON(TICKETS_FILE, tickets);
            }

            await channel.send('🔒 *Closing sequence initialized. Compiling transcripts and removing channel...*');
            
            if (config.TICKET_LOG_CHANNEL_ID) {
                const logChan = await guild.channels.fetch(config.TICKET_LOG_CHANNEL_ID).catch(() => null);
                if (logChan) {
                    const archiveEmbed = new EmbedBuilder()
                        .setTitle('📊 Support Transcript Archived')
                        .setDescription(`**Channel Label:** ${channel.name}\n**Lifecycle Status:** Terminated and Saved\n**Archival Time:** ${new Date().toLocaleString()}`)
                        .setColor('#FF0000');
                    await logChan.send({ embeds: [archiveEmbed] });
                }
            }
            setTimeout(() => channel.delete().catch(() => {}), 4000);
        }
    }
});

// ---- 8. Web Operations UI Framework (Express Server) ----
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

const UI_STYLE = `
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0c0f12; color: #e2e8f0; margin:0; padding:40px; }
  .box { background: #141923; padding: 30px; border-radius: 8px; border: 1px solid #1e293b; max-width: 600px; margin: 0 auto 20px auto; box-shadow: 0 4px 6px rgba(0,0,0,0.3); }
  h2 { color: #3b82f6; margin-top:0; font-weight: 600; border-bottom: 1px solid #1e293b; padding-bottom: 10px; }
  input, textarea, select { width: 100%; padding: 12px; margin: 8px 0 18px 0; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 4px; box-sizing: border-box; }
  button { background: #2563eb; color: #fff; border: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; cursor: pointer; width: 100%; transition: background 0.2s; }
  button:hover { background: #1d4ed8; }
  .nav { text-align: center; margin-bottom: 30px; }
  .nav a { color: #94a3b8; text-decoration: none; margin: 0 15px; font-weight: bold; }
  .nav a:hover { color: #3b82f6; }
</style>
`;

function checkAuth(req, res, next) {
    if (req.cookies.auth === config.DASHBOARD_PASSWORD) return next();
    res.send(`
        ${UI_STYLE}
        <div class="box" style="margin-top: 100px;">
            <h2>🔒 Staff Portal Access Verification</h2>
            <form method="POST" action="/login">
                <label>Enter Master Administration Password:</label>
                <input type="password" name="password" required />
                <button type="submit">Authenticate Session</button>
            </form>
        </div>
    `);
}

app.post('/login', (req, res) => {
    if (req.body.password === config.DASHBOARD_PASSWORD) {
        res.cookie('auth', config.DASHBOARD_PASSWORD, { maxAge: 900000, httpOnly: true });
        return res.redirect('/');
    }
    res.send("<script>alert('Incorrect Password Profile Credential'); window.location='/';</script>");
});

app.get('/', checkAuth, (req, res) => {
    res.send(`
        ${UI_STYLE}
        <div class="nav">
            <a href="/">🛡️ Infractions System</a> | <a href="/broadcast">📡 Server Broadcasts</a>
        </div>
        <div class="box">
            <h2>🛡️ Web Infractions Command Center</h2>
            <form method="POST" action="/warn">
                <label>Target User Discord Unique ID:</label>
                <input type="text" name="userId" placeholder="e.g. 3828392102" required />
                
                <label>Infraction / Rule Breach Detail Entry:</label>
                <textarea name="reason" rows="4" placeholder="Input context, rule broken, or administrative notes..." required></textarea>
                
                <button type="submit">Dispatch Punishment Sequence</button>
            </form>
        </div>
    `);
});

app.get('/broadcast', checkAuth, (req, res) => {
    res.send(`
        ${UI_STYLE}
        <div class="nav">
            <a href="/">🛡️ Infractions System</a> | <a href="/broadcast">📡 Server Broadcasts</a>
        </div>
        <div class="box">
            <h2>📡 Operations Session Broadcast Systems</h2>
            <form method="POST" action="/broadcast">
                <label>Transmission Payload Profile:</label>
                <select name="type">
                    <option value="start">🔵 Trigger Session Open Broadcast</option>
                    <option value="end">🔴 Trigger Session Close Broadcast</option>
                </select>
                <button type="submit">Launch System Wide Transmission</button>
            </form>
        </div>
    `);
});

app.post('/warn', checkAuth, async (req, res) => {
    const { userId, reason } = req.body;
    const guild = await client.guilds.fetch(config.GUILD_ID).catch(() => null);
    if (!guild) return res.send("<script>alert('Configured Guild Context is currently Offline'); window.location='/';</script>");
    
    const targetUser = await client.users.fetch(userId).catch(() => null);
    if (!targetUser) return res.send("<script>alert('Target User lookup failed. Double check the ID.'); window.location='/';</script>");

    const execution = await applyWarning(guild, targetUser, reason, 'Web Dashboard Admin');
    res.send(`<script>alert('Success: Level ${execution.activeCount} applied. Action Status: ${execution.actionTaken}'); window.location='/';</script>`);
});

app.post('/broadcast', checkAuth, async (req, res) => {
    const { type } = req.body;
    const guild = await client.guilds.fetch(config.GUILD_ID).catch(() => null);
    const sessionChan = await guild?.channels.fetch(config.SESSION_CHANNEL_ID).catch(() => null);
    
    if (!sessionChan) return res.send("<script>alert('Session channel channel trace missing.'); window.location='/broadcast';</script>");

    const embed = new EmbedBuilder().setTimestamp();
    if (type === 'start') {
        embed.setTitle('🔵 SOUTH WALES RP SESSION STARTED').setDescription('A new roleplay session is officially active.\n\nEnsure you remain in character, choose clean vehicle variants, and obey local policing configurations.').setColor('#0000FF');
    } else {
        embed.setTitle('🔴 SOUTH WALES RP SESSION ENDED').setDescription('The session block has been formally drawn to a close.\n\nClear all configurations down out of channels. Thanks for attending!').setColor('#FF0000');
    }

    await sessionChan.send({ content: '@everyone', embeds: [embed] });
    res.send("<script>alert('Network broadcast completed.'); window.location='/broadcast';</script>");
});

app.listen(PORT, () => console.log(`🌐 Web interface cluster operational on port: ${PORT}`));
client.login(config.TOKEN);
