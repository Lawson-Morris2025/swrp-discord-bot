try { require('dotenv').config(); } catch (e) { /* Running in production environment on Render */ }
const { 
    Client, 
    GatewayIntentBits, 
    Partials,
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType,
    PermissionFlagsBits,
    REST,
    Routes,
    SlashCommandBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle
} = require('discord.js');
const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const multer = require('multer'); 
const path = require('path');
const fs = require('fs');

// Create upload directory if it doesn't exist
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Simple JSON Database path for storing approved callsigns persistently
const DATA_FILE = path.join(__dirname, 'callsigns.json');
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 4));
}

// Helper functions to read/write persistent callsign records
function getCallsigns() {
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
    catch (e) { return {}; }
}
function saveCallsign(discordId, data) {
    const db = getCallsigns();
    db[discordId] = data;
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 4));
}

// Configure how files are saved locally
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9.]/g, "_"))
});
const upload = multer({ storage: storage });

// ==========================================
// 1. INITIALIZATION & DYNAMIC CONFIG
// ==========================================
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
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

// Serve uploaded images publicly so Discord can fetch them
app.use('/uploads', express.static(uploadDir));

const CONFIG = {
    TOKEN: process.env.TOKEN,
    PORT: process.env.PORT || 10000,
    PURPLE_HEX: '#7B2CBF', 
    DASHBOARD_PASSWORD: process.env.DASHBOARD_PASSWORD || 'StaffPass123',
    FIXED_TICKET_CHANNEL_ID: '1512552819172053172',
    OWNER_DISCORD_ID: '1378439051874406410', // Linked directly to your account
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

let globalWarns = []; 

// ==========================================
// 2. MIDDLEWARE & AUTHENTICATION
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

    .drop-zone { border: 2px dashed #7B2CBF; background: #F9F5FF; border-radius: 8px; padding: 25px; text-align: center; cursor: pointer; transition: background 0.2s; margin-bottom: 15px; }
    .drop-zone.drag-over { background: #EEDDFF; border-color: #5A189A; }
    .preview-thumbnails { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 20px; }
    .thumb-container { position: relative; width: 80px; height: 80px; border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden; background: #FFF; }
    .thumb-container img { width: 100%; height: 100%; object-fit: cover; }
    .thumb-remove { position: absolute; top: 2px; right: 2px; background: rgba(0,0,0,0.6); color: white; border: none; border-radius: 50%; width: 18px; height: 18px; font-size: 11px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; }
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
// 3. FRONTEND UI ROUTING & DASHBOARD INTERFACES
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
            
            <form method="POST" action="/announcements/dispatch" enctype="multipart/form-data">
                <label style="font-weight: bold; display: block; margin-bottom: 5px;">Select Option Template</label>
                <select name="type" id="templateSelect" onchange="updatePreview()">
                    <option value="START">🟢 Broadcast: Start Session Template</option>
                    <option value="END">🔴 Broadcast: End Session Template</option>
                    <option value="CUSTOM">💬 Broadcast: Custom Announcement (Uses text box below)</option>
                </select>

                <label style="font-weight: bold; display: block; margin-bottom: 5px;">Live Embed Preview (What the bot will post):</label>
                <div id="previewBox" style="background: #F3E8FF; border: 1px dashed #7B2CBF; padding: 20px; border-radius: 8px; margin-bottom: 20px; font-family: monospace; white-space: pre-wrap; color: #2D3748;"></div>

                <div id="customInputs" style="display: none;">
                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">Custom Announcement Message</label>
                    <textarea name="message" id="customMessage" rows="4" placeholder="Type customized notices here..." oninput="updatePreview()"></textarea>

                    <label style="font-weight: bold; display: block; margin-bottom: 5px;">Attached Photo Attachments (Drag & Drop Multiple files)</label>
                    <div class="drop-zone" id="dropZone">
                        <span style="color: #5A189A; font-weight: 600;">Click to select or drop images here</span>
                        <input type="file" name="photos" id="fileInput" multiple accept="image/*" style="display: none;" />
                    </div>
                    
                    <div class="preview-thumbnails" id="thumbGroup"></div>
                </div>

                <button type="submit" class="btn">Send Announcement</button>
            </form>
        </div>

        <script>
            const startText = "🏴\u200D󠁧󠁢󠁷󠁬󠁳󠁿 **SOUTH WALES RP SESSION STARTED** 🏴\u200D󠁧󠁢󠁷󠁬󠁳󠁿\\n\\nA roleplay session is now active. Please follow all server rules and maintain realistic roleplay.\\n\\n🔹 **Active Staff On Duty**\\n🔹 **Professional RP Expected**\\n🔹 **Emergency Services Available**\\n🔹 **Civilian Opportunities Open**\\n\\nEnjoy your time in South Wales RP!";
            const endText = "🏴\u200D󠁧󠁢󠁷󠁬󠁳󠁿 **SOUTH WALES RP SESSION ENDED** 🏴\u200D󠁧󠁢󠁷󠁬󠁳󠁿\\n\\nThe current roleplay session has ended. Thank you to everyone who attended.\\n\\nWe appreciate your support and hope to see you next time.";

            const dropZone = document.getElementById('dropZone');
            const fileInput = document.getElementById('fileInput');
            const thumbGroup = document.getElementById('thumbGroup');

            dropZone.addEventListener('click', () => fileInput.click());

            dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
            dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                if(e.dataTransfer.files.length > 0) {
                    fileInput.files = e.dataTransfer.files;
                    handleThumbnails(e.dataTransfer.files);
                }
            });

            fileInput.addEventListener('change', (e) => handleThumbnails(e.target.files));

            function handleThumbnails(files) {
                thumbGroup.innerHTML = '';
                Array.from(files).forEach((file) => {
                    if(!file.type.startsWith('image/')) return;
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const container = document.createElement('div');
                        container.className = 'thumb-container';
                        container.innerHTML = \`<img src="\${e.target.result}" /><button type="button" class="thumb-remove" onclick="this.parentElement.remove()">×</button>\`;
                        thumbGroup.appendChild(container);
                    };
                    reader.readAsDataURL(file);
                });
            }

            function updatePreview() {
                const select = document.getElementById('templateSelect');
                const preview = document.getElementById('previewBox');
                const customInputs = document.getElementById('customInputs');
                const customMessage = document.getElementById('customMessage').value;

                if (select.value === 'START') {
                    preview.innerText = startText;
                    customInputs.style.display = 'none';
                } else if (select.value === 'END') {
                    preview.innerText = endText;
                    customInputs.style.display = 'none';
                } else {
                    preview.innerText = customMessage ? customMessage : "(Empty custom announcement text...)";
                    customInputs.style.display = 'block';
                }
            }
            updatePreview();
        </script>
    `));
});

app.post('/announcements/dispatch', checkAuth, upload.array('photos', 10), async (req, res) => {
    const { type, message } = req.body;
    
    let channel = client.channels.cache.get(CONFIG.CHANNELS.ANNOUNCEMENTS);
    if (!channel) {
        try {
            channel = await client.channels.fetch(CONFIG.CHANNELS.ANNOUNCEMENTS);
        } catch (err) {
            console.error("Live channel fetch operation failed:", err);
        }
    }

    if (!channel) return res.send("<script>alert('Announcements channel could not be found by the bot.'); window.location='/announcements';</script>");

    const domainHost = req.get('host');
    const protocolScheme = req.protocol;
    
    let imageUrls = [];
    if(req.files && req.files.length > 0) {
        imageUrls = req.files.map(file => `${protocolScheme}://${domainHost}/uploads/${file.filename}`);
    }

    if (type === 'START') {
        const embed = new EmbedBuilder()
            .setColor(CONFIG.PURPLE_HEX)
            .setTimestamp()
            .setTitle('A roleplay session is now active. Please follow all server rules and maintain realistic roleplay.')
            .setDescription('🔹 **Active Staff On Duty**\n🔹 **Professional RP Expected**\n🔹 **Emergency Services Available**\n🔹 **Civilian Opportunities Open**\n\nEnjoy your time in South Wales RP!');
        await channel.send({ content: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 **SOUTH WALES RP SESSION STARTED** 🏴󠁧󠁢󠁷󠁬󠁳󠁿', embeds: [embed] });
    } else if (type === 'END') {
        const embed = new EmbedBuilder()
            .setColor(CONFIG.PURPLE_HEX)
            .setTimestamp()
            .setTitle('The current roleplay session has ended. Thank you to everyone who attended.')
            .setDescription('We appreciate your support and hope to see you next time.');
        await channel.send({ content: '🏴󠁧󠁢󠁷󠁬󠁳󠁿 **SOUTH WALES RP SESSION ENDED** 🏴󠁧󠁢󠁷󠁬󠁳󠁿', embeds: [embed] });
    } else if (type === 'CUSTOM') {
        let targetEmbeds = [];

        if (imageUrls.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(CONFIG.PURPLE_HEX)
                .setTitle('South Wales RP | Server Notice')
                .setDescription(message)
                .setTimestamp();
            targetEmbeds.push(embed);
        } else {
            imageUrls.forEach((url, i) => {
                const embed = new EmbedBuilder().setColor(CONFIG.PURPLE_HEX).setURL('https://discord.com').setImage(url);
                if (i === 0) {
                    embed.setTitle('South Wales RP | Server Notice').setDescription(message).setTimestamp();
                }
                targetEmbeds.push(embed);
            });
        }
        await channel.send({ embeds: targetEmbeds });
    }

    res.send("<script>alert('Announcement broadcasted cleanly!'); window.location='/announcements';</script>");
});

app.get('/tickets', checkAuth, (req, res) => {
    res.send(buildPage('tickets', `
        <div class="card">
            <h2>🎫 Interactive Ticket Interface Control</h2>
            <p>Deploy your ticket creation module system. Clicking the button below automatically updates the layout in channel <strong>1512552819172053172</strong>.</p>
            <form method="POST" action="/tickets/deploy">
                <button type="submit" class="btn">Deploy Live Support Panel</button>
            </form>
        </div>
    `));
});

app.post('/tickets/deploy', checkAuth, async (req, res) => {
    const channel = client.channels.cache.get(CONFIG.FIXED_TICKET_CHANNEL_ID);
    if (!channel) return res.send("<script>alert('Fixed Ticket Channel (1512552819172053172) could not be found.'); window.location='/tickets';</script>");

    const embed = new EmbedBuilder()
        .setColor(CONFIG.PURPLE_HEX)
        .setTitle('South Wales RP | Support Portal')
        .setDescription('Need support or want to report a rule breaker? Click an action button below to spin up a private room with our administration team.');

    const row = new ActionRowBuilder();
    CONFIG.TICKET_TYPES.forEach(t => {
        row.addComponents(new ButtonBuilder().setCustomId(`ticket_${t.id}`).setLabel(t.label).setEmoji(t.emoji).setStyle(ButtonStyle.Secondary));
    });

    await channel.send({ embeds: [embed], components: [row] });
    res.send("<script>alert('Support Panel successfully deployed inside channel 1512552819172053172!'); window.location='/tickets';</script>");
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

// Auto-assign Unverified role when someone joins
client.on('guildMemberAdd', async (member) => {
    const unverifiedRole = member.guild.roles.cache.find(r => r.name.toLowerCase() === 'unverified');
    if (unverifiedRole) {
        await member.roles.add(unverifiedRole).catch(err => console.error("Error setting welcome role:", err));
    }
});

client.on('interactionCreate', async (interaction) => {
    // Handle Slash Commands
    if (interaction.isChatInputCommand()) {
        const { commandName, channel, member } = interaction;

        if (commandName === 'setverify') {
            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ You lack authorizations to run this config setup.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(CONFIG.PURPLE_HEX)
                .setTitle('🏴\u200D็ก South Wales RP | Verification Portal')
                .setDescription('Welcome! To gain full civilian access to the server, click the button below to link your Roblox username.\n\n**Note:** This instantly clears your **Unverified** status, updates your nickname to your Roblox account name, and activates your **Civilian** role profile.');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('trigger_verify_modal')
                    .setLabel('Verify Account')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success)
            );

            await channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: '🚀 Verification portal posted securely inside this workspace channel!', ephemeral: true });
        }

        // Spawn Callsign Request Panel Embed
        if (commandName === 'setcallsignpanel') {
            if (!member.permissions.has(PermissionFlagsBits.ManageChannels)) {
                return interaction.reply({ content: '❌ Out of bounds permissions hierarchy error.', ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(CONFIG.PURPLE_HEX)
                .setTitle('📋 SWRP Staff Callsign Management')
                .setDescription('Request your official roster identification number using the module below.\n\nAll configurations map directly to the `ST-number` structural tracking template rules.');

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('trigger_callsign_modal')
                    .setLabel('Request Callsign')
                    .setEmoji('🆔')
                    .setStyle(ButtonStyle.Primary)
            );

            await channel.send({ embeds: [embed], components: [row] });
            return interaction.reply({ content: 'Panel deployed successfully!', ephemeral: true });
        }

        // List Every Approved Callsign
        if (commandName === 'listcallsign') {
            const db = getCallsigns();
            const keys = Object.keys(db);

            if (keys.length === 0) {
                return interaction.reply({ content: '📭 The internal staff roster database contains no active callsign logs.', ephemeral: true });
            }

            const listEmbed = new EmbedBuilder()
                .setColor(CONFIG.PURPLE_HEX)
                .setTitle('📋 Active Staff Identification Roster')
                .setTimestamp();

            let detailsString = '';
            keys.forEach(id => {
                detailsString += `• <@${id}> | **Roblox:** ${db[id].roblox} ➔ **Callsign:** \`${db[id].callsign}\`\n`;
            });

            listEmbed.setDescription(detailsString);
            return interaction.reply({ embeds: [listEmbed] });
        }
    }

    // Handle Verification Modal Trigger
    if (interaction.isButton() && interaction.customId === 'trigger_verify_modal') {
        const modal = new ModalBuilder()
            .setCustomId('roblox_verify_modal')
            .setTitle('SWRP Account Verification');

        const robloxInput = new TextInputBuilder()
            .setCustomId('roblox_username_input')
            .setLabel('What is your Roblox username?')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter username here...')
            .setRequired(true)
            .setMinLength(3)
            .setMaxLength(20);

        const firstActionRow = new ActionRowBuilder().addComponents(robloxInput);
        modal.addComponents(firstActionRow);

        return interaction.showModal(modal);
    }

    // Handle Verification Modal Processing
    if (interaction.isModalSubmit() && interaction.customId === 'roblox_verify_modal') {
        await interaction.deferReply({ ephemeral: true });
        
        const { guild, user } = interaction;
        const robloxUsername = interaction.fields.getTextInputValue('roblox_username_input');
        
        const unverifiedRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'unverified');
        const civilianRole = guild.roles.cache.find(r => r.name.toLowerCase() === 'civilian');
        
        if (!civilianRole) {
            return interaction.editReply({ content: '❌ System Error: A server role named exactly "Civilian" could not be detected.' });
        }
        
        try {
            const member = await guild.members.fetch(user.id);
            await member.setNickname(robloxUsername).catch(() => null);

            if (unverifiedRole && member.roles.cache.has(unverifiedRole.id)) {
                await member.roles.remove(unverifiedRole);
            }
            await member.roles.add(civilianRole);
            
            return interaction.editReply({ content: `✅ Verification successful! Your profile nickname has been updated to **${robloxUsername}** and your Civilian clearance is open.` });
        } catch (err) {
            return interaction.editReply({ content: '❌ Role swap adjustment rejected. Check role hierarchy constraints.' });
        }
    }

    // Handle Callsign Request Modal Trigger
    if (interaction.isButton() && interaction.customId === 'trigger_callsign_modal') {
        const modal = new ModalBuilder()
            .setCustomId('callsign_request_modal')
            .setTitle('Staff Callsign Allocation Request');

        const numberInput = new TextInputBuilder()
            .setCustomId('callsign_num')
            .setLabel('What number do you want? (e.g. 104)')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter numbers only...')
            .setRequired(true);

        const robloxInput = new TextInputBuilder()
            .setCustomId('callsign_roblox')
            .setLabel('Confirm your Roblox username')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('Enter username here...')
            .setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(numberInput),
            new ActionRowBuilder().addComponents(robloxInput)
        );

        return interaction.showModal(modal);
    }

    // Handle Modal Submission (Forwards Request Data via DM to Owner/Admin ID)
    if (interaction.isModalSubmit() && interaction.customId === 'callsign_request_modal') {
        await interaction.deferReply({ ephemeral: true });

        const rawNumber = interaction.fields.getTextInputValue('callsign_num').replace(/\D/g, ''); 
        const robloxUser = interaction.fields.getTextInputValue('callsign_roblox');
        const calculatedCallsign = `ST-${rawNumber}`;

        if (!rawNumber) {
            return interaction.editReply({ content: '❌ Processing failed: A valid numeric configuration input is required.' });
        }

        try {
            const owner = await client.users.fetch(CONFIG.OWNER_DISCORD_ID);
            
            const dmEmbed = new EmbedBuilder()
                .setColor(CONFIG.PURPLE_HEX)
                .setTitle('🔔 New Staff Callsign Request')
                .addFields(
                    { name: 'Staff Member', value: `<@${interaction.user.id}> (${interaction.user.tag})`, inline: false },
                    { name: 'Roblox Username', value: robloxUser, inline: true },
                    { name: 'Requested Callsign', value: `\`${calculatedCallsign}\``, inline: true }
                )
                .setFooter({ text: 'South Wales RP Management Gateway' })
                .setTimestamp();

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`approve_cs_${interaction.user.id}_${rawNumber}_${interaction.channel.id}_${robloxUser}`)
                    .setLabel('Approve Request')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`deny_cs_${interaction.user.id}_${interaction.channel.id}`)
                    .setLabel('Deny Request')
                    .setStyle(ButtonStyle.Danger)
            );

            await owner.send({ embeds: [dmEmbed], components: [actionRow] });
            return interaction.editReply({ content: `✅ Your tracking request for **${calculatedCallsign}** has been routed to administration for manual verification review.` });
        } catch (err) {
            console.error(err);
            return interaction.editReply({ content: '❌ System interface tracking timeout. Configuration error checking system configuration variables values.' });
        }
    }

    // Handle DM Action Responses (Approve / Deny Operations Matrix Logic)
    if (interaction.isButton() && (interaction.customId.startsWith('approve_cs_') || interaction.customId.startsWith('deny_cs_'))) {
        await interaction.deferUpdate();
        
        const parts = interaction.customId.split('_');
        const actionType = parts[0]; 
        const staffId = parts[2];

        if (actionType === 'approve') {
            const targetNum = parts[3];
            const originalChannelId = parts[4];
            const robloxUser = parts[5] || 'StaffMember';
            const assignedCallsign = `ST-${targetNum}`;

            // Save directly to persistent storage file database layer
            saveCallsign(staffId, {
                roblox: robloxUser,
                callsign: assignedCallsign,
                approvedAt: new Date().toISOString()
            });

            // Post dispatch success confirmation down line into origin channel thread tracking loop context
            const targetChannel = client.channels.cache.get(originalChannelId);
            if (targetChannel) {
                await targetChannel.send({ content: `🎉 <@${staffId}>, your callsign request has been approved! Your callsign is now **${assignedCallsign}**.` });
            }

            // Clean down interactive console display
            await interaction.editReply({ 
                content: `✅ Cleared cleanly. Approved staff workspace allocation data logged out successfully.`, 
                components: [] 
            });

        } else if (actionType === 'deny') {
            const originalChannelId = parts[3];
            
            const targetChannel = client.channels.cache.get(originalChannelId);
            if (targetChannel) {
                await targetChannel.send({ content: `❌ <@${staffId}>, your recent callsign request has been denied by administration.` });
            }

            await interaction.editReply({ 
                content: `❌ Allocation configuration rejected. Notification passed back down line safely.`, 
                components: [] 
            });
        }
    }

    // General Button Handlers for Tickets Dashboard System Integration
    if (interaction.customId.startsWith('ticket_')) {
        await interaction.deferReply({ ephemeral: true });
        const type = interaction.customId.split('_')[1];
        const roomName = `${type}-${interaction.user.username}`.toLowerCase();
        const guild = interaction.guild;

        const ticketChannel = await guild.channels.create({
            name: roomName,
            type: ChannelType.GuildText,
            parent: CONFIG.CHANNELS.CATEGORY_TICKETS || null,
            permissionOverwrites: [
                { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
                { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles] },
                { id: client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
            ]
        });

        const welcomeEmbed = new EmbedBuilder()
            .setColor(CONFIG.PURPLE_HEX)
            .setTitle(`Support Workspace Opened`)
            .setDescription(`Welcome <@${interaction.user.id}>. A member of our staff team will be right with you. Please leave any relevant details or reports here right away.`);

        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('close_ticket').setLabel('Close Ticket').setStyle(ButtonStyle.Danger));
        await ticketChannel.send({ content: `<@${interaction.user.id}>`, embeds: [welcomeEmbed], components: [row] });
        await interaction.editReply({ content: `Private workspace launched: <#${ticketChannel.id}>` });
    }

    if (interaction.customId === 'close_ticket') {
        await interaction.reply({ content: '🔒 Finalizing transcript buffers. Closing space cleanly in 5 seconds...' });
        
        if (CONFIG.CHANNELS.TICKET_LOGS) {
            const logs = client.channels.cache.get(CONFIG.CHANNELS.TICKET_LOGS);
            if (logs) {
                const logEmbed = new EmbedBuilder()
                    .setColor(CONFIG.PURPLE_HEX)
                    .setTitle('📊 Ticket Archived')
                    .setDescription(`Channel reference **${interaction.channel.name}** has been processed and deleted.`)
                    .setTimestamp();
                await logs.send({ embeds: [logEmbed] });
            }
        }
        setTimeout(() => interaction.channel.delete().catch(() => null), 5000);
    }
});

// ==========================================
// 5. RUNTIME STARTUP & REGISTER COMMANDS
// ==========================================
client.once('ready', async () => {
    console.log(`🤖 Logged into Discord API as ${client.user.tag}`);
    app.listen(CONFIG.PORT, () => console.log(`🌐 Light-Purple Web UI operational on port ${CONFIG.PORT}`));

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
        
        // Instant server-by-server propagation configuration routing loops
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

client.login(CONFIG.TOKEN);
