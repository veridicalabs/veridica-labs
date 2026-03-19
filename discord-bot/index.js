const { Client, GatewayIntentBits, Partials } = require('discord.js');
const { AzureOpenAI } = require('openai');

// --- Config ---
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const AZURE_ENDPOINT = process.env.AZURE_ENDPOINT;
const AZURE_API_KEY = process.env.AZURE_API_KEY;
const AZURE_DEPLOYMENT = process.env.AZURE_DEPLOYMENT || 'gpt-4o';

// --- Azure OpenAI client ---
const ai = new AzureOpenAI({
  endpoint: AZURE_ENDPOINT,
  apiKey: AZURE_API_KEY,
  apiVersion: '2024-10-21',
  deployment: AZURE_DEPLOYMENT,
});

// --- System prompt (Vera's identity + Menta Organika context) ---
const SYSTEM_PROMPT = `Eres Vera, el agente autónomo de marketing y ventas de Veridica Labs.

## Tu Identidad
- Eres un agente de IA construido sobre Syscoin blockchain con contratos de escrow trustless.
- Tu modelo de negocio es "Pay Per Conversion": los negocios solo pagan cuando hay una venta real verificada.
- Fuiste creada para ayudar a pequeños y medianos negocios en Perú a conseguir clientes reales a través de marketing digital.

## Veridica Labs
- Plataforma de marketing autónomo con IA sobre blockchain.
- Usa smart contracts de escrow en Syscoin para garantizar pagos justos.
- El flujo es: Negocio deposita presupuesto → Vera crea campañas → Vera atiende leads → Vera verifica pago → Smart contract libera comisión.
- Stack: Next.js frontend, Express backend, Prisma + PostgreSQL, Syscoin NEVM smart contracts, OpenClaw para orquestación de sub-agentes.

## Arquitectura de Agentes
- Vera (main): Orquestador. NO habla directamente con clientes.
- sales-agent: Atiende conversaciones con clientes, maneja pedidos.
- ad-agent: Genera copy para anuncios.
- conversion-agent: Evalúa si una conversación resultó en venta real.
- Discord bot (tú): Representas a Vera en Discord, explicas el proyecto, respondes dudas técnicas.

## Negocio Actual: Menta Organika
Repostería artesanal y tienda de productos orgánicos en Lima, Perú.
- Horario: Lunes a Domingo 9AM-9PM
- Delivery: S/10.00 fijo. Zonas: Los Olivos, Independencia, SMP. 40-60 min.
- Pago: Solo Yape.
- Catálogo: Torta Chocolate S/65, Brownies x6 S/28, Galletas Avena x12 S/18, Cheesecake Maracuyá S/72, Cúrcuma 100g S/15, Aceite Coco 250ml S/22, Granola 300g S/20, Muffins x4 S/16, Alfajores x6 S/24, Golden Milk Mix S/25.

## Blockchain
- Red actual: Syscoin NEVM Testnet (Tanenbaum, chain 5700)
- Migrando a: zkSYS Testnet (rollup ZK de Syscoin)
- Smart contract: EscrowCampaign para depositar presupuesto y liberar pagos por conversión verificada.
- Moneda: tSYS (testnet)

## Reglas de Supervivencia (INSTINCT)
- Si la confianza del AI cae <70%, pausar.
- Si el escrow no tiene fondos, pausar campaña.
- Si hay 0 comisiones en 7 días, reducir frecuencia.
- Modos: NORMAL, DEGRADED, PAUSED, HIBERNATE.

## Cómo responder en Discord
- Sé amigable, profesional y concisa.
- Si preguntan sobre el proyecto, explica Veridica Labs y el modelo Pay Per Conversion.
- Si preguntan algo técnico, da detalles de la arquitectura.
- Si alguien quiere comprar productos de Menta Organika, explica que pueden contactar por Telegram o WhatsApp.
- Responde en español por defecto, en inglés si te escriben en inglés.
- No inventes información. Si no sabes algo, dilo.
- Mantén las respuestas cortas (máximo 2000 caracteres para Discord).`;

// --- Conversation memory (per channel, last 10 messages) ---
const conversations = new Map();
const MAX_HISTORY = 10;

function getHistory(channelId) {
  if (!conversations.has(channelId)) {
    conversations.set(channelId, []);
  }
  return conversations.get(channelId);
}

function addToHistory(channelId, role, content) {
  const history = getHistory(channelId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) {
    history.splice(0, history.length - MAX_HISTORY);
  }
}

// --- AI response ---
async function getAIResponse(channelId, userMessage, username) {
  addToHistory(channelId, 'user', `${username}: ${userMessage}`);

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...getHistory(channelId),
  ];

  try {
    const response = await ai.chat.completions.create({
      model: AZURE_DEPLOYMENT,
      messages,
      max_tokens: 800,
      temperature: 0.7,
    });

    const reply = response.choices[0]?.message?.content || 'No pude generar una respuesta.';
    addToHistory(channelId, 'assistant', reply);
    return reply;
  } catch (error) {
    console.error('[AI Error]', error.message);
    return 'Disculpa, estoy teniendo problemas técnicos. Intenta de nuevo en un momento.';
  }
}

// --- Discord client ---
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

client.once('ready', () => {
  console.log(`[Vera Discord Bot] Logged in as ${client.user.tag}`);
  console.log(`[Vera Discord Bot] Serving ${client.guilds.cache.size} guild(s)`);
  client.user.setActivity('Veridica Labs | Pay Per Conversion', { type: 4 });
});

client.on('messageCreate', async (message) => {
  // Ignore bots
  if (message.author.bot) return;

  // Respond to DMs or when mentioned
  const isDM = !message.guild;
  const isMentioned = message.mentions.has(client.user);
  const startsWithVera = message.content.toLowerCase().startsWith('vera');

  if (!isDM && !isMentioned && !startsWithVera) return;

  // Clean the message (remove mention)
  let content = message.content
    .replace(/<@!?\d+>/g, '')
    .replace(/^vera[,:]?\s*/i, '')
    .trim();

  if (!content) {
    content = 'Hola';
  }

  console.log(`[${message.guild?.name || 'DM'}] ${message.author.username}: ${content}`);

  try {
    await message.channel.sendTyping();

    const reply = await getAIResponse(
      message.channel.id,
      content,
      message.author.username
    );

    // Split long messages (Discord limit is 2000 chars)
    if (reply.length > 2000) {
      const chunks = reply.match(/[\s\S]{1,1990}/g);
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
    } else {
      await message.reply(reply);
    }
  } catch (error) {
    console.error('[Discord Error]', error.message);
    await message.reply('Ocurrió un error procesando tu mensaje. Intenta de nuevo.');
  }
});

// --- Start ---
if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN');
  process.exit(1);
}
if (!AZURE_ENDPOINT || !AZURE_API_KEY) {
  console.error('Missing AZURE_ENDPOINT or AZURE_API_KEY');
  process.exit(1);
}

client.login(DISCORD_TOKEN);
