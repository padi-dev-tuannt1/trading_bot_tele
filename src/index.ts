import { Telegraf, Markup } from "telegraf";
import dotenv from "dotenv";
dotenv.config();

const bot = new Telegraf(process.env.TG_BOT_TOKEN!);

let expectingPrivateKey = false;

bot.start((ctx) =>
  ctx.reply("Welcome to our counter app!", {
    reply_markup: {
      inline_keyboard: [
        /* Inline buttons. 2 side-by-side */
        [
          {
            text: "Import wallet",
            callback_data: "import_wallet",
            // web_app: { url: "https://app.uniswap.org/" },
            // pay: true,
          },
        ],
        [
          { text: "Buy", callback_data: "buy" },
          { text: "Sell", callback_data: "sell" },
        ],

        /* One button */
        [
          { text: "Pump", callback_data: "pump" },
          { text: "Dump", callback_data: "dump" },
        ],

        [
          { text: "Make volume", callback_data: "make_volume" },
          { text: "Keep price", callback_data: "keep_price" },
        ],

        /* Also, we can have URL buttons. */
        [{ text: "Transfer", callback_data: "transfer" }],
      ],
    },
  })
);

bot.action("import_wallet", (ctx) => {
  expectingPrivateKey = true;
  // Handle increment by 5 logic here
  ctx.reply("Send the private key of the wallet");
});
bot.action("buy", (ctx) => {
  // Handle increment by 5 logic here
  ctx.reply("buy 1 TON");
});
bot.action("sell", (ctx) => {
  // Handle increment by 5 logic here
  ctx.reply("sell 0.7 TON");
});
bot.action("pump", (ctx) => {
  // Handle increment by 5 logic here
  ctx.reply("pump");
});
bot.action("dump", (ctx) => {
  // Handle increment by 5 logic here
  ctx.reply("dump");
});
bot.action("make_volume", (ctx) => {
  // Handle increment by 5 logic here
  ctx.reply("make volume");
});
bot.action("keep_price", (ctx) => {
  // Handle increment by 5 logic here
  ctx.reply("keep price");
});
bot.on("message", (ctx) => {
  if (!expectingPrivateKey) return;
  const privateKey = ctx.message.text;
  // Here you can handle the private key received from the user
  ctx.reply(`Private key received: ${privateKey}`);
  console.log(`Private key: ${privateKey}`);
  expectingPrivateKey = false;
});
bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
