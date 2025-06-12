require('dotenv').config();
const { Client, IntentsBitField, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');
const app = express();

// MongoDB model
mongoose.connect(process.env.MONGO_URI);
const Formularz = mongoose.model('Formularz', new mongoose.Schema({
  code: String, iduser: String, imie: String, nazwisko: String, dataur: Date, kraj: String, plec: String, podpis: String, ts: Date
}));

// Discord bot
const client = new Client({ intents: [IntentsBitField.Flags.Guilds] });

client.once('ready', async () => {
  console.log(`✅ Zalogowano: ${client.user.tag}`);

  // Deploy slash command
  const rest = new REST({ version: '10' }).setToken(process.env.BOT_TOKEN);
  await rest.put(Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID), {
    body: [{ name: 'formularz', description: 'Wypełnij formularz' }]
  });
});

client.on('interactionCreate', async intr => {
  if (intr.isChatInputCommand() && intr.commandName === 'formularz') {
    const modal = new ModalBuilder()
      .setCustomId('form_modal')
      .setTitle('Formularz')
      .addComponents(
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('imie').setLabel('Imię').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('nazwisko').setLabel('Nazwisko').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('dataur').setLabel('Data urodzenia (yyyy-mm-dd)').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('kraj').setLabel('Kraj').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('plec').setLabel('Płeć').setStyle(TextInputStyle.Short)),
        new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('podpis').setLabel('Podpis').setStyle(TextInputStyle.Paragraph))
      );
    return intr.showModal(modal);
  }
  if (intr.isModalSubmit() && intr.customId === 'form_modal') {
    const imie = intr.fields.getTextInputValue('imie');
    const nazwisko = intr.fields.getTextInputValue('nazwisko');
    const dataur = new Date(intr.fields.getTextInputValue('dataur'));
    if ((new Date() - dataur) < 18*365*24*60*60*1000) return intr.reply({ content: 'Musisz mieć min. 18 lat', ephemeral: true });
    const kraj = intr.fields.getTextInputValue('kraj'), plec = intr.fields.getTextInputValue('plec'), podpis = intr.fields.getTextInputValue('podpis');
    const code = Math.floor(Math.random()*1e11).toString().padStart(11, '0');
    const entry = await new Formularz({ code, iduser: intr.user.id, imie, nazwisko, dataur, kraj, plec, podpis, ts: new Date() }).save();
    await intr.reply({ content: `Zapisano! Kod: ${code}`, ephemeral: true });
  }
});

client.login(process.env.BOT_TOKEN);

// Webserver + panel
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => res.send('Bot działa'));
app.get('/panel', (req, res) => res.render('panel', { error: null, results: null }));
app.post('/panel', async (req, res) => {
  const { pass, q } = req.body;
  if (pass !== process.env.PASSWORD) return res.render('panel', { error: 'Złe hasło', results: null });
  
  let results;
  if (q.match(/^\d{11}$/)) results = await Formularz.find({ code: q });
  else if (q.match(/^\d+$/)) results = await Formularz.find({ iduser: q });
  else {
    const [i, n] = q.split(' ');
    results = await Formularz.find({ imie: i, nazwisko: n });
  }
  res.render('panel', { error: null, results });
});

app.listen(process.env.PORT||3000, ()=>console.log('Web działa'));
