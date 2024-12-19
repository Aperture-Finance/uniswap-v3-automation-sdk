import { Token } from '@uniswap/sdk-core';
import { AutomatedMarketMakerEnum } from 'aperture-lens/dist/src/viem';
import { Address, Chain, getAddress } from 'viem';
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  mainnet,
  manta,
  mantaTestnet,
  optimism,
  polygon,
  scroll,
} from 'viem/chains';

import { ApertureSupportedChainId } from './interfaces';

export interface ChainSpecificRoutingAPIInfo {
  url: string;
  // Routing API: https://github.com/Uniswap/routing-api/
  // Unified Routing API: https://github.com/Uniswap/unified-routing-api
  // Uniswap maintains an official unified routing API at https://api.uniswap.org/v2/quote.
  // The unified routing API handler internally queries the routing API but we don't know the address of the latter.
  // For the Manta UniV3 fork we only support the routing API and it doesn't make sense to deploy the unified routing API for Manta.
  // Therefore, we need to support querying both routing API (for Manta) and unified routing API (for UniV3 official chains).
  type: 'ROUTING_API' | 'UNIFIED_ROUTING_API';
}

const UNISWAP_OFFICIAL_ROUTING_API_INFO: ChainSpecificRoutingAPIInfo = {
  url: 'https://uniswap-api.aperture.finance/v2/quote',
  type: 'UNIFIED_ROUTING_API',
};

export type AlchemyNetworkId =
  | 'arb'
  | 'avax'
  | 'base'
  | 'bnb'
  | 'eth'
  | 'polygon'
  | 'opt'
  | 'scroll';

export type InfuraNetworkId =
  | 'arbitrum'
  | 'avalanche'
  | 'base'
  | 'bsc'
  | '' // Ethereum
  | 'polygon'
  | 'optimism'
  | 'scroll';

export interface AmmInfo {
  factory: Address;
  poolImplementation?: Address; // Only applicable to SLIPSTREAM.
  poolDeployer?: Address; // Only applicable to PANCAKESWAP_V3.
  nonfungiblePositionManager: Address;
  // This is SwapRouter02 for UNISWAP_V3 and SmartRouter for PANCAKESWAP_V3, undefined for SLIPSTREAM.
  swapRouter?: Address;
  // Aperture's optimal swap router. Only populated for chains with an aggregator service like 1inch.
  optimalSwapRouter?: Address;
  // Aperture's Automan contract address.
  apertureAutoman: Address;
  apertureAutomanV3: Address;
  // The subgraph URL for the AMM.
  // For Uniswap, refer to https://docs.uniswap.org/api/subgraph/overview.
  // For PancakeSwap, refer to https://github.com/pancakeswap/pancake-subgraph.
  subgraph_url?: string;
}

export interface ChainInfo {
  chain: Chain;
  amms: {
    [key in AutomatedMarketMakerEnum]?: AmmInfo;
  };
  wrappedNativeCurrency: Token;
  routingApiInfo: ChainSpecificRoutingAPIInfo;
  // Automan maximum allowed gas deduction ceiling.
  maxGasCeiling: number;
  alchemyNetworkId?: AlchemyNetworkId;
  infura_network_id?: InfuraNetworkId;
  rpc_url?: string;
  // coingecko_asset_platform_id is basically the chain name for coingecko api to look up price by address.
  // Only populated for networks with a CoinGecko asset platform ID.
  coingecko_asset_platform_id?: string;
  // For getTokenPriceFromCoingecko's vs_currencies, case sensitive.
  // https://api.coingecko.com/api/v3/simple/supported_vs_currencies
  coinGeckoNativeCurrencySymbol: string;
}

const CHAIN_ID_TO_INFO: {
  [key in ApertureSupportedChainId]: ChainInfo;
} = {
  [ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID]: {
    chain: mainnet,
    amms: {
      [AutomatedMarketMakerEnum.enum.UNISWAP_V3]: {
        factory: getAddress('0x1F98431c8aD98523631AE4a59f267346ea31F984'),
        nonfungiblePositionManager: getAddress(
          '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        ),
        swapRouter: getAddress('0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'),
        optimalSwapRouter: getAddress(
          '0x00000000063E0E1E06A0FE61e16bE8Bdec1BEA31',
        ),
        apertureAutoman: getAddress(
          '0x00000000Ede6d8D217c60f93191C060747324bca',
        ),
        apertureAutomanV3: getAddress(
          '0x00000070ee937917c1d9bD91729ce1Dd9A77d8e3',
        ),
        subgraph_url:
          'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
      },
      [AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3]: {
        factory: getAddress('0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865'),
        poolDeployer: getAddress('0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9'),
        nonfungiblePositionManager: getAddress(
          '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364',
        ),
        swapRouter: getAddress('0x13f4EA83D0bd40E75C8222255bc855a974568Dd4'),
        optimalSwapRouter: getAddress(
          '0x00000E719aEae2afAD3B00BE068b00Dc2770dc00',
        ),
        apertureAutoman: getAddress(
          '0x000000EEd287174A06550eabE6A00074255CaB34',
        ),
        apertureAutomanV3: getAddress(
          '0x00000076a5FEfF94a54834fe1b2803a6Da672e03',
        ),
        subgraph_url:
          'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-eth',
      },
    },
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
      getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    coingecko_asset_platform_id: 'ethereum',
    coinGeckoNativeCurrencySymbol: 'eth',
    alchemyNetworkId: 'eth',
    infura_network_id: '',
    rpc_url: 'https://ethereum.publicnode.com',
    maxGasCeiling: 0.5,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID]: {
    chain: arbitrum,
    amms: {
      [AutomatedMarketMakerEnum.enum.UNISWAP_V3]: {
        factory: getAddress('0x1F98431c8aD98523631AE4a59f267346ea31F984'),
        nonfungiblePositionManager: getAddress(
          '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        ),
        swapRouter: getAddress('0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'),
        optimalSwapRouter: getAddress(
          '0x00000000063E0E1E06A0FE61e16bE8Bdec1BEA31',
        ),
        apertureAutoman: getAddress(
          '0x00000000Ede6d8D217c60f93191C060747324bca',
        ),
        apertureAutomanV3: getAddress(
          '0x00000070ee937917c1d9bD91729ce1Dd9A77d8e3',
        ),
        subgraph_url:
          'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-one',
      },
    },
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID,
      getAddress('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    coingecko_asset_platform_id: 'arbitrum-one',
    coinGeckoNativeCurrencySymbol: 'eth',
    alchemyNetworkId: 'arb',
    infura_network_id: 'arbitrum',
    rpc_url: 'https://arbitrum-one.publicnode.com',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID]: {
    chain: polygon,
    amms: {
      [AutomatedMarketMakerEnum.enum.UNISWAP_V3]: {
        factory: getAddress('0x1F98431c8aD98523631AE4a59f267346ea31F984'),
        nonfungiblePositionManager: getAddress(
          '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        ),
        swapRouter: getAddress('0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'),
        optimalSwapRouter: getAddress(
          '0x00000000063E0E1E06A0FE61e16bE8Bdec1BEA31',
        ),
        apertureAutoman: getAddress(
          '0x0000000002F4Dd78bA85fE4B662983816c9Ae95F',
        ),
        apertureAutomanV3: getAddress(
          '0x00000070ee937917c1d9bD91729ce1Dd9A77d8e3',
        ),
        subgraph_url:
          'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
      },
    },
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID,
      getAddress('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'),
      18,
      'WMATIC',
      'Wrapped Matic',
    ),
    coingecko_asset_platform_id: 'polygon-pos',
    coinGeckoNativeCurrencySymbol: 'matic',
    alchemyNetworkId: 'polygon',
    infura_network_id: 'polygon',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID]: {
    chain: optimism,
    amms: {
      [AutomatedMarketMakerEnum.enum.UNISWAP_V3]: {
        factory: getAddress('0x1F98431c8aD98523631AE4a59f267346ea31F984'),
        nonfungiblePositionManager: getAddress(
          '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
        ),
        swapRouter: getAddress('0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45'),
        optimalSwapRouter: getAddress(
          '0x00000000063E0E1E06A0FE61e16bE8Bdec1BEA31',
        ),
        apertureAutoman: getAddress(
          '0x0000000002F4Dd78bA85fE4B662983816c9Ae95F',
        ),
        apertureAutomanV3: getAddress(
          '0x00000070ee937917c1d9bD91729ce1Dd9A77d8e3',
        ),
        subgraph_url:
          'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
      },
      [AutomatedMarketMakerEnum.enum.SLIPSTREAM]: {
        // https://velodrome.finance/security#contracts
        factory: getAddress('0xCc0bDDB707055e04e497aB22a59c2aF4391cd12F'),
        poolImplementation: getAddress(
          '0xc28aD28853A547556780BEBF7847628501A3bCbb',
        ),
        nonfungiblePositionManager: getAddress(
          '0x416b433906b1B72FA758e166e239c43d68dC6F29',
        ),
        optimalSwapRouter: getAddress(
          '0x920eE1aDa5C16E82BB0d7876a174407D63C8ec09',
        ),
        apertureAutoman: getAddress(
          '0x000000A117EDD4AA34C39f87eFa66A521c590DA1',
        ),
        apertureAutomanV3: getAddress(
          '0x0000003d82D9fb11e644B84195218DfD3aeC3f73',
        ),
      },
    },
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID,
      getAddress('0x4200000000000000000000000000000000000006'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    coingecko_asset_platform_id: 'optimistic-ethereum',
    coinGeckoNativeCurrencySymbol: 'eth',
    alchemyNetworkId: 'opt',
    infura_network_id: 'optimism',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID]: {
    chain: bsc,
    amms: {
      [AutomatedMarketMakerEnum.enum.UNISWAP_V3]: {
        factory: getAddress('0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7'),
        nonfungiblePositionManager: getAddress(
          '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613',
        ),
        swapRouter: getAddress('0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2'),
        optimalSwapRouter: getAddress(
          '0xE0529B92EBdd478B36BC22434625d898ebE4b489',
        ),
        apertureAutoman: getAddress(
          '0x000000000580f20d53f6d2eC56d12A5Fa75Ac8cF',
        ),
        apertureAutomanV3: getAddress(
          '0x000000E2F3Dd82130669b730Bdf170D12DF35233',
        ),
        subgraph_url:
          'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-bsc',
      },
      [AutomatedMarketMakerEnum.enum.PANCAKESWAP_V3]: {
        factory: getAddress('0x0BFbCF9fa4f9C56B0F40a671Ad40E0805A091865'),
        poolDeployer: getAddress('0x41ff9AA7e16B8B1a8a8dc4f0eFacd93D02d071c9'),
        nonfungiblePositionManager: getAddress(
          '0x46A15B0b27311cedF172AB29E4f4766fbE7F4364',
        ),
        swapRouter: getAddress('0x13f4EA83D0bd40E75C8222255bc855a974568Dd4'),
        optimalSwapRouter: getAddress(
          '0x00000E719aEae2afAD3B00BE068b00Dc2770dc00',
        ),
        apertureAutoman: getAddress(
          '0x000000EEd287174A06550eabE6A00074255CaB34',
        ),
        apertureAutomanV3: getAddress(
          '0x00000076a5FEfF94a54834fe1b2803a6Da672e03',
        ),
        subgraph_url:
          'https://api.thegraph.com/subgraphs/name/pancakeswap/exchange-v3-bsc',
      },
    },
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID,
      getAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
      18,
      'WBNB',
      'Wrapped BNB',
    ),
    coingecko_asset_platform_id: 'binance-smart-chain',
    coinGeckoNativeCurrencySymbol: 'bnb',
    alchemyNetworkId: 'bnb',
    infura_network_id: 'bsc',
    rpc_url: 'https://bsc-dataseed.bnbchain.org',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID]: {
    chain: base,
    amms: {
      [AutomatedMarketMakerEnum.enum.UNISWAP_V3]: {
        factory: getAddress('0x33128a8fC17869897dcE68Ed026d694621f6FDfD'),
        nonfungiblePositionManager: getAddress(
          '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
        ),
        swapRouter: getAddress('0x2626664c2603336E57B271c5C0b26F421741e481'),
        optimalSwapRouter: getAddress(
          '0xCc06600868DdDab1073DEEC925E9D8c22fA8b889',
        ),
        apertureAutoman: getAddress(
          '0x00000000EDb4489cB49FE07246f39345c9f838cD',
        ),
        apertureAutomanV3: getAddress(
          '0x000000C51119E2bDE2419C5e6fD273a81B79A8E3',
        ),
        subgraph_url:
          'https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest',
      },
      [AutomatedMarketMakerEnum.enum.SLIPSTREAM]: {
        // https://aerodrome.finance/security#contracts
        factory: getAddress('0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A'),
        poolImplementation: getAddress(
          '0xeC8E5342B19977B4eF8892e02D8DAEcfa1315831',
        ),
        nonfungiblePositionManager: getAddress(
          '0x827922686190790b37229fd06084350E74485b72',
        ),
        optimalSwapRouter: getAddress(
          '0x0000004bb8983d4E004A8fe998155f1e8ed89989',
        ),
        apertureAutoman: getAddress(
          '0x00000000C733A397F38271c2Eb4CA56193b769Cb',
        ),
        apertureAutomanV3: getAddress(
          '0x000000ca99cf8E1E53B4b7999180Db3e1D032333',
        ),
      },
    },
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID,
      getAddress('0x4200000000000000000000000000000000000006'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    coingecko_asset_platform_id: 'base',
    coinGeckoNativeCurrencySymbol: 'eth',
    alchemyNetworkId: 'base',
    infura_network_id: 'base',
    rpc_url: 'https://mainnet.base.org',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID]: {
    chain: avalanche,
    amms: {
      [AutomatedMarketMakerEnum.enum.UNISWAP_V3]: {
        factory: getAddress('0x740b1c1de25031C31FF4fC9A62f554A55cdC1baD'),
        nonfungiblePositionManager: getAddress(
          '0x655C406EBFa14EE2006250925e54ec43AD184f8B',
        ),
        swapRouter: getAddress('0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE'),
        optimalSwapRouter: getAddress(
          '0x039eC83141218fC68bd85E0067d696769E0576bf',
        ),
        apertureAutoman: getAddress(
          '0x00000000035daa51254bEc3dE4FC1Cd277b35705',
        ),
        apertureAutomanV3: getAddress(
          '0x00000075Cd3dAd5805699d0E1C5734e27B3264e3',
        ),
        subgraph_url:
          'https://api.thegraph.com/subgraphs/name/lynnshaoyu/uniswap-v3-avax',
      },
    },
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID,
      getAddress('0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'),
      18,
      'WAVAX',
      'Wrapped AVAX',
    ),
    coingecko_asset_platform_id: 'avalanche',
    coinGeckoNativeCurrencySymbol: 'avax',
    alchemyNetworkId: 'avax',
    infura_network_id: 'avalanche',
    rpc_url: 'https://avalanche-c-chain-rpc.publicnode.com',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.MANTA_PACIFIC_MAINNET_CHAIN_ID]: {
    chain: manta,
    amms: {
      [AutomatedMarketMakerEnum.enum.UNISWAP_V3]: {
        factory: getAddress('0x5bd1F6735B80e58aAC88B8A94836854d3068a13a'),
        nonfungiblePositionManager: getAddress(
          '0xe77e3F98a386a4C8f8c706A2aCfFdf57e70D06c6',
        ),
        swapRouter: getAddress('0x3488d5A2D0281f546e43435715C436b46Ec1C678'),
        optimalSwapRouter: getAddress(
          '0x000000000d44011EACAB39AB7965687d0bc2B16A',
        ),
        apertureAutoman: getAddress(
          '0x0000000004276d0052eFdBA3E65a6f87fd55C5B7',
        ),
        apertureAutomanV3: getAddress(
          '0x000000bf0E089A0991baB3CD0E111213c71a5aD3',
        ),
        subgraph_url:
          'https://api.goldsky.com/api/public/project_clnz7akg41cv72ntv0uhyd3ai/subgraphs/aperture-manta-pacific/uniswap-v3/gn',
      },
    },
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.MANTA_PACIFIC_MAINNET_CHAIN_ID,
      getAddress('0x0Dc808adcE2099A9F62AA87D9670745AbA741746'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    coingecko_asset_platform_id: 'manta-pacific',
    coinGeckoNativeCurrencySymbol: 'eth',
    rpc_url: 'https://manta-pacific-aperture.calderachain.xyz/http',
    maxGasCeiling: 0.2,
    routingApiInfo: {
      type: 'ROUTING_API',
      url: 'https://uniswap-routing.aperture.finance/quote',
    },
  },
  [ApertureSupportedChainId.MANTA_PACIFIC_TESTNET_CHAIN_ID]: {
    chain: mantaTestnet,
    amms: {
      [AutomatedMarketMakerEnum.enum.UNISWAP_V3]: {
        factory: getAddress('0x884402DfdEf9702dBA7fF8dDdF62AbD6afffb28b'),
        nonfungiblePositionManager: getAddress(
          '0x2dc114c0DEf2BC849996756E691FC6e8339649E1',
        ),
        swapRouter: getAddress('0x5bd1F6735B80e58aAC88B8A94836854d3068a13a'),
        optimalSwapRouter: getAddress(
          '0x000000002c1732dCF01E5C9E057d3fD2A7f1c238',
        ),
        apertureAutoman: getAddress(
          '0x00000000c04A561724F4Ea1181cA6E2E74E70FC1',
        ),
        apertureAutomanV3: getAddress(
          '0x0000000000000000000000000000000000000000',
        ),
        subgraph_url:
          'https://d3lcl3uht06cq4.cloudfront.net/subgraphs/name/aperture/uniswap-v3',
      },
    },
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.MANTA_PACIFIC_TESTNET_CHAIN_ID,
      getAddress('0xdB1fE098232A00A8B81dd6c2A911f2486cb374EE'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    coinGeckoNativeCurrencySymbol: 'eth',
    rpc_url: 'https://manta-testnet.calderachain.xyz/http',
    maxGasCeiling: 0.2,
    routingApiInfo: {
      type: 'ROUTING_API',
      url: 'https://uniswap-routing.aperture.finance/quote',
    },
  },
  [ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID]: {
    chain: scroll,
    amms: {
      [AutomatedMarketMakerEnum.enum.UNISWAP_V3]: {
        factory: getAddress('0x70C62C8b8e801124A4Aa81ce07b637A3e83cb919'),
        nonfungiblePositionManager: getAddress(
          '0xB39002E4033b162fAc607fc3471E205FA2aE5967',
        ),
        swapRouter: getAddress('0xfc30937f5cDe93Df8d48aCAF7e6f5D8D8A31F636'),
        optimalSwapRouter: getAddress(
          '0x00000000Ff5c300B992ae04D59a799AA4fbA1dC8',
        ),
        apertureAutoman: getAddress(
          '0x000000001e433b4a86F252B54D2151Aa21ABB1C2',
        ),
        apertureAutomanV3: getAddress(
          '0x00000027bC53f021F3564180f347425eDAA20883',
        ),
        subgraph_url:
          'https://api.goldsky.com/api/public/project_clnz7akg41cv72ntv0uhyd3ai/subgraphs/aperture-scroll/uniswap-v3/gn',
      },
    },
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.SCROLL_MAINNET_CHAIN_ID,
      getAddress('0x5300000000000000000000000000000000000004'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    coingecko_asset_platform_id: 'scroll',
    coinGeckoNativeCurrencySymbol: 'eth',
    alchemyNetworkId: 'scroll',
    infura_network_id: 'scroll',
    rpc_url: 'https://rpc.scroll.io',
    maxGasCeiling: 0.2,
    routingApiInfo: {
      type: 'ROUTING_API',
      url: 'https://uniswap-routing.aperture.finance/quote',
    },
  },
};

export function getChainInfo(chainId: ApertureSupportedChainId) {
  return CHAIN_ID_TO_INFO[chainId];
}

export function getAMMInfo(
  chainId: ApertureSupportedChainId,
  amm: AutomatedMarketMakerEnum,
) {
  return CHAIN_ID_TO_INFO[chainId].amms[amm];
}

export function getRpcEndpoint(chainId: ApertureSupportedChainId) {
  const { alchemyNetworkId, infura_network_id, rpc_url } =
    CHAIN_ID_TO_INFO[chainId];
  console.log(
    `tommyzhao, ALCHEMY_API_KEY=${process.env.ALCHEMY_API_KEY}, INFURA_API_KEY=${process.env.INFURA_API_KEY}, alchemyNetworkId=${alchemyNetworkId}, infura_network_id=${infura_network_id}, rpc_url=${rpc_url}`,
  );
  if (process.env.ALCHEMY_API_KEY && alchemyNetworkId !== undefined) {
    return `https://${alchemyNetworkId}-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`;
  }
  if (process.env.INFURA_API_KEY && infura_network_id !== undefined) {
    // infura_network_id may be empty (in the case for Ethereum).
    if (infura_network_id === '') {
      return `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
    } else {
      return `https://${infura_network_id}-mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`;
    }
  }
  return rpc_url;
}
