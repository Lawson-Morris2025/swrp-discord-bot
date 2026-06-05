const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// =====================
// CONFIG (PUT YOUR IDS HERE)
// =====================
const TOKEN = "PASTE_BOT_TOKEN_HERE";
const CLIENT_ID = "PASTE_APPLICATION_ID_HERE";
const GUILD_ID = "PASTE_SERVER_ID_HERE";

// =====================
// CLIENT
// =====================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// =====================
// COMMANDS
// =====================
const commands = [
  new SlashCommandBuilder()
    .setName('startsession')
    .setDescription('Start a roleplay session'),

  new SlashCommandBuilder()
    .setName('endsession')
    .setDescription('End a roleplay session'),

  new SlashCommandBuilder()
    .setName('message')
    .setDescription('Send a custom announcement')
    .addStringOption(option =>
      option.setName('text')
        .setDescription('Message to send')
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

// =====================
// REGISTER COMMANDS
// =====================
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Commands registered!");
  } catch (err) {
    console.error(err);
  }
})();

// =====================
// BOT READY
// =====================
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// =====================
// COMMAND HANDLER
// =====================
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // START SESSION
  if (interaction.commandName === 'startsession') {
    const embed = new EmbedBuilder()
      .setTitle("🚨 Roleplay Session Started")
      .setDescription(
        "A roleplay session is now ACTIVE.\n\n" +
        "Please follow all server rules and maintain realistic roleplay.\n\n" +
        "✅ Active Staff\n" +
        "🚓 Emergency Services Available\n" +
        "🚗 Civilian RP Open\n\n" +
        "Enjoy South Wales RP!"
      )
      .setColor("Green");

    return interaction.reply({ embeds: [embed] });
  }

  // END SESSION
  if (interaction.commandName === 'endsession') {
    const embed = new EmbedBuilder()
      .setTitle("🔴 Roleplay Session Ended")
      .setDescription(
        "The roleplay session has now ENDED.\n\n" +
        "Thank you to everyone who attended.\n" +
        "We appreciate your support and hope to see you next time!"
      )
      .setColor("Red");

    return interaction.reply({ embeds: [embed] });
  }

  // MESSAGE COMMAND
  if (interaction.commandName === 'message') {
    const text = interaction.options.getString('text');

    const embed = new EmbedBuilder()
      .setTitle("📢 Announcement")
      .setDescription(text)
      .setColor("Blue");

    return interaction.reply({ embeds: [embed] });
  }
});

// =====================
// LOGIN
// =====================
client.login(TOKEN);function saveData(data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

let warnings = loadData();

// ================= COMMANDS =================
const commands = [
  new SlashCommandBuilder()
    .setName("startsession")
    .setDescription("Start RP session"),

  new SlashCommandBuilder()
    .setName("endsession")
    .setDescription("End RP session"),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send announcement")
    .addStringOption(o =>
      o.setName("message").setDescription("Message").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .addUserOption(o =>
      o.setName("user").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("View warnings")
    .addUserOption(o =>
      o.setName("user").setRequired(true)
    )
].map(c => c.toJSON());

// ================= REGISTER COMMANDS =================
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Commands registered");
  } catch (err) {
    console.error(err);
  }
})();

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= VERIFY BUTTON =================
async function sendVerify(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify")
      .setLabel("Verify")
      .setStyle(ButtonStyle.Success)
  );

  const embed = new EmbedBuilder()
    .setTitle("🔐 Verification")
    .setDescription("Click verify to get Civilian access.")
    .setColor("Blue");

  await channel.send({ embeds: [embed], components: [row] });
}

// ================= INTERACTIONS =================
client.on("interactionCreate", async (interaction) => {

  // ===== BUTTON =====
  if (interaction.isButton()) {
    if (interaction.customId === "verify") {
      const role = interaction.guild.roles.cache.find(r => r.name === "Civilian");

      if (!role) {
        return interaction.reply({ content: "Civilian role missing", ephemeral: true });
      }

      await interaction.member.roles.add(role);

      return interaction.reply({
        content: "✅ Verified!",
        ephemeral: true
      });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const isStaff =
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.member.roles.cache.some(r => r.name === "Staff");

  // ================= SESSION START =================
  if (interaction.commandName === "startsession") {
    if (!isStaff) return interaction.reply({ content: "No permission", ephemeral: true });

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🟢 SESSION STARTED")
          .setDescription("South Wales RP is now ACTIVE. Follow rules.")
          .setColor("Green")
      ]
    });
  }

  // ================= SESSION END =================
  if (interaction.commandName === "endsession") {
    if (!isStaff) return interaction.reply({ content: "No permission", ephemeral: true });

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("🔴 SESSION ENDED")
          .setDescription("Session has ended.")
          .setColor("Red")
      ]
    });
  }

  // ================= ANNOUNCE =================
  if (interaction.commandName === "announce") {
    if (!isStaff) return interaction.reply({ content: "No permission", ephemeral: true });

    const msg = interaction.options.getString("message");

    return interaction.reply({
      embeds: [
        new EmbedBuilder()
          .setTitle("📢 Announcement")
          .setDescription(msg)
          .setColor("Blue")
      ]
    });
  }

  // ================= WARN =================
  if (interaction.commandName === "warn") {
    if (!isStaff) return interaction.reply({ content: "No permission", ephemeral: true });

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");

    if (!warnings[user.id]) warnings[user.id] = [];

    warnings[user.id].push({
      reason,
      staff: interaction.user.tag,
      date: new Date().toLocaleString()
    });

    saveData(warnings);

    return interaction.reply(`⚠️ Warned ${user.tag}`);
  }

  // ================= WARNINGS =================
  if (interaction.commandName === "warnings") {
    const user = interaction.options.getUser("user");

    const list = warnings[user.id] || [];

    if (list.length === 0) {
      return interaction.reply(`${user.tag} has no warnings.`);
    }

    return interaction.reply(
      list.map((w, i) =>
        `${i + 1}. ${w.reason} (${w.staff})`
      ).join("\n")
    );
  }
});

// ================= LOGIN =================
client.login(TOKEN);    .setName("endsession")
    .setDescription("End RP session"),

  new SlashCommandBuilder()
    .setName("announce")
    .setDescription("Send announcement")
    .addStringOption(o =>
      o.setName("message").setDescription("Message").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Warn a user")
    .addUserOption(o =>
      o.setName("user").setRequired(true)
    )
    .addStringOption(o =>
      o.setName("reason").setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Check warnings")
    .addUserOption(o =>
      o.setName("user").setRequired(true)
    )
].map(c => c.toJSON());

// ================= REGISTER COMMANDS =================
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("Slash commands registered");
  } catch (err) {
    console.error(err);
  }
})();

// ================= READY =================
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ================= VERIFY BUTTON =================
async function sendVerifyMessage(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("verify")
      .setLabel("Verify")
      .setStyle(ButtonStyle.Success)
  );

  const embed = new EmbedBuilder()
    .setTitle("🔐 Verify to Join Server")
    .setDescription("Click verify to get Civilian access.")
    .setColor("Blue");

  await channel.send({ embeds: [embed], components: [row] });
}

// ================= INTERACTIONS =================
client.on("interactionCreate", async (interaction) => {

  // ===== BUTTON =====
  if (interaction.isButton()) {
    if (interaction.customId === "verify") {
      const role = interaction.guild.roles.cache.find(r => r.name === "Civilian");
      if (!role) return interaction.reply({ content: "Civilian role missing", ephemeral: true });

      await interaction.member.roles.add(role);

      return interaction.reply({
        content: "✅ Verified! You now have Civilian access.",
        ephemeral: true
      });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const isStaff =
    interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
    interaction.member.roles.cache.some(r => r.name === "Staff");

  // ===== START SESSION =====
  if (interaction.commandName === "startsession") {
    if (!isStaff) return interaction.reply({ content: "No permission", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("🟢 SESSION STARTED")
      .setDescription("South Wales RP session is now ACTIVE. Follow all rules.")
      .setColor("Green");

    return interaction.reply({ embeds: [embed] });
  }

  // ===== END SESSION =====
  if (interaction.commandName === "endsession") {
    if (!isStaff) return interaction.reply({ content: "No permission", ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle("🔴 SESSION ENDED")
      .setDescription("Session has ended. Thank you for attending.")
      .setColor("Red");

    return interaction.reply({ embeds: [embed] });
  }

  // ===== ANNOUNCE =====
  if (interaction.commandName === "announce") {
    if (!isStaff) return interaction.reply({ content: "No permission", ephemeral: true });

    const msg = interaction.options.getString("message");

    const embed = new EmbedBuilder()
      .setTitle("📢 Announcement")
      .setDescription(msg)
      .setColor("Blue");

    return interaction.reply({ embeds: [embed] });
  }

  // ===== WARN =====
  if (interaction.commandName === "warn") {
    if (!isStaff) return interaction.reply({ content: "No permission", ephemeral: true });

    const user = interaction.options.getUser("user");
    const reason = interaction.options.getString("reason");

    if (!warnings.has(user.id)) warnings.set(user.id, []);

    warnings.get(user.id).push({
      reason,
      staff: interaction.user.tag,
      date: new Date().toLocaleString()
    });

    return interaction.reply(`⚠️ Warned ${user.tag}`);
  }

  // ===== WARN LIST =====
  if (interaction.commandName === "warnings") {
    const user = interaction.options.getUser("user");
    const list = warnings.get(user.id) || [];

    if (list.length === 0) {
      return interaction.reply(`${user.tag} has no warnings.`);
    }

    return interaction.reply(
      list.map((w, i) =>
        `${i + 1}. ${w.reason} (by ${w.staff})`
      ).join("\n")
    );
  }
});

// ================= LOGIN =================
client.login(TOKEN);    .setName('endsession')
    .setDescription('End RP session'),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send announcement')
    .addStringOption(o =>
      o.setName('title').setRequired(true).setDescription('Title'))
    .addStringOption(o =>
      o.setName('message').setRequired(true).setDescription('Message')),

  new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Warn a user')
    .addUserOption(o =>
      o.setName('user').setRequired(true))
    .addStringOption(o =>
      o.setName('reason').setRequired(true)),

  new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Check warnings')
    .addUserOption(o =>
      o.setName('user').setRequired(true))
].map(c => c.toJSON());

// ===== REGISTER COMMANDS =====
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

// ===== READY =====
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ===== VERIFY BUTTON SYSTEM =====
async function sendVerifyMessage(channel) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('verify')
      .setLabel('Verify')
      .setStyle(ButtonStyle.Success)
  );

  const embed = new EmbedBuilder()
    .setTitle('🔐 Server Verification')
    .setDescription('Click verify to gain access to the server and become a Civilian.')
    .setColor('Blue');

  await channel.send({ embeds: [embed], components: [row] });
}

// ===== INTERACTIONS =====
client.on('interactionCreate', async interaction => {

  // ===== BUTTONS =====
  if (interaction.isButton()) {
    if (interaction.customId === 'verify') {
      const role = interaction.guild.roles.cache.find(r => r.name === 'Civilian');

      if (!role) {
        return interaction.reply({ content: 'Civilian role not found.', ephemeral: true });
      }

      await interaction.member.roles.add(role);

      return interaction.reply({
        content: '✅ You are now verified and have been given Civilian role!',
        ephemeral: true
      });
    }
  }

  if (!interaction.isChatInputCommand()) return;

  const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

  // ===== START SESSION =====
  if (interaction.commandName === 'startsession') {
    if (!isStaff) return interaction.reply({ content: 'No permission', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🟢 SESSION STARTED')
      .setDescription('RP session is now active. Follow all rules.')
      .setColor('Green');

    return interaction.reply({ embeds: [embed] });
  }

  // ===== END SESSION =====
  if (interaction.commandName === 'endsession') {
    if (!isStaff) return interaction.reply({ content: 'No permission', ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🔴 SESSION ENDED')
      .setDescription('Session has ended. Thank you for attending.')
      .setColor('Red');

    return interaction.reply({ embeds: [embed] });
  }

  // ===== ANNOUNCE =====
  if (interaction.commandName === 'announce') {
    if (!isStaff) return interaction.reply({ content: 'No permission', ephemeral: true });

    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${title}`)
      .setDescription(message)
      .setColor('Blue');

    return interaction.reply({ embeds: [embed] });
  }

  // ===== WARN SYSTEM =====
  if (interaction.commandName === 'warn') {
    if (!isStaff) return interaction.reply({ content: 'No permission', ephemeral: true });

    const user = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason');

    if (!warnings.has(user.id)) warnings.set(user.id, []);

    warnings.get(user.id).push({
      reason,
      staff: interaction.user.tag,
      date: new Date().toLocaleString()
    });

    return interaction.reply(`⚠️ Warned ${user.tag} | Reason: ${reason}`);
  }

  // ===== VIEW WARNINGS =====
  if (interaction.commandName === 'warnings') {
    const user = interaction.options.getUser('user');

    const userWarnings = warnings.get(user.id) || [];

    if (userWarnings.length === 0) {
      return interaction.reply(`${user.tag} has no warnings.`);
    }

    const list = userWarnings
      .map((w, i) => `${i + 1}. ${w.reason} (by ${w.staff})`)
      .join('\n');

    return interaction.reply(`⚠️ Warnings for ${user.tag}:\n\n${list}`);
  }
});

// ===== LOGIN =====
client.login(TOKEN);    .setName('startsession')
    .setDescription('Start RP session'),

  new SlashCommandBuilder()
    .setName('endsession')
    .setDescription('End RP session'),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send announcement')
    .addStringOption(o =>
      o.setName('title')
        .setDescription('Title')
        .setRequired(true))
    .addStringOption(o =>
      o.setName('message')
        .setDescription('Message')
        .setRequired(true))
].map(c => c.toJSON());

// ===== REGISTER COMMANDS =====
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log('Registering commands...');

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log('Commands registered!');
  } catch (err) {
    console.error(err);
  }
})();

// ===== READY =====
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ===== COMMANDS =====
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // PERMISSION CHECK
  const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

  // ===== START SESSION =====
  if (commandName === 'startsession') {
    if (!isAdmin) {
      return interaction.reply({ content: '❌ No permission', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🟢 SOUTH WALES RP SESSION STARTED')
      .setDescription(`
A roleplay session is now ACTIVE.

Please follow all server rules.

✅ Staff Online  
✅ Emergency Services Active  
✅ Civilian RP Open  

Enjoy your session!
      `)
      .setColor('Green')
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // ===== END SESSION =====
  if (commandName === 'endsession') {
    if (!isAdmin) {
      return interaction.reply({ content: '❌ No permission', ephemeral: true });
    }

    const embed = new EmbedBuilder()
      .setTitle('🔴 SOUTH WALES RP SESSION ENDED')
      .setDescription(`
The roleplay session has now ENDED.

Thank you for attending.

See you next session!
      `)
      .setColor('Red')
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // ===== ANNOUNCE =====
  if (commandName === 'announce') {
    if (!isAdmin) {
      return interaction.reply({ content: '❌ No permission', ephemeral: true });
    }

    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${title}`)
      .setDescription(message)
      .setColor('Blue')
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
});

// ===== LOGIN =====
client.login(TOKEN);        .setRequired(true)
    )
    .addStringOption(option =>
      option.setName('message')
        .setDescription('Announcement message')
        .setRequired(true)
    )
].map(cmd => cmd.toJSON());

// ===== REGISTER COMMANDS =====
const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  try {
    console.log("Registering slash commands...");

    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );

    console.log("Slash commands registered!");
  } catch (err) {
    console.error(err);
  }
})();

// ===== BOT READY =====
client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

// ===== COMMAND HANDLER =====
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  // ================= START SESSION =================
  if (commandName === 'startsession') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "❌ No permission.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🟢 SOUTH WALES RP SESSION STARTED')
      .setDescription(`
A roleplay session is now active.

Please follow all server rules and maintain realistic roleplay.

✅ Active Staff  
✅ Professional RP  
✅ Emergency Services Available  
✅ Civilian Opportunities  

Enjoy your time in South Wales RP.
      `)
      .setColor('Green')
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // ================= END SESSION =================
  if (commandName === 'endsession') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "❌ No permission.",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle('🔴 SOUTH WALES RP SESSION ENDED')
      .setDescription(`
The current roleplay session has ended.

Thank you to everyone who attended.

We appreciate your support and hope to see you next time.
      `)
      .setColor('Red')
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }

  // ================= ANNOUNCE =================
  if (commandName === 'announce') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
      return interaction.reply({
        content: "❌ No permission.",
        ephemeral: true
      });
    }

    const title = interaction.options.getString('title');
    const message = interaction.options.getString('message');

    const embed = new EmbedBuilder()
      .setTitle(`📢 ${title}`)
      .setDescription(message)
      .setColor('Blue')
      .setTimestamp();

    return interaction.reply({ embeds: [embed] });
  }
});

// ===== LOGIN =====
client.login(TOKEN);
