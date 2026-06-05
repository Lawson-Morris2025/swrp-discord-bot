const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits
} = require('discord.js');

const express = require('express');

// ===== ENV =====
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ===== EXPRESS (FIXES RENDER PORT SCANNING) =====
const app = express();

app.get('/', (req, res) => {
  res.send('SWRP Bot is running');
});

app.listen(process.env.PORT || 3000, () => {
  console.log('Web server running');
});

// ===== DISCORD CLIENT =====
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ===== SLASH COMMANDS =====
const commands = [
  new SlashCommandBuilder()
    .setName('startsession')
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
