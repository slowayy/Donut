const express = require('express');
const { Client, GatewayIntentBits } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildPresences,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

let isClientReady = false;

client.login(process.env.DISCORD_BOT_TOKEN);

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  isClientReady = true;
});

app.get('/discord-user/:userId', async (req, res) => {
  if (!isClientReady) {
    return res.status(503).send('Discord client is not ready yet.');
  }

  const userId = req.params.userId;

  try {
    const guild = client.guilds.cache.first();
    if (!guild) {
      return res.status(404).send('Guild not found.');
    }

    const member = await guild.members.fetch(userId);
    const userData = {
      id: member.user.id,
      username: member.user.username,
      avatar: member.user.displayAvatarURL(),
      discriminator: member.user.discriminator,
      bot: member.user.bot,
      clan: null,
      display_name: member.displayName || member.user.username, // Keep display_name
      badges: member.user.flags ? member.user.flags.toArray() : [],
      discord_status: member.presence ? member.presence.status : 'offline',
      active_on_discord_web: false,
      active_on_discord_desktop: false,
      active_on_discord_mobile: false,
      listening_to_spotify: false,
      spotify: null,
      activities: [],
      client_status: member.presence ? member.presence.clientStatus : {},
    };

    if (member.presence) {
      userData.discord_status = member.presence.status;

      userData.active_on_discord_web = !!userData.client_status.web;
      userData.active_on_discord_desktop = !!userData.client_status.desktop;
      userData.active_on_discord_mobile = !!userData.client_status.mobile;

      userData.activities = member.presence.activities.map(activity => {
        if (activity.type === 2 && activity.name === "Spotify") {
          userData.listening_to_spotify = true;

          userData.spotify = {
            track: activity.details,
            artist: activity.state,
            album: activity.assets ? activity.assets.largeText : null,
            album_cover_url: activity.assets ? `https://i.scdn.co/image/${activity.assets.largeImage.slice(8)}` : null,
            track_url: activity.syncId ? `https://open.spotify.com/track/${activity.syncId}` : null,
          };

          return null;
        }

        return {
          name: activity.name,
          type: activity.type,
          state: activity.state || null,
          details: activity.details || null,
          application_id: activity.applicationId || null,
          large_image_key: activity.assets ? activity.assets.largeImage : null,
          small_image_key: activity.assets ? activity.assets.smallImage : null,
          large_image_text: activity.assets ? activity.assets.largeText : null,
          small_image_text: activity.assets ? activity.assets.smallText : null,
        };
      }).filter(activity => activity !== null);
    }

    res.json(userData);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).send('Error fetching user data');
  }
});

app.get('/', (req, res) => {
  res.send('Donut API is running. Use /discord-user/:userId to get user data.');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
