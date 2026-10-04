// No user id in the keys: `UserProvider` clears the whole cache when the user changes.
export const queryKeys = {
  all: ["omni-trak"] as const,
  accounts: () => [...queryKeys.all, "accounts"] as const,
  accountBalances: () => [...queryKeys.accounts(), "balances"] as const,
};
