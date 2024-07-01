import { Telegraf, Markup } from "telegraf";
import { MasterWalletClass } from "./wallet";
import dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { formatEther } from "viem";
import { createClient, verify } from "./utils/common";
dotenv.config();
interface UserState {
  [key: string]: string;
}
interface AddressState {
  [key: string]: string;
}
const bot = new Telegraf(process.env.TG_BOT_TOKEN!);

let expectingPrivateKey = false;
const masterWalletClass = new MasterWalletClass();

const userStates: UserState = {};
const addressStates: AddressState = {};
const tokenAmounts = [0.1, 0.5, 1, 5, 10];
const walletAddress = "0x360FbEA2b1Da34D220B1386c8DDb84B2c2BD78ca";
const accounts: any[] = [];
const mainMenu = [
  /* Inline buttons. 2 side-by-side */
  [
    {
      text: "Import wallet",
      callback_data: "import_wallet",
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
];

bot.start(async (ctx) => {
  ctx.reply(`Welcome to our trading tool!`, {
    reply_markup: {
      inline_keyboard: mainMenu,
    },
  });
});

bot.action("import_wallet", (ctx) => {
  const chatId = ctx.chat?.id;
  if (chatId) {
    userStates[chatId] = "entering_private_key";
  }
  ctx.reply("Send the private key of the wallet");
});
bot.action("buy", (ctx) => {
  ctx.reply("Enter the address token to buy");
  if (ctx.chat?.id) {
    userStates[ctx.chat.id] = "entering_address_for_buy";
  }
});
bot.action(/buy_\d+(\.\d+)?/, async (ctx) => {
  const amount = ctx.match[0].split("_")[1];
  // Handle the token buying logic here with the selected amount
  if (ctx.chat?.id) {
    ctx.reply(
      `You have selected to buy ${amount} of token address ${
        addressStates[ctx.chat?.id]
      }`
    );
  }
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
bot.action("transfer", (ctx) => {
  ctx.reply("Enter the address of receiver");
  if (ctx.chat?.id) {
    userStates[ctx.chat.id] = "entering_address_when_transfer";
  }
});

bot.on("message", async (ctx) => {
  switch (userStates[ctx.chat.id]) {
    case "entering_private_key":
      const privateKey = ctx.text || "";
      // Here you can handle the private key received from the user
      if (!verify(privateKey)) {
        ctx.reply("private key must be 32 bytes string");
        return;
      }
      ctx.reply(`Private key received: ${privateKey}`);
      const account = privateKeyToAccount(`0x${privateKey}`);
      accounts.push(account);
      userStates[ctx.chat.id] = "";
      const walletAddressesAndBalancesPromises = accounts.map(
        async (account, index) => {
          const balance = formatEther(
            await masterWalletClass.GetEthBalance(account.address)
          );
          return `Your wallet address ${index + 1} is ${
            account.address
          } with balance ${balance}.`;
        }
      );

      // Wait for all promises to resolve
      const walletAddressesAndBalances = await Promise.all(
        walletAddressesAndBalancesPromises
      );

      // Join the resolved values into a single string
      const result = walletAddressesAndBalances.join("\n");
      ctx.reply(`Welcome to our trading tool! \n ${result}`, {
        reply_markup: {
          inline_keyboard: mainMenu,
        },
      });
      break;
    case "entering_address_when_transfer":
      ctx.reply("Enter the amount you want to send");
      userStates[ctx.chat.id] = "entering_amount_when_transfer";
      if (ctx.text) {
        addressStates[ctx.chat.id] = ctx.text;
      }
      break;
    case "entering_amount_when_transfer":
      ctx.reply(`You will send ${ctx.text} to ${addressStates[ctx.chat.id]}`);
      try {
        const privateKeyTest = process.env.PRIVATE_KEY;
        const walletClient = createClient(privateKeyTest);
        const hash = await masterWalletClass.transferETH(
          walletClient,
          addressStates[ctx.chat.id],
          ctx.text
        );
        ctx.reply(`Transfer executed with hash ${hash}`);
      } catch (error) {
        ctx.reply(`${error}`);
      }

      userStates[ctx.chat.id] = "";
      break;
    case "entering_address_for_buy":
      if (ctx.text) {
        addressStates[ctx.chat.id] = ctx.text;
      }
      const buttons = tokenAmounts.map((amount) => [
        { text: `${amount} tokens`, callback_data: `buy_${amount}` },
      ]);
      buttons.push([{ text: "Sign Tx", callback_data: "sign_tx" }]);
      ctx.reply("Select the amount to buy:", {
        reply_markup: {
          inline_keyboard: buttons,
        },
      });
    default:
      break;
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
