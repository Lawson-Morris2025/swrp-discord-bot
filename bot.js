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

// ---- 1. Persistent Storage Arrays ----
const WARNS_FILE = path.join(__dirname, 'warns.json');
const TICKETS_FILE = path.join(__dirname, 'tickets.json');
const PANEL_CONFIG_FILE = path.join(__dirname, 'panel_config.json');

function readJSON(filePath, defaultStructure = {}) {
    if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(defaultStructure));
    try { return JSON.parse(fs.readFileSync(filePath, 'utf8')); } 
    catch { return defaultStructure; }
}
function writeJSON(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
}

// Initial panel setup configurations fallback values
const initialPanelConfig = {
    title: "South Wales RP Support Center",
    description: "Need help from an administrator or want to file a formal complaint? Click one of the buttons below to open a private ticket room.",
    color: "#00A8F3",
    btn1Label: "General Support",
    btn1Emoji: "🎫",
    btn2Label: "Report a Player",
    btn2Emoji: "⚠️"
};
let currentPanel = readJSON(PANEL_CONFIG_FILE, initialPanelConfig);

// ---- 2. Application Config Matrix ----
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

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ---- 3. Command Deploy Registry ----
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
        await rest.put(Routes.applicationGuildCommands(config.CLIENT_ID, config.GUILD_ID), { body: commands });
        console.log('✅ Synchronized Slash interactions with production servers.');
    } catch (e) { console.error('❌ Interaction setup runtime fault:', e); }
})();

// ---- 4. Punishment Workflow Logic ----
async function applyWarning(guild, targetUser, reason, staffName) {
    const data = readJSON(WARNS_FILE);
    if (!data[targetUser.id]) data[targetUser.id] = [];
    
    data[targetUser.id].push({ 
        reason, 
        staff: staffName, 
        username: targetUser.username,
        timestamp: new Date().toISOString() 
    });
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

// ---- 5. Bot Event Broker Ecosystem ----
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName, guild, channel, options, member } = interaction;
        if (!guild) return interaction.reply({ content: 'Commands are restricted to server contexts.', ephemeral: true });

        if (commandName === 'setverify') {
            const embed = new EmbedBuilder()
                .setTitle('🔐 Verification Portal')
                .setDescription('Welcome to **South Wales Roleplay**!\n\nTo access our full array of channels and operations, type **`/verify`** below, supply your exact Roblox username, and submit.')
                .setColor('#00FF00');
            await channel.send({ embeds: [embed] });
            return interaction.reply({ content: 'Verification frame posted.', ephemeral: true });
        }

        if (commandName === 'setuptickets') {
            const currentConfig = readJSON(PANEL_CONFIG_FILE, initialPanelConfig);
            const embed = new EmbedBuilder()
                .setTitle(currentConfig.title)
                .setDescription(currentConfig.description)
                .setColor(currentConfig.color);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('open_ticket_general').setLabel(currentConfig.btn1Label).setEmoji(currentConfig.btn1Emoji).setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('open_ticket_report').setLabel(currentConfig.btn2Label).setEmoji(currentConfig.btn2Emoji).setStyle(ButtonStyle.Danger)
            );

            await channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: 'Custom configuration panel deployed.', ephemeral: true });
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
                return interaction.reply({ content: '❌ Role assignment error. Check hierarchy levels.', ephemeral: true });
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

    if (interaction.isButton()) {
        const { guild, user, channel } = interaction;

        if (interaction.customId === 'open_ticket_general' || interaction.customId === 'open_ticket_report') {
            await interaction.deferReply({ ephemeral: true });
            const isReport = interaction.customId === 'open_ticket_report';

            const tickets = readJSON(TICKETS_FILE);
            if (Object.values(tickets).some(t => t.userId === user.id && t.status === 'open')) {
                return interaction.editReply({ content: '❌ You already have an active support request open.' });
            }

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

            const welcomeEmbed = new EmbedBuilder().setTimestamp();
            if (isReport) {
                welcomeEmbed
                    .setTitle(`⚠️ Player Report Filed | ${user.username}`)
                    .setDescription('Thank you for submitting a player report. To speed up processing, please specify the exact offending handle, rules violated, and visual screen links.')
                    .setColor('#FF0000');
            } else {
                welcomeEmbed
                    .setTitle(`🎫 General Support Ticket | ${user.username}`)
                    .setDescription('Welcome. Outline your query or core server issue clearly below. An operations staff member will route here shortly.')
                    .setColor('#00A8F3');
            }

            await ticketChannel.send({ content: `<@${user.id}>`, embeds: [welcomeEmbed], components: [row] });
            return interaction.editReply({ content: `✅ Ticket room online: <#${ticketChannel.id}>` });
        }

        if (interaction.customId === 'close_ticket') {
            await interaction.deferReply();
            const tickets = readJSON(TICKETS_FILE);
            if (tickets[channel.id]) tickets[channel.id].status = 'closed';
            writeJSON(TICKETS_FILE, tickets);

            await channel.send('🔒 *Closing sequence initialized. Purging configuration files layout...*');
            if (config.TICKET_LOG_CHANNEL_ID) {
                const logChan = await guild.channels.fetch(config.TICKET_LOG_CHANNEL_ID).catch(() => null);
                if (logChan) {
                    const archiveEmbed = new EmbedBuilder()
                        .setTitle('📊 Transcript Session Terminated')
                        .setDescription(`**Channel:** ${channel.name}\n**Lifecycle:** Closed and Logged\n**Time:** ${new Date().toLocaleString()}`)
                        .setColor('#FF0000');
                    await logChan.send({ embeds: [archiveEmbed] });
                }
            }
            setTimeout(() => channel.delete().catch(() => {}), 4000);
        }
    }
});

// ---- 6. Advanced Web Interface Dashboard (Express Engine) ----
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());

// Shared Master Interface Wrapper Layout Layout template syntax
function renderDashboard(activeTab, contentHTML) {
    return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>SWRP Command Dashboard</title>
        <style>
            :root { --bg-base: #0a0d12; --bg-surface: #121824; --bg-input: #1b2336; --accent: #3b82f6; --accent-hover: #2563eb; --text-main: #f1f5f9; --text-muted: #64748b; --border: #1e293b; --danger: #ef4444; }
            body { font-family: 'Inter', system-ui, -apple-system, sans-serif; background: var(--bg-base); color: var(--text-main); margin: 0; display: flex; height: 100vh; overflow: hidden; }
            .sidebar { width: 260px; background: var(--bg-surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; padding: 25px 15px; box-sizing: border-box; }
            .sidebar h1 { font-size: 1.1rem; text-transform: uppercase; letter-spacing: 1px; color: var(--accent); margin: 0 0 30px 10px; font-weight: 800; }
            .nav-group { display: flex; flex-direction: column; gap: 8px; flex-grow: 1; }
            .nav-link { display: flex; align-items: center; padding: 12px 15px; color: var(--text-main); text-decoration: none; border-radius: 6px; font-weight: 500; font-size: 0.95rem; transition: background 0.2s, color 0.2s; }
            .nav-link:hover { background: var(--bg-input); color: var(--accent); }
            .nav-link.active { background: var(--accent); color: #fff; }
            .logout-btn { padding: 12px 15px; text-decoration: none; color: var(--danger); font-weight: 600; font-size: 0.95rem; border-top: 1px solid var(--border); margin-top: auto; }
            .viewport { flex-grow: 1; padding: 40px; box-sizing: border-box; overflow-y: auto; background: linear-gradient(180deg, #0d121c 0%, var(--bg-base) 100%); }
            .card { background: var(--bg-surface); border: 1px solid var(--border); padding: 30px; border-radius: 10px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.4); max-width: 900px; }
            h2 { font-size: 1.6rem; font-weight: 700; margin-top: 0; margin-bottom: 25px; color: #fff; border-bottom: 2px solid var(--border); padding-bottom: 12px; }
            label { display: block; font-size: 0.85rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 8px; }
            input, textarea, select { width: 100%; padding: 12px 16px; background: var(--bg-input); border: 1px solid var(--border); color: #fff; border-radius: 6px; font-size: 0.95rem; box-sizing: border-box; margin-bottom: 20px; transition: border-color 0.2s; }
            input:focus, textarea:focus, select:focus { border-color: var(--accent); outline: none; }
            button { background: var(--accent); color: white; border: none; padding: 14px 28px; border-radius: 6px; font-weight: 700; cursor: pointer; transition: background 0.2s; width: 100%; font-size: 0.95rem; }
            button:hover { background: var(--accent-hover); }
            .split-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
            .search-box { margin-bottom: 20px; position: relative; }
            .audit-table-wrapper { border: 1px solid var(--border); border-radius: 6px; overflow: hidden; background: var(--bg-input); margin-top: 15px; max-height: 400px; overflow-y: auto; }
            table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.9rem; }
            th { background: #151d2d; padding: 14px 16px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem; border-bottom: 1px solid var(--border); }
            td { padding: 14px 16px; border-bottom: 1px solid var(--border); color: #cbd5e1; }
            tr:last-child td { border-bottom: none; }
            .badge { background: #22c55e; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold; }
            .badge.kick { background: #ea580c; }
            .badge.ban { background: #dc2626; }
        </style>
    </head>
    <body>
        <div class="sidebar">
            <h1>SWRP Portal</h1>
            <div class="nav-group">
                <a href="/" class="nav-link ${activeTab === 'home' ? 'active' : ''}">🏠 Home Station</a>
                <a href="/tickets" class="nav-link ${activeTab === 'tickets' ? 'active' : ''}">🎫 Ticket Control</a>
                <a href="/broadcast" class="nav-link ${activeTab === 'broadcast' ? 'active' : ''}">📡 Radio Broadcasts</a>
                <a href="/punishments" class="nav-link ${activeTab === 'punishments' ? 'active' : ''}">🛡️ Infraction Center</a>
            </div>
            <a href="/logout" class="logout-btn">🔒 Terminate Session</a>
        </div>
        <div class="viewport">
            ${contentHTML}
        </div>
    </body>
    </html>
    `;
}

function checkAuth(req, res, next) {
    if (req.cookies.auth === config.DASHBOARD_PASSWORD) return next();
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Login | SWRP Control</title>
        <style>
            body { font-family: system-ui, sans-serif; background: #0a0d12; color: #fff; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .login-card { background: #121824; border: 1px solid #1e293b; padding: 40px; border-radius: 10px; width: 100%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
            h2 { margin-top: 0; color: #3b82f6; font-size: 1.4rem; text-transform: uppercase; font-weight: 800; text-align: center; margin-bottom: 30px; }
            input { width: 100%; padding: 12px; background: #1b2336; border: 1px solid #1e293b; color: #fff; border-radius: 6px; box-sizing: border-box; margin-bottom: 20px; font-size: 1rem; text-align: center; }
            button { width: 100%; background: #3b82f6; color: #fff; border: none; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; }
            button:hover { background: #2563eb; }
        </style>
    </head>
    <body>
        <div class="login-card">
            <h2>🔒 Staff Portal Access</h2>
            <form method="POST" action="/login">
                <input type="password" name="password" placeholder="Enter Administration Passkey" required />
                <button type="submit">Authenticate Session</button>
            </form>
        </div>
    </body>
    </html>
    `);
}

// ---- 7. Route Handlers ----
app.post('/login', (req, res) => {
    if (req.body.password === config.DASHBOARD_PASSWORD) {
        res.cookie('auth', config.DASHBOARD_PASSWORD, { maxAge: 3600000, httpOnly: true });
        return res.redirect('/');
    }
    res.send("<script>alert('Invalid Administrative Passkey Credentials'); window.location='/';</script>");
});

app.get('/logout', (req, res) => {
    res.clearCookie('auth');
    res.redirect('/');
});

app.get('/', checkAuth, (req, res) => {
    const html = `
        <div class="card">
            <h2>🏠 Operational Command Station</h2>
            <p style="font-size: 1.1rem; line-height: 1.6; color: #cbd5e1; margin-top:0;">Welcome back to the **South Wales Roleplay Operations Dashboard**.</p>
            <p style="color: var(--text-muted); line-height: 1.5;">Use the dedicated navigation cluster inside the left sidebar segment to adjust configuration metrics across interactive live button ticket flows, push direct emergency infrastructure announcements, or track database metrics.</p>
            <div style="margin-top: 35px; padding: 20px; background: var(--bg-input); border-radius: 6px; border: 1px solid var(--border); display: flex; gap: 30px;">
                <div><span style="color: var(--accent); font-weight: bold;">Bot State:</span> <span class="badge">Online</span></div>
                <div><span style="color: var(--accent); font-weight: bold;">Guild Connection:</span> Connected</div>
            </div>
        </div>
    `;
    res.send(renderDashboard('home', html));
});

app.get('/tickets', checkAuth, (req, res) => {
    const currentConfig = readJSON(PANEL_CONFIG_FILE, initialPanelConfig);
    const html = `
        <div class="card">
            <h2>🎫 Edit Interactive Ticket Layout Panel</h2>
            <form method="POST" action="/tickets/save">
                <div class="split-grid">
                    <div>
                        <label>Embed Panel Header Title</label>
                        <input type="text" name="title" value="${currentConfig.title}" required />
                    </div>
                    <div>
                        <label>Embed Theme Border Color hex</label>
                        <input type="text" name="color" value="${currentConfig.color}" required />
                    </div>
                </div>
                <label>Main Body Description Script Instructions Text</label>
                <textarea name="description" rows="4" required>${currentConfig.description}</textarea>
                
                <div class="split-grid" style="margin-top: 10px;">
                    <div>
                        <label>Button 1 Text Label (General Ticket)</label>
                        <input type="text" name="btn1Label" value="${currentConfig.btn1Label}" required />
                        <label>Button 1 Icon Emoji</label>
                        <input type="text" name="btn1Emoji" value="${currentConfig.btn1Emoji}" required />
                    </div>
                    <div>
                        <label>Button 2 Text Label (Report Ticket)</label>
                        <input type="text" name="btn2Label" value="${currentConfig.btn2Label}" required />
                        <label>Button 2 Icon Emoji</label>
                        <input type="text" name="btn2Emoji" value="${currentConfig.btn2Emoji}" required />
                    </div>
                </div>
                <button type="submit" style="margin-top: 10px;">Commit Configuration Overwrites</button>
            </form>
            <p style="font-size:0.85rem; color: var(--text-muted); margin-top: 15px;">⚠️ *Note: Saving configurations updates the layout memory file. Run your server-side slash command **<code>/setuptickets</code>** inside Discord to clear legacy arrays and drop the fresh layout frame.*</p>
        </div>
    `;
    res.send(renderDashboard('tickets', html));
});

app.post('/tickets/save', checkAuth, (req, res) => {
    writeJSON(PANEL_CONFIG_FILE, req.body);
    res.send("<script>alert('Embed block adjustments committed to disk successfully.'); window.location='/tickets';</script>");
});

app.get('/broadcast', checkAuth, (req, res) => {
    const html = `
        <div class="card">
            <h2>📡 Emergency Operations Radio Broadcast Array</h2>
            <form method="POST" action="/broadcast/dispatch">
                <label>Transmission Payload Profile Select</label>
                <select name="type">
                    <option value="start">🔵 Macro: Launch Active Operations Session Embed</option>
                    <option value="end">🔴 Macro: Launch Shutdown Session Embed</option>
                    <option value="custom">💬 Plain: Send Raw Custom Notification Message</option>
                </select>
                
                <label>Custom Text Transmission Body (Only applies for Raw option)</label>
                <textarea name="customMessage" rows="5" placeholder="Type custom communication lines here..."></textarea>
                
                <button type="submit">Deploy Network Transmission Array</button>
            </form>
        </div>
    `;
    res.send(renderDashboard('broadcast', html));
});

app.post('/broadcast/dispatch', checkAuth, async (req, res) => {
    const { type, customMessage } = req.body;
    const guild = await client.guilds.fetch(config.GUILD_ID).catch(() => null);
    
    if (type === 'custom') {
        const annChan = await guild?.channels.fetch(config.ANNOUNCEMENT_CHANNEL_ID).catch(() => null);
        if (!annChan) return res.send("<script>alert('Announcements channel terminal pipeline offline.'); window.location='/broadcast';</script>");
        await annChan.send({ content: customMessage });
    } else {
        const sessionChan = await guild?.channels.fetch(config.SESSION_CHANNEL_ID).catch(() => null);
        if (!sessionChan) return res.send("<script>alert('Operations radio target channel pipe offline.'); window.location='/broadcast';</script>");
        const embed = new EmbedBuilder().setTimestamp();
        if (type === 'start') {
            embed.setTitle('🔵 SOUTH WALES RP SESSION STARTED').setDescription('A new roleplay session is officially active.\n\nEnsure you remain in character, choose clean vehicle variants, and obey local policing configurations.').setColor('#0000FF');
        } else {
            embed.setTitle('🔴 SOUTH WALES RP SESSION ENDED').setDescription('The session block has been formally drawn to a close.\n\nClear all configurations down out of channels. Thanks for attending!').setColor('#FF0000');
        }
        await sessionChan.send({ content: '@everyone', embeds: [embed] });
    }
    res.send("<script>alert('Transmission successfully pushed through bot pipes.'); window.location='/broadcast';</script>");
});

app.get('/punishments', checkAuth, (req, res) => {
    const data = readJSON(WARNS_FILE);
    
    // Flatten warnings database down to structured layout arrays for front-end parsing
    let flatLogs = [];
    Object.keys(data).forEach(userId => {
        data[userId].forEach((warn, index) => {
            flatLogs.push({
                id: userId,
                username: warn.username || 'Unknown Profile',
                reason: warn.reason,
                staff: warn.staff,
                index: index + 1,
                time: warn.timestamp ? new Date(warn.timestamp).toLocaleString() : 'N/A'
            });
        });
    });
    
    // Sort chronological ordering tracking
    flatLogs.sort((a,b) => new Date(b.time) - new Date(a.time));

    let rowsHTML = '';
    flatLogs.forEach(log => {
        let levelBadge = `<span class="badge">Strike ${log.index}</span>`;
        if (log.index === 3) levelBadge = `<span class="badge kick">Kick Trigger</span>`;
        if (log.index >= 4) levelBadge = `<span class="badge ban">Ban Trigger</span>`;

        rowsHTML += `
            <tr class="log-row" data-search="${log.username.toLowerCase()} ${log.id}">
                <td><strong>${log.username}</strong><br><span style="font-size:0.75rem; color: var(--text-muted);">${log.id}</span></td>
                <td>${levelBadge}</td>
                <td style="max-width:250px; word-wrap:break-word;">${log.reason}</td>
                <td><span style="color: var(--accent); font-weight:600;">${log.staff}</span></td>
                <td style="font-size:0.8rem; color: var(--text-muted);">${log.time}</td>
            </tr>
        `;
    });

    const html = `
        <div class="card" style="max-width: 1100px;">
            <h2>🛡️ Infrastructure Safety & Infractions Center</h2>
            
            <div style="display:grid; grid-template-columns: 1fr 2fr; gap:30px; margin-bottom: 20px;">
                <div style="border-right: 1px solid var(--border); padding-right: 20px;">
                    <h3 style="color:#fff; font-size:1.1rem; margin-top:0;">File New Infraction Record</h3>
                    <form method="POST" action="/punishments/apply">
                        <label>Discord Account Profile ID Unique String</label>
                        <input type="text" name="userId" placeholder="e.g. 8493021920" required />
                        <label>Infraction Statement Reason Text</label>
                        <textarea name="reason" rows="4" placeholder="Log details regarding rule breach tracking..." required></textarea>
                        <button type="submit">Commit Infraction Rule</button>
                    </form>
                </div>
                
                <div>
                    <h3 style="color:#fff; font-size:1.1rem; margin-top:0;">Global Infractions Audit Feed Ledger</h3>
                    <div class="search-box">
                        <input type="text" id="searchInput" placeholder="🔍 Search database fields instantly by user handle string or ID matching..." style="margin-bottom:0;" />
                    </div>
                    <div class="audit-table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>Target Profile</th>
                                    <th>Warning Level Index</th>
                                    <th>Reason Violation Statement</th>
                                    <th>Responsible Staff Member</th>
                                    <th>Logged Timestamp</th>
                                </tr>
                            </thead>
                            <tbody id="auditTableBody">
                                ${rowsHTML ? rowsHTML : '<tr><td colspan="5" style="text-align:center; color: var(--text-muted);">No infractions logged inside local storage arrays.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>

        <script>
            // Live JavaScript Filtering Script Engine without page reloads
            const searchInput = document.getElementById('searchInput');
            const logRows = document.querySelectorAll('.log-row');
            
            if(searchInput) {
                searchInput.addEventListener('input', (e) => {
                    const term = e.target.value.toLowerCase().trim();
                    logRows.forEach(row => {
                        const searchMeta = row.getAttribute('data-search');
                        if(searchMeta.includes(term)) {
                            row.style.display = '';
                        } else {
                            row.style.display = 'none';
                        }
                    });
                });
            }
        </script>
    `;
    res.send(renderDashboard('punishments', html));
});

app.post('/punishments/apply', checkAuth, async (req, res) => {
    const { userId, reason } = req.body;
    const guild = await client.guilds.fetch(config.GUILD_ID).catch(() => null);
    if (!guild) return res.send("<script>alert('Target Guild Framework Offline'); window.location='/punishments';</script>");
    
    const targetUser = await client.users.fetch(userId).catch(() => null);
    if (!targetUser) return res.send("<script>alert('Target Discord handle verification trace broke.'); window.location='/punishments';</script>");

    const execution = await applyWarning(guild, targetUser, reason, 'Web Panel Management System');
    res.send(`<script>alert('Success: Strike applied. ${execution.actionTaken}'); window.location='/punishments';</script>`);
});

app.listen(PORT, () => console.log(`🌐 Dashboard engine listening on port ${PORT}`));
client.login(config.TOKEN);
