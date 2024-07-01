import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

export const createClient = (privateKey: any) => {
  const account = privateKeyToAccount(`0x${privateKey}`);
  return createWalletClient({
    account,
    chain: base,
    transport: http(
      "https://open-platform.nodereal.io/0a42555af808434c855f661459c486e7/base"
    ),
  });
};
export const verify = (value: string) => {
  try {
    privateKeyToAccount(`0x${value}`);
  } catch (e) {
    return false;
  }
  return true;
};
