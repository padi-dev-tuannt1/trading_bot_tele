import { Telegraf, Markup } from "telegraf";
import { MasterWalletClass } from "./wallet";
import dotenv from "dotenv";
import { privateKeyToAccount } from "viem/accounts";
import { formatEther } from "viem";
import { createClient, verify } from "./utils/common";
import { Token, WETH9 } from "@uniswap/sdk-core";

dotenv.config();
interface UserState {
  [key: string]: string;
}
interface AddressState {
  [key: string]: string;
}
const bot = new Telegraf(process.env.TG_BOT_TOKEN!);
const masterWalletClass = new MasterWalletClass();

const userStates: UserState = {};
const addressStates: AddressState = {};
const amountSelections: { [key: number]: number } = {};
const percentSellSelections: { [key: number]: number } = {};
const chainId = 8453;
const tokenAmounts = [0.00001, 0.00005, 1, 5, 10];
const percentSells = [10, 25, 50, 75, 100];
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
const amountKeyboard = (
  selectedChoice?: number,
  options: any[],
  editAmountButton: any
) => {
  const buttons = options.map((option) => [
    {
      text: `${option === selectedChoice ? "✅ " + option : option} tokens`,
      callback_data: `buy_${option}`,
    },
  ]);
  if (editAmountButton) {
    buttons.push(editAmountButton);
  }
  buttons.push([{ text: "Sign Tx", callback_data: "sign_tx" }]);

  return buttons;
};

const percentSellKeyboard = (
  selectedChoice?: number,
  options: any[],
  editPercentButton: any
) => {
  const buttons = options.map((option) => [
    {
      text: `${option === selectedChoice ? "✅ " + option : option} %`,
      callback_data: `sell_${option}`,
    },
  ]);
  if (editPercentButton) {
    buttons.push(editPercentButton);
  }
  buttons.push([{ text: "Sign Tx", callback_data: "sign_tx" }]);

  return buttons;
};

const swap = async (tokenIn: any, tokenOut: any, amountIn: any) => {
  const privateKeyTest = process.env.PRIVATE_KEY;
  const walletClient = createClient(privateKeyTest);
  const account = privateKeyToAccount(`0x${privateKeyTest}`);
  try {
    const hash = await masterWalletClass.swap(
      tokenIn,
      tokenOut,
      amountIn,
      null,
      walletClient,
      account,
      false,
      chainId
    );
    return hash;
  } catch (error) {
    return false;
  }
};

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
  if (ctx.chat?.id) {
    amountSelections[ctx.chat.id] = Number(amount);
    const editAmountButton = [
      {
        text: `✏️ token`,
        callback_data: `edit_amount`,
      },
    ];
    ctx.editMessageReplyMarkup({
      inline_keyboard: amountKeyboard(
        Number(amount),
        tokenAmounts,
        editAmountButton
      ),
    });
    ctx.reply(
      `You have selected to buy ${amount} of token address ${
        addressStates[ctx.chat?.id]
      }`
    );
  }
});
bot.action("edit_amount", async (ctx) => {
  ctx.reply("Enter the amount to buy");
  if (ctx.chat?.id) {
    userStates[ctx.chat.id] = "waiting_for_custom_amount";
  }
});

bot.action("sell", (ctx) => {
  ctx.reply("Enter the address token to sell");
  if (ctx.chat?.id) {
    userStates[ctx.chat.id] = "entering_address_for_sell";
  }
});
bot.action(/sell_\d+(\.\d+)?/, async (ctx) => {
  const percent = ctx.match[0].split("_")[1];
  if (ctx.chat?.id) {
    percentSellSelections[ctx.chat.id] = Number(percent);
    const editPercentSellButton = [
      {
        text: `✏️ %`,
        callback_data: `edit_sell_percent`,
      },
    ];
    ctx.editMessageReplyMarkup({
      inline_keyboard: percentSellKeyboard(
        Number(percent),
        percentSells,
        editPercentSellButton
      ),
    });
    ctx.reply(
      `You have selected to sell ${percent} of token address ${
        addressStates[ctx.chat?.id]
      }`
    );
  }
});
bot.action("edit_sell_percent", async (ctx) => {
  ctx.reply("Enter the percent to sell");
  if (ctx.chat?.id) {
    userStates[ctx.chat.id] = "waiting_for_custom_percent_sell";
  }
});
bot.action("transfer", (ctx) => {
  ctx.reply("Enter the address of receiver");
  if (ctx.chat?.id) {
    userStates[ctx.chat.id] = "entering_address_when_transfer";
  }
});
bot.action("sign_tx", async (ctx) => {
  if (ctx.chat?.id) {
    ctx.reply(
      `You will buy ${amountSelections[ctx.chat.id]} ETH for ${
        addressStates[ctx.chat.id]
      }`
    );
    const tokenOut = new Token(Number(chainId), addressStates[ctx.chat.id], 18);
    const result = await swap(
      WETH9[chainId],
      tokenOut,
      amountSelections[ctx.chat.id]
    );
    if (result) {
      ctx.reply(`Swap executed with hash ${result}`);
    } else {
      ctx.reply("Swap failed");
    }
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
        percentSellSelections[ctx.chat.id] = percentSells[0];
      }
      const editAmountButton = [
        {
          text: `✏️ token`,
          callback_data: `edit_amount`,
        },
      ];
      ctx.reply("Select the amount to buy:", {
        reply_markup: {
          inline_keyboard: amountKeyboard(
            tokenAmounts[0],
            tokenAmounts,
            editAmountButton
          ),
        },
      });
      userStates[ctx.chat.id] = "";
      break;
    case "waiting_for_custom_amount":
      const editAmountButton2 = [
        {
          text: `✅ ${ctx.text} token`,
          callback_data: `buy_${ctx.text}`,
        },
      ];
      amountSelections[ctx.chat.id] = Number(ctx.text);
      ctx.reply("Select the amount to buy", {
        reply_markup: {
          inline_keyboard: amountKeyboard(
            Number(ctx.text),
            tokenAmounts,
            editAmountButton2
          ),
        },
      });
      userStates[ctx.chat.id] = "";
      break;
    case "entering_address_for_sell":
      if (ctx.text) {
        addressStates[ctx.chat.id] = ctx.text;
        amountSelections[ctx.chat.id] = percentSells[0];
      }
      const editSellAmountButton = [
        {
          text: `✏️ %`,
          callback_data: `edit_sell_percent`,
        },
      ];
      ctx.reply("Select the percent to sell:", {
        reply_markup: {
          inline_keyboard: percentSellKeyboard(
            percentSells[0],
            percentSells,
            editSellAmountButton
          ),
        },
      });
      userStates[ctx.chat.id] = "";
      break;
    case "waiting_for_custom_percent_sell":
      const editPercentCell = [
        {
          text: `✅ ${ctx.text} %`,
          callback_data: `sell_${ctx.text}`,
        },
      ];
      percentSellSelections[ctx.chat.id] = Number(ctx.text);
      ctx.reply("Select the percent to sell", {
        reply_markup: {
          inline_keyboard: percentSellKeyboard(
            Number(ctx.text),
            percentSells,
            editPercentCell
          ),
        },
      });
      userStates[ctx.chat.id] = "";
      break;
    default:
      break;
  }
});

bot.launch();

// Enable graceful stop
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
