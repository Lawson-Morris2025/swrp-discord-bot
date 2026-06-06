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
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');

// ==========================================
// 1. INITIALIZATION & DYNAMIC CONFIG
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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Configurations automatically link to your Render Environment settings
const CONFIG = {
    TOKEN: process.env.TOKEN,
    PORT: process.env.PORT || 10000,
    PURPLE_HEX: '#7B2CBF', 
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || 'StaffPass123',
    CHANNELS: {
        ANNOUNCEMENTS: process.env.ANNOUNCEMENTS_CHANNEL_ID,
        TICKET_LOGS: process.env.TICKET_LOG_CHANNEL_ID,
        MOD_LOGS: process.env.MOD_LOGS_CHANNEL_ID,
        CATEGORY_TICKETS: process.env.TICKET_CATEGORY_ID
    },
    // Dynamic modular buttons. You can add or drop objects here easily
    TICKET_TYPES: [
        { id: 'support', label: 'General Support', emoji: '🎫' },
        { id: 'player_report', label: 'Report a Player', emoji: '⚠️' }
    ]
};

// Internal transient data tracker for warns
let globalWarns = []; 

// ==========================================
// 2. MIDDLEWARE & COMPREHENSIVE WEB STYLING
// ==========================================
function checkAuth(req, res, next) {
    if (req.cookies.auth === CONFIG.DASHBOARD_PASSWORD) return next();
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Login | SWRP Control</title>
        <style>
            body { font-family: 'Segoe UI', sans-serif; background: #F8F9FA; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
            .login-card { background: #FFFFFF; padding: 40px; border-radius: 12px; width: 100%; max-width: 360px; box-shadow: 0 10px 25px rgba(123, 44, 191, 0.1); border: 1px solid #E2E8F0; text-align: center; }
            h2 { margin-top: 0; color: #7B2CBF; font-size: 1.4rem; font-weight: 700; margin-bottom: 25px; }
            input { width: 100%; padding: 12px; background: #F3E8FF; border: 1px solid #E2E8F0; color: #2D3748; border-radius: 6px; box-sizing: border-box; margin-bottom: 20px; font-size: 1rem; text-align: center; }
            button { width: 100%; background: #7B2CBF; color: #fff; border: none; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 1rem; cursor: pointer; transition: 0.2s; }
            button:hover { background: #5A189A; }
        </style>
    </head>
    <body>
        <div class="login-card">
            <h2>🔒 Staff Portal Login</h2>
            <form method="POST" action="/login">
                <input type="password" name="password" placeholder="Enter Dashboard Password" required />
                <button type="submit">Log In</button>
            </form>
        </div>
    </body>
    </html>
    `);
}

const UI_STYLE = `
<style>
    :root {
        --bg-main: #F8F9FA;
        --bg-card: #FFFFFF;
        --purple-primary: #7B2CBF;
        --purple-dark: #5A189A;
        --purple-light: #F3E8FF;
        --text-dark: #2D3748;
        --text-muted: #718096;
        --border-color: #E2E8F0;
    }
    body { font-family: 'Segoe UI', system-ui, sans-serif; background-color: var(--bg-main); color: var(--text-dark); margin: 0; display: flex; height: 100vh; }
    .sidebar { width: 260px; background-color: var(--purple-primary); color: white; display: flex; flex-direction: column; padding: 30px 20px; box-sizing: border-box; }
    .sidebar h1 { font-size: 1.2rem; margin: 0 0 40px 0; letter-spacing: 1px; text-align: center; border-bottom: 2px solid rgba(255,255,255,0.2); padding-bottom: 15px; }
    .nav-link { color: rgba(255,255,255,0.8); text-decoration: none; padding: 12px 15px; border-radius: 8px; margin-bottom: 8px; display: block; font-weight: 600; transition: all 0.2s; }
    .nav-link:hover, .nav-link.active { background-color: rgba(255,255,255,0.2); color: white; }
    .content { flex-grow: 1; padding: 40px; overflow-y: auto; box-sizing: border-box; }
    .card { background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; padding: 30px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); max-width: 850px; margin-bottom: 30px; }
    h2 { color: var(--purple-dark); margin-top: 0; margin-bottom: 20px; font-size: 1.5rem; }
    p { color: var(--text-muted); line-height: 1.6; }
    input, textarea, select { width: 100%; padding: 12px; background: #FFF; border: 1px solid var(--border-color); color: var(--text-dark); border-radius: 6px; margin-bottom: 20px; box-sizing: border-box; }
    input:focus, textarea:focus, select:focus { border-color: var(--purple-primary); outline: none; }
    .btn { background-color: var(--purple-primary); color: white; border: none; padding: 12px 24px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 0.95rem; transition: background 0.2s; width: 100%; }
    .btn:hover { background-color: var(--purple-dark); }
    .split-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 15px; text-align: left; }
    th { background: var(--purple-light); color: var(--purple-dark); padding: 12px; font-weight: 600; }
    td { padding: 12px; border-bottom: 1px solid var(--border-color); }
</style>
`;

function buildPage(activeTab, contentBody) {
    return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"><title>SWRP Dashboard</title>${UI_STYLE}</head>
    <body>
        <div class="sidebar">
            <h1>South Wales RP</h1>
            <a href="/" class="nav-link ${activeTab === 'home' ? 'active' : ''}">🏠 Home Station</a>
            <a href="/announcements" class="nav-link ${activeTab === 'announcements' ? 'active' : ''}">📢 Announcements</a>
            <a href="/tickets" class="nav-link ${activeTab === 'tickets' ? 'active' : ''}">🎫 Ticket Settings</a>
            <a href="/modding" class="nav-link ${activeTab === 'modding' ? 'active' : ''}">🛡️ Modding Centre</a>
            <a href="/logout" class="nav-link" style="margin-top: auto; color: #FF8888;">🔒 Log Out</a>
        </div>
        <div class="content">${contentBody}</div>
    </body>
    </html>`;
}

// ==========================================
// 3. FRONTEND UI ROUTING WEB INTERFACES
// ==========================================
app.post('/login', (req, res) => {
    if (req.body.password === CONFIG.DASHBOARD_PASSWORD) {
        res.cookie('auth', CONFIG.DASHBOARD_PASSWORD, { maxAge: 3600000, httpOnly: true });
        return res.redirect('/');
    }
    res.send("<script>alert('Invalid Passkey'); window.location='/';</script>");
});

app.get('/logout', (req, res) => {
    res.clearCookie('auth');
    res.redirect('/');
});

app.get('/', checkAuth, (req, res) => {
    res.send(buildPage('home', `
        <div class="card">
            <h2>🏠 Operational Command Station</h2>
            <p>Welcome to the South Wales Roleplay Dashboard. This system provides live access controls directly linked to your server instance.</p>
            <div style="margin-top: 30px; padding: 15px; background: var(--purple-light); border-radius: 8px; color: var(--purple-dark); font-weight: 600;">
                🤖 Connection Status: Online and Syncing with Discord
            </div>
        </div>
    `));
});

app.get('/announcements', checkAuth, (req, res) => {
    res.send(buildPage('announcements', `
        <div class="card">
            <h2>📢 Announcements Hub</h2>
            <p>Post interactive macros or custom news notifications instantly into your server announcements channel.</p>
            
            <form method="POST" action="/announcements/dispatch">
                <label style="font-weight: bold; display: block; margin-bottom: 5px;">Select Option Template</label>
                <select name="type">
                    <option value="START">🟢 Broadcast: Start Session Template</option>
                    <option value="END">🔴 Broadcast: End Session Template</option>
                    <option value="CUSTOM">💬 Broadcast: Custom Announcement (Uses text field below)</option>
                </select>

                <label style="font-weight: bold; display: block; margin-bottom: 5px;">Custom Announcement Message</label>
                <textarea name="message" rows="4" placeholder="Type customized notices here..."></textarea>

                <label style="font-weight: bold; display: block; margin-bottom: 5px;">Optional Photo URL Attachment</label>
                <input type="text" name="imageUrl" placeholder="https://i.imgur.com/example.png" />

                <button type="submit" class="btn">Send Announcement</button>
            </form>
        </div>
    `));
});

app.post('/announcements/dispatch', checkAuth, async (req, res) => {
    const { type, message, imageUrl } = req.body;
    const channel = client.channels.cache.get(CONFIG.CHANNELS.ANNOUNCEMENTS);
    if (!channel) return res.send("<script>alert('Channel not found. Verify Render environment variables.'); window.location='/announcements';</script>");

    const embed = new EmbedBuilder().setColor(CONFIG.PURPLE_HEX).setTimestamp();

    if (type === 'START') {
        embed.setTitle('A roleplay session is now active. Please follow all server rules and maintain realistic roleplay.')
             .setDescription('🔹 **Active Staff On Duty**\n🔹 **Professional RP Expected**\n🔹 **Emergency Services Available**\n🔹 **Civilian Opportunities Open**\n\nEnjoy your time in South Wales RP!');
        await channel.send({ content: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 **SOUTH WALES RP SESSION STARTED** 🏴󠁧󠁢󠁷󠁬󠁳󠁿', embeds: [embed] });
    } else if (type === 'END') {
        embed.setTitle('The current roleplay session has ended. Thank you to everyone who attended.')
             .setDescription('We appreciate your support and hope to see you next time.');
        await channel.send({ content: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 **SOUTH WALES RP SESSION ENDED** 🏴󠁧󠁢󠁷󠁬󠁳󠁿', embeds: [embed] });
    } else if (type === 'CUSTOM') {
        embed.setTitle('South Wales RP | Server Notice').setDescription(message);
        if (imageUrl) embed.setImage(imageUrl);
        await channel.send({ embeds: [embed] });
    }

    res.send("<script>alert('Announcement broadcasted cleanly!'); window.location='/announcements';</script>");
});

app.get('/tickets', checkAuth, (req, res) => {
    res.send(buildPage('tickets', `
        <div class="card">
            <h2>🎫 Interactive Ticket Interface Control</h2>
            <p>Deploy a clean ticket creation module framework cleanly. Clicking the dispatch button sends a dynamic selection interface containing active buttons.</p>
            <form method="POST" action="/tickets/deploy">
                <label style="font-weight: bold; display: block; margin-bottom: 5px;">Target Text Channel ID</label>
                <input type="text" name="targetChannelId" placeholder="Paste text channel ID here..." required />
                <button type="submit" class="btn">Deploy Live Panel</button>
            </form>
        </div>
    `));
});

app.post('/tickets/deploy', checkAuth, async (req, res) => {
    const channel = client.channels.cache.get(req.body.targetChannelId);
    if (!channel) return res.send("<script>alert('Target text channel not found.'); window.location='/tickets';</script>");

    const embed = new EmbedBuilder()
        .setColor(CONFIG.PURPLE_HEX)
        .setTitle('South Wales RP | Support Portal')
        .setDescription('Need support or want to report a rule breaker? Click an action button below to spin up a private room with our administration team.');

    const row = new ActionRowBuilder();
    CONFIG.TICKET_TYPES.forEach(t => {
        row.addComponents(new ButtonBuilder().setCustomId(`ticket_${t.id}`).setLabel(t.label).setEmoji(t.emoji).setStyle(ButtonStyle.Secondary));
    });

    await channel.send({ embeds: [embed], components: [row] });
    res.send("<script>alert('Panel successfully dropped inside Discord.'); window.location='/tickets';</script>");
});

app.get('/modding', checkAuth, (req, res) => {
    let logRows = '';
    globalWarns.forEach(w => {
        logRows += `<tr><td>${w.user}</td><td>${w.action}</td><td>${w.reason}</td><td>${w.by}</td></tr>`;
    });

    res.send(buildPage('modding', `
        <div class="card">
            <h2>🛡️ Modding Centre Hub</h2>
            <div class="split-layout">
                <div>
                    <h3 style="color: var(--purple-dark);">Issue Mod Action</h3>
                    <form method="POST" action="/modding/execute">
                        <label>Discord Target User ID</label>
                        <input type="text" name="userId" required />
                        <label>Select Action Type</label>
                        <select name="action">
                            <option value="warn">Formal Account Warning Notice</option>
                            <option value="kick">Execute Server Kick Connection</option>
                            <option value="ban">Execute Permanent Instance Ban</option>
                        </select>
                        <label>Reason Notes Statement</label>
                        <textarea name="reason" rows="3" required></textarea>
                        <button type="submit" class="btn">Execute Action</button>
                    </form>
                </div>
                <div>
                    <h3 style="color: var(--purple-dark);">Live Incidents Log History</h3>
                    <input type="text" id="search" placeholder="Filter log inputs directly..." style="padding:8px;" onkeyup="filterTable()"/>
                    <table>
                        <thead>
                            <tr><th>Target ID</th><th>Action</th><th>Reason Given</th><th>Authorized Staff</th></tr>
                        </thead>
                        <tbody id="tableBody">
                            ${logRows || '<tr><td colspan="4" style="text-align:center;">No modifications logged yet.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
        <script>
            function filterTable() {
                var input = document.getElementById("search").value.toLowerCase();
                var rows = document.getElementById("tableBody").getElementsByTagName("tr");
                for(var i=0; i<rows.length; i++) {
                    rows[i].style.display = rows[i].innerText.toLowerCase().includes(input) ? "" : "none";
                }
            }
        </script>
    `));
});

app.post('/modding/execute', checkAuth, async (req, res) => {
    const { userId, action, reason } = req.body;
    const guild = client.guilds.cache.first();
    if (!guild) return res.send("<script>alert('Guild offline.'); window.location='/modding';</script>");

    try {
        const member = await guild.members.fetch(userId).catch(() => null);
        if (!member) return res.send("<script>alert('Target User ID profile not found.'); window.location='/modding';</script>");

        if (action === 'kick') await member.kick(reason);
        else if (action === 'ban') await member.ban({ reason });
        else if (action === 'warn') await member.send({ content: `⚠️ **Notice | South Wales RP**\nYour profile has been warned for: *${reason}*` }).catch(() => null);

        globalWarns.push({ user: userId, action, reason, by: 'Dashboard Admin' });

        const logChannel = client.channels.cache.get(CONFIG.CHANNELS.MOD_LOGS);
        if (logChannel) {
            const logEmbed = new EmbedBuilder()
                .setColor(CONFIG.PURPLE_HEX)
                .setTitle('🛡️ Modding Action Processed')
                .addFields(
                    { name: 'Target ID', value: userId, inline: true },
                    { name: 'Action', value: action.toUpperCase(), inline: true },
                    { name: 'Reason', value: reason }
                ).setTimestamp();
            await logChannel.send({ embeds: [logEmbed] });
        }
        res.send("<script>alert('Action implemented successfully.'); window.location='/modding';</script>");
    } catch {
        res.send("<script>alert('Failed execution due to permission matrix bounds.'); window.location='/modding';</script>");
    }
});

// ==========================================
// 4. DISCORD BOT ACTIONS & EVENT INTERFACES
// ==========================================
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const { guild, user, channel, customId } = interaction;

    if (customId.startsWith('ticket_')) {
        await interaction.deferReply({ ephemeral: true });
        const type = customId.split('_')[1];
        const roomName = `${type}-${user.username}`.toLowerCase();

        const ticketChannel = await guild.channels.create({
            name: roomName,
            type: ChannelType.GuildText,
            parent: CONFIG.CHANNELS.CATEGORY_TICKETS || null,
            permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const welcomeEmbed = new EmbedBuilder()
            .setColor(CONFIG.PURPLE_HEX)
            .setTitle(`Support Workspace Opened`)
            .setDescription(`Welcome <@${user.id}>. A member of our staff team will be right with you. Please leave any relevant details or reports here right away.`);

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger));
        await ticketChannel.send({ content: `<@${user.id}>`, embeds: [welcomeEmbed], components: [row] });
        await interaction.editReply({ content: `Private workspace launched: <#${ticketChannel.id}>` });
    }

    if (customId === 'close_ticket') {
        await interaction.reply({ content: '🔒 Finalizing transcript buffers. Closing space cleanly in 5 seconds...' });
        
        if (CONFIG.CHANNELS.TICKET_LOGS) {
            const logs = client.channels.cache.get(CONFIG.CHANNELS.TICKET_LOGS);
            if (logs) {
                const logEmbed = new EmbedBuilder()
                    .setColor(CONFIG.PURPLE_HEX)
                    .setTitle('📊 Ticket Archived')
                    .setDescription(`Channel reference **${channel.name}** has been processed and deleted.`)
                    .setTimestamp();
                await logs.send({ embeds: [logEmbed] });
            }
        }
        setTimeout(() => channel.delete().catch(() => null), 5000);
    }
});

// ==========================================
// 5. RUNTIME STREAMS CAPTURE LOGIN
// ==========================================
client.once('ready', () => {
    console.log(`🤖 Logged into Discord API as ${client.user.tag}`);
    app.listen(CONFIG.PORT, () => console.log(`🌐 Light-Purple Web UI operational on port ${CONFIG.PORT}`));
});

client.login(CONFIG.TOKEN);
