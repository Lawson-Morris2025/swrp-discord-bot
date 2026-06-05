const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
  PermissionFlagsBits,
  EmbedBuilder
} = require('discord.js');

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const commands = [

  new SlashCommandBuilder()
    .setName('startsession')
    .setDescription('Start a session'),

  new SlashCommandBuilder()
    .setName('endsession')
    .setDescription('End a session'),

  new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Send an announcement')
    .addStringOption(option =>
      option
        .setName('title')
        .setDescription('Announcement title')
        .setRequired(true))
    .addStringOption(option =>
      option
        .setName('message')
        .setDescription('Announcement message')
        .setRequired(true))
    .addAttachmentOption(option =>
      option
        .setName('image')
        .setDescription('Optional image'))

].map(command => command.toJSON());

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
})();

client.on('interactionCreate', async interaction => {

  if (!interaction.isChatInputCommand()) return;

  if (
    !interaction.member.permissions.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return interaction.reply({
      content: 'You do not have permission.',
      ephemeral: true
    });
  }

  if (interaction.commandName === 'startsession') {

    const embed = new EmbedBuilder()
  .setTitle('🚔 SOUTH WALES RP SESSION STARTED')
  .setDescription(`
A roleplay session is now active.

Please follow all server rules and maintain realistic roleplay.

✅ Active Staff  
✅ Professional RP  
✅ Emergency Services Available  
✅ Civilian Opportunities  

We hope you enjoy your time in South Wales RP.
`)
  .setColor('Green')
  .setTimestamp();

    await interaction.channel.send({
      content: '@everyone',
      embeds: [embed]
    });

    await interaction.reply({
      content: 'Session announcement sent.',
      ephemeral: true
    });
  }

  if (interaction.commandName === 'endsession') {

    const embed = new EmbedBuilder()
  .setTitle('🔴 SOUTH WALES RP SESSION ENDED')
  .setDescription(`
The current roleplay session has ended.

Thank you to everyone who attended.

We appreciate your support and hope to see you at the next South Wales RP session.
`)
  .setColor('Red')
  .setTimestamp();

    await interaction.channel.send({
      content: '@everyone',
      embeds: [embed]
    });

    await interaction.reply({
      content: 'Session ended announcement sent.',
      ephemeral: true
    });
  }

  if (interaction.commandName === 'announce') {

    const title =
      interaction.options.getString('title');

    const message =
      interaction.options.getString('message');

    const image =
      interaction.options.getAttachment('image');

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(message)
      .setColor('Blue')
      .setTimestamp();

    if (image) {
      embed.setImage(image.url);
    }

    await interaction.channel.send({
      embeds: [embed]
    });

    await interaction.reply({
      content: 'Announcement sent.',
      ephemeral: true
    });
  }

});

client.login(TOKEN);
