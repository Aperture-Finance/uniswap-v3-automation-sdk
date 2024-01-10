// Adapted from https://github.com/Uniswap/interface/blob/main/src/constants/tokens.ts and https://github.com/Uniswap/interface/blob/main/src/constants/addresses.ts.
import {
  Currency,
  Ether,
  NativeCurrency,
  Token,
  WETH9,
} from '@uniswap/sdk-core';
import invariant from 'tiny-invariant';

export enum UniswapSupportedChainId {
  MAINNET = 1,
  GOERLI = 5,

  ARBITRUM_ONE = 42161,
  ARBITRUM_GOERLI = 421613,

  OPTIMISM = 10,
  OPTIMISM_GOERLI = 420,

  POLYGON = 137,
  POLYGON_MUMBAI = 80001,

  CELO = 42220,
  CELO_ALFAJORES = 44787,

  BNB = 56,
}

const DEFAULT_NETWORKS = [
  UniswapSupportedChainId.MAINNET,
  UniswapSupportedChainId.GOERLI,
];
type AddressMap = { [chainId: number]: string };

function constructSameAddressMap(
  address: string,
  additionalNetworks: UniswapSupportedChainId[] = [],
): AddressMap {
  return DEFAULT_NETWORKS.concat(additionalNetworks).reduce<AddressMap>(
    (memo, chainId) => {
      memo[chainId] = address;
      return memo;
    },
    {},
  );
}

const CELO_NONFUNGIBLE_POSITION_MANAGER_ADDRESSES =
  '0x3d79EdAaBC0EaB6F08ED885C05Fc0B014290D95A';
const BNB_NONFUNGIBLE_POSITION_MANAGER_ADDRESSES =
  '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613';
const OPTIMISM_GOERLI_NONFUNGIBLE_POSITION_MANAGER_ADDRESSES =
  '0x39Ca85Af2F383190cBf7d7c41ED9202D27426EF6';
const ARBITRUM_GOERLI_NONFUNGIBLE_POSITION_MANAGER_ADDRESSES =
  '0x622e4726a167799826d1E1D150b076A7725f5D81';
export const NONFUNGIBLE_POSITION_MANAGER_ADDRESSES: AddressMap = {
  ...constructSameAddressMap('0xC36442b4a4522E871399CD717aBDD847Ab11FE88', [
    UniswapSupportedChainId.OPTIMISM,
    UniswapSupportedChainId.ARBITRUM_ONE,
    UniswapSupportedChainId.POLYGON_MUMBAI,
    UniswapSupportedChainId.POLYGON,
  ]),
  [UniswapSupportedChainId.CELO]: CELO_NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
  [UniswapSupportedChainId.CELO_ALFAJORES]:
    CELO_NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
  [UniswapSupportedChainId.BNB]: BNB_NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
  [UniswapSupportedChainId.OPTIMISM_GOERLI]:
    OPTIMISM_GOERLI_NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
  [UniswapSupportedChainId.ARBITRUM_GOERLI]:
    ARBITRUM_GOERLI_NONFUNGIBLE_POSITION_MANAGER_ADDRESSES,
};

export const NATIVE_CHAIN_ID = 'NATIVE';

// When decimals are not specified for an ERC20 token
// use default ERC20 token decimals as specified here:
// https://docs.openzeppelin.com/contracts/3.x/erc20
export const DEFAULT_ERC20_DECIMALS = 18;

export const USDC_MAINNET = new Token(
  UniswapSupportedChainId.MAINNET,
  '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  6,
  'USDC',
  'USD//C',
);
const USDC_GOERLI = new Token(
  UniswapSupportedChainId.GOERLI,
  '0x07865c6e87b9f70255377e024ace6630c1eaa37f',
  6,
  'USDC',
  'USD//C',
);
export const USDC_OPTIMISM = new Token(
  UniswapSupportedChainId.OPTIMISM,
  '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
  6,
  'USDC',
  'USD//C',
);
const USDC_OPTIMISM_GOERLI = new Token(
  UniswapSupportedChainId.OPTIMISM_GOERLI,
  '0x7E07E15D2a87A24492740D16f5bdF58c16db0c4E',
  6,
  'USDC',
  'USD//C',
);
export const USDC_ARBITRUM = new Token(
  UniswapSupportedChainId.ARBITRUM_ONE,
  '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
  6,
  'USDC',
  'USD//C',
);
export const USDC_ARBITRUM_GOERLI = new Token(
  UniswapSupportedChainId.ARBITRUM_GOERLI,
  '0x8FB1E3fC51F3b789dED7557E680551d93Ea9d892',
  6,
  'USDC',
  'USD//C',
);
export const USDC_POLYGON = new Token(
  UniswapSupportedChainId.POLYGON,
  '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
  6,
  'USDC',
  'USD//C',
);
const USDC_POLYGON_MUMBAI = new Token(
  UniswapSupportedChainId.POLYGON_MUMBAI,
  '0xe11a86849d99f524cac3e7a0ec1241828e332c62',
  6,
  'USDC',
  'USD//C',
);
export const PORTAL_USDC_CELO = new Token(
  UniswapSupportedChainId.CELO,
  '0x37f750B7cC259A2f741AF45294f6a16572CF5cAd',
  6,
  'USDCet',
  'USDC (Portal from Ethereum)',
);
export const AMPL = new Token(
  UniswapSupportedChainId.MAINNET,
  '0xD46bA6D942050d489DBd938a2C909A5d5039A161',
  9,
  'AMPL',
  'Ampleforth',
);
export const DAI = new Token(
  UniswapSupportedChainId.MAINNET,
  '0x6B175474E89094C44Da98b954EedeAC495271d0F',
  18,
  'DAI',
  'Dai Stablecoin',
);
export const DAI_ARBITRUM_ONE = new Token(
  UniswapSupportedChainId.ARBITRUM_ONE,
  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  18,
  'DAI',
  'Dai stable coin',
);
export const DAI_OPTIMISM = new Token(
  UniswapSupportedChainId.OPTIMISM,
  '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
  18,
  'DAI',
  'Dai stable coin',
);
export const DAI_POLYGON = new Token(
  UniswapSupportedChainId.POLYGON,
  '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
  18,
  'DAI',
  'Dai Stablecoin',
);
export const USDT_POLYGON = new Token(
  UniswapSupportedChainId.POLYGON,
  '0xc2132d05d31c914a87c6611c10748aeb04b58e8f',
  6,
  'USDT',
  'Tether USD',
);
export const WBTC_POLYGON = new Token(
  UniswapSupportedChainId.POLYGON,
  '0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6',
  8,
  'WBTC',
  'Wrapped BTC',
);
export const USDT = new Token(
  UniswapSupportedChainId.MAINNET,
  '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  6,
  'USDT',
  'Tether USD',
);
export const USDT_ARBITRUM_ONE = new Token(
  UniswapSupportedChainId.ARBITRUM_ONE,
  '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
  6,
  'USDT',
  'Tether USD',
);
export const USDT_OPTIMISM = new Token(
  UniswapSupportedChainId.OPTIMISM,
  '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  6,
  'USDT',
  'Tether USD',
);
export const WBTC = new Token(
  UniswapSupportedChainId.MAINNET,
  '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  8,
  'WBTC',
  'Wrapped BTC',
);
export const WBTC_ARBITRUM_ONE = new Token(
  UniswapSupportedChainId.ARBITRUM_ONE,
  '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
  8,
  'WBTC',
  'Wrapped BTC',
);
export const WBTC_OPTIMISM = new Token(
  UniswapSupportedChainId.OPTIMISM,
  '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
  8,
  'WBTC',
  'Wrapped BTC',
);
export const FEI = new Token(
  UniswapSupportedChainId.MAINNET,
  '0x956F47F50A910163D8BF957Cf5846D573E7f87CA',
  18,
  'FEI',
  'Fei USD',
);
export const TRIBE = new Token(
  UniswapSupportedChainId.MAINNET,
  '0xc7283b66Eb1EB5FB86327f08e1B5816b0720212B',
  18,
  'TRIBE',
  'Tribe',
);
export const FRAX = new Token(
  UniswapSupportedChainId.MAINNET,
  '0x853d955aCEf822Db058eb8505911ED77F175b99e',
  18,
  'FRAX',
  'Frax',
);
export const FXS = new Token(
  UniswapSupportedChainId.MAINNET,
  '0x3432B6A60D23Ca0dFCa7761B7ab56459D9C964D0',
  18,
  'FXS',
  'Frax Share',
);
export const renBTC = new Token(
  UniswapSupportedChainId.MAINNET,
  '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D',
  8,
  'renBTC',
  'renBTC',
);
export const ETH2X_FLI = new Token(
  UniswapSupportedChainId.MAINNET,
  '0xAa6E8127831c9DE45ae56bB1b0d4D4Da6e5665BD',
  18,
  'ETH2x-FLI',
  'ETH 2x Flexible Leverage Index',
);
export const sETH2 = new Token(
  UniswapSupportedChainId.MAINNET,
  '0xFe2e637202056d30016725477c5da089Ab0A043A',
  18,
  'sETH2',
  'StakeWise Staked ETH2',
);
export const rETH2 = new Token(
  UniswapSupportedChainId.MAINNET,
  '0x20BC832ca081b91433ff6c17f85701B6e92486c5',
  18,
  'rETH2',
  'StakeWise Reward ETH2',
);
export const SWISE = new Token(
  UniswapSupportedChainId.MAINNET,
  '0x48C3399719B582dD63eB5AADf12A40B4C3f52FA2',
  18,
  'SWISE',
  'StakeWise',
);
export const WETH_POLYGON_MUMBAI = new Token(
  UniswapSupportedChainId.POLYGON_MUMBAI,
  '0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa',
  18,
  'WETH',
  'Wrapped Ether',
);

export const WETH_POLYGON = new Token(
  UniswapSupportedChainId.POLYGON,
  '0x7ceb23fd6bc0add59e62ac25578270cff1b9f619',
  18,
  'WETH',
  'Wrapped Ether',
);
const CELO_CELO = new Token(
  UniswapSupportedChainId.CELO,
  '0x471EcE3750Da237f93B8E339c536989b8978a438',
  18,
  'CELO',
  'Celo',
);
export const CUSD_CELO = new Token(
  UniswapSupportedChainId.CELO,
  '0x765DE816845861e75A25fCA122bb6898B8B1282a',
  18,
  'cUSD',
  'Celo Dollar',
);
export const CEUR_CELO = new Token(
  UniswapSupportedChainId.CELO,
  '0xD8763CBa276a3738E6DE85b4b3bF5FDed6D6cA73',
  18,
  'cEUR',
  'Celo Euro Stablecoin',
);
export const PORTAL_ETH_CELO = new Token(
  UniswapSupportedChainId.CELO,
  '0x66803FB87aBd4aaC3cbB3fAd7C3aa01f6F3FB207',
  18,
  'ETH',
  'Portal Ether',
);
export const CMC02_CELO = new Token(
  UniswapSupportedChainId.CELO,
  '0x32A9FE697a32135BFd313a6Ac28792DaE4D9979d',
  18,
  'cMCO2',
  'Celo Moss Carbon Credit',
);
const CELO_CELO_ALFAJORES = new Token(
  UniswapSupportedChainId.CELO_ALFAJORES,
  '0xF194afDf50B03e69Bd7D057c1Aa9e10c9954E4C9',
  18,
  'CELO',
  'Celo',
);
export const CUSD_CELO_ALFAJORES = new Token(
  UniswapSupportedChainId.CELO_ALFAJORES,
  '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1',
  18,
  'CUSD',
  'Celo Dollar',
);
export const CEUR_CELO_ALFAJORES = new Token(
  UniswapSupportedChainId.CELO_ALFAJORES,
  '0x10c892A6EC43a53E45D0B916B4b7D383B1b78C0F',
  18,
  'CEUR',
  'Celo Euro Stablecoin',
);

export const USDC_BSC = new Token(
  UniswapSupportedChainId.BNB,
  '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
  18,
  'USDC',
  'USDC',
);

export const USDT_BSC = new Token(
  UniswapSupportedChainId.BNB,
  '0x55d398326f99059fF775485246999027B3197955',
  18,
  'USDT',
  'USDT',
);

export const ETH_BSC = new Token(
  UniswapSupportedChainId.BNB,
  '0x2170Ed0880ac9A755fd29B2688956BD959F933F8',
  18,
  'ETH',
  'Ethereum',
);

export const MATIC_BSC = new Token(
  UniswapSupportedChainId.BNB,
  '0xCC42724C6683B7E57334c4E856f4c9965ED682bD',
  18,
  'MATIC',
  'Matic',
);

export const FRAX_BSC = new Token(
  UniswapSupportedChainId.BNB,
  '0x90C97F71E18723b0Cf0dfa30ee176Ab653E89F40',
  18,
  'FRAX',
  'FRAX',
);

export const BTC_BSC = new Token(
  UniswapSupportedChainId.BNB,
  '0x7130d2A12B9BCbFAe4f2634d864A1Ee1Ce3Ead9c',
  18,
  'BTCB',
  'BTCB',
);

export const CAKE_BSC = new Token(
  UniswapSupportedChainId.BNB,
  '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
  18,
  'CAKE',
  'Cake',
);

export const BUSD_BSC = new Token(
  UniswapSupportedChainId.BNB,
  '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
  18,
  'BUSD',
  'BUSD',
);

export const DAI_BSC = new Token(
  UniswapSupportedChainId.BNB,
  '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3',
  18,
  'DAI',
  'DAI',
);

export const UNI: { [chainId: number]: Token } = {
  [UniswapSupportedChainId.MAINNET]: new Token(
    UniswapSupportedChainId.MAINNET,
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    18,
    'UNI',
    'Uniswap',
  ),
  [UniswapSupportedChainId.GOERLI]: new Token(
    UniswapSupportedChainId.GOERLI,
    '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    18,
    'UNI',
    'Uniswap',
  ),
};

export const WRAPPED_NATIVE_CURRENCY: { [chainId: number]: Token | undefined } =
  {
    ...(WETH9 as Record<UniswapSupportedChainId, Token>),
    [UniswapSupportedChainId.OPTIMISM]: new Token(
      UniswapSupportedChainId.OPTIMISM,
      '0x4200000000000000000000000000000000000006',
      18,
      'WETH',
      'Wrapped Ether',
    ),
    [UniswapSupportedChainId.OPTIMISM_GOERLI]: new Token(
      UniswapSupportedChainId.OPTIMISM_GOERLI,
      '0x4200000000000000000000000000000000000006',
      18,
      'WETH',
      'Wrapped Ether',
    ),
    [UniswapSupportedChainId.ARBITRUM_ONE]: new Token(
      UniswapSupportedChainId.ARBITRUM_ONE,
      '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      18,
      'WETH',
      'Wrapped Ether',
    ),
    [UniswapSupportedChainId.ARBITRUM_GOERLI]: new Token(
      UniswapSupportedChainId.ARBITRUM_GOERLI,
      '0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3',
      18,
      'WETH',
      'Wrapped Ether',
    ),
    [UniswapSupportedChainId.POLYGON]: new Token(
      UniswapSupportedChainId.POLYGON,
      '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      18,
      'WMATIC',
      'Wrapped MATIC',
    ),
    [UniswapSupportedChainId.POLYGON_MUMBAI]: new Token(
      UniswapSupportedChainId.POLYGON_MUMBAI,
      '0x9c3C9283D3e44854697Cd22D3Faa240Cfb032889',
      18,
      'WMATIC',
      'Wrapped MATIC',
    ),
    [UniswapSupportedChainId.CELO]: new Token(
      UniswapSupportedChainId.CELO,
      '0x471ece3750da237f93b8e339c536989b8978a438',
      18,
      'CELO',
      'Celo native asset',
    ),
    [UniswapSupportedChainId.CELO_ALFAJORES]: new Token(
      UniswapSupportedChainId.CELO_ALFAJORES,
      '0xf194afdf50b03e69bd7d057c1aa9e10c9954e4c9',
      18,
      'CELO',
      'Celo native asset',
    ),
    [UniswapSupportedChainId.BNB]: new Token(
      UniswapSupportedChainId.BNB,
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      18,
      'WBNB',
      'Wrapped BNB',
    ),
  };

export function isCelo(
  chainId: number,
): chainId is
  | UniswapSupportedChainId.CELO
  | UniswapSupportedChainId.CELO_ALFAJORES {
  return (
    chainId === UniswapSupportedChainId.CELO_ALFAJORES ||
    chainId === UniswapSupportedChainId.CELO
  );
}

function getCeloNativeCurrency(chainId: number) {
  switch (chainId) {
    case UniswapSupportedChainId.CELO_ALFAJORES:
      return CELO_CELO_ALFAJORES;
    case UniswapSupportedChainId.CELO:
      return CELO_CELO;
    default:
      throw new Error('Not celo');
  }
}

function isMatic(
  chainId: number,
): chainId is
  | UniswapSupportedChainId.POLYGON
  | UniswapSupportedChainId.POLYGON_MUMBAI {
  return (
    chainId === UniswapSupportedChainId.POLYGON_MUMBAI ||
    chainId === UniswapSupportedChainId.POLYGON
  );
}

class MaticNativeCurrency extends NativeCurrency {
  equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId;
  }

  get wrapped(): Token {
    if (!isMatic(this.chainId)) throw new Error('Not matic');
    const wrapped = WRAPPED_NATIVE_CURRENCY[this.chainId];
    invariant(wrapped instanceof Token);
    return wrapped;
  }

  public constructor(chainId: number) {
    if (!isMatic(chainId)) throw new Error('Not matic');
    super(chainId, 18, 'MATIC', 'Polygon Matic');
  }
}

function isBsc(chainId: number): chainId is UniswapSupportedChainId.BNB {
  return chainId === UniswapSupportedChainId.BNB;
}

class BscNativeCurrency extends NativeCurrency {
  equals(other: Currency): boolean {
    return other.isNative && other.chainId === this.chainId;
  }

  get wrapped(): Token {
    if (!isBsc(this.chainId)) throw new Error('Not bnb');
    const wrapped = WRAPPED_NATIVE_CURRENCY[this.chainId];
    invariant(wrapped instanceof Token);
    return wrapped;
  }

  public constructor(chainId: number) {
    if (!isBsc(chainId)) throw new Error('Not bnb');
    super(chainId, 18, 'BNB', 'BNB');
  }
}

class ExtendedEther extends Ether {
  public get wrapped(): Token {
    const wrapped = WRAPPED_NATIVE_CURRENCY[this.chainId];
    if (wrapped) return wrapped;
    throw new Error(`Unsupported chain ID: ${this.chainId}`);
  }

  private static _cachedExtendedEther: { [chainId: number]: NativeCurrency } =
    {};

  public static onChain(chainId: number): ExtendedEther {
    return (
      this._cachedExtendedEther[chainId] ??
      (this._cachedExtendedEther[chainId] = new ExtendedEther(chainId))
    );
  }
}

const cachedNativeCurrency: { [chainId: number]: NativeCurrency | Token } = {};

export function nativeOnChain(chainId: number): NativeCurrency | Token {
  if (cachedNativeCurrency[chainId]) return cachedNativeCurrency[chainId];
  let nativeCurrency: NativeCurrency | Token;
  if (isMatic(chainId)) {
    nativeCurrency = new MaticNativeCurrency(chainId);
  } else if (isCelo(chainId)) {
    nativeCurrency = getCeloNativeCurrency(chainId);
  } else if (isBsc(chainId)) {
    nativeCurrency = new BscNativeCurrency(chainId);
  } else {
    nativeCurrency = ExtendedEther.onChain(chainId);
  }
  return (cachedNativeCurrency[chainId] = nativeCurrency);
}

export function getSwapCurrencyId(currency: Currency): string {
  if (currency.isToken) {
    return currency.address;
  }
  return NATIVE_CHAIN_ID;
}

export const TOKEN_SHORTHANDS: {
  [shorthand: string]: { [chainId in UniswapSupportedChainId]?: string };
} = {
  USDC: {
    [UniswapSupportedChainId.MAINNET]: USDC_MAINNET.address,
    [UniswapSupportedChainId.ARBITRUM_ONE]: USDC_ARBITRUM.address,
    [UniswapSupportedChainId.ARBITRUM_GOERLI]: USDC_ARBITRUM_GOERLI.address,
    [UniswapSupportedChainId.OPTIMISM]: USDC_OPTIMISM.address,
    [UniswapSupportedChainId.OPTIMISM_GOERLI]: USDC_OPTIMISM_GOERLI.address,
    [UniswapSupportedChainId.POLYGON]: USDC_POLYGON.address,
    [UniswapSupportedChainId.POLYGON_MUMBAI]: USDC_POLYGON_MUMBAI.address,
    [UniswapSupportedChainId.BNB]: USDC_BSC.address,
    [UniswapSupportedChainId.CELO]: PORTAL_USDC_CELO.address,
    [UniswapSupportedChainId.CELO_ALFAJORES]: PORTAL_USDC_CELO.address,
    [UniswapSupportedChainId.GOERLI]: USDC_GOERLI.address,
  },
};
