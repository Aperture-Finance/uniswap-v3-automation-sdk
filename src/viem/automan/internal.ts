import { Address } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';

export function getFromAddress(from?: Address) {
  if (from === undefined) {
    const privateKey = generatePrivateKey();
    const account = privateKeyToAccount(privateKey);
    from = account.address;
  }
  return from;
}
