import { Token } from '@uniswap/sdk-core';
import { Address, Chain, getAddress } from 'viem';
import {
  arbitrum,
  arbitrumGoerli,
  avalanche,
  base,
  bsc,
  celo,
  goerli,
  mainnet,
  optimism,
  polygon,
} from 'viem/chains';

import whitelistedPoolsEthereum from './data/whitelistedPools-1.json';
import whitelistedPoolsGoerli from './data/whitelistedPools-5.json';
import whitelistedPoolsArbitrum from './data/whitelistedPools-42161.json';
import { ApertureSupportedChainId } from './interfaces';
import {
  WhitelistedPool,
  getWhitelistedPools,
  getWhitelistedTokens,
} from './whitelist';

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

export interface ChainInfo {
  chain: Chain;
  uniswap_v3_factory: Address;
  uniswap_v3_nonfungible_position_manager: Address;
  uniswap_v3_swap_router_02: Address;
  aperture_uniswap_v3_automan: Address;
  aperture_router_proxy?: Address;
  optimal_swap_router?: Address;
  wrappedNativeCurrency: Token;
  routingApiInfo: ChainSpecificRoutingAPIInfo;
  // Automan maximum allowed gas deduction ceiling.
  maxGasCeiling: number;
  // Only populated for networks that have an Infura endpoint.
  infura_network_id?: string;
  // Only populated for networks that do not have an Infura endpoint.
  rpc_url?: string;
  // Only populated for networks with a CoinGecko asset platform ID.
  coingecko_asset_platform_id?: string;
  // Only populated for networks with a Uniswap subgraph URL.
  uniswap_subgraph_url?: string;
  // TODO: remove `whitelistedPools` and `whitelistedTokens` once the frontend is updated to allow all pools/tokens.
  // Only populated for networks with whitelisted pools.
  whitelistedPools?: Map<string, WhitelistedPool>;
  whitelistedTokens?: Map<string, Token>;
}

const CHAIN_ID_TO_INFO: {
  [key in ApertureSupportedChainId]: ChainInfo;
} = {
  [ApertureSupportedChainId.GOERLI_TESTNET_CHAIN_ID]: {
    chain: goerli,
    uniswap_v3_factory: getAddress(
      '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    ),
    aperture_uniswap_v3_automan: getAddress(
      '0x00000000Ede6d8D217c60f93191C060747324bca',
    ),
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.GOERLI_TESTNET_CHAIN_ID,
      getAddress('0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    infura_network_id: 'goerli',
    whitelistedPools: getWhitelistedPools(
      ApertureSupportedChainId.GOERLI_TESTNET_CHAIN_ID,
      whitelistedPoolsGoerli,
    ),
    whitelistedTokens: getWhitelistedTokens(
      ApertureSupportedChainId.GOERLI_TESTNET_CHAIN_ID,
      whitelistedPoolsGoerli,
    ),
    maxGasCeiling: 0.05,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.ARBITRUM_GOERLI_TESTNET_CHAIN_ID]: {
    chain: arbitrumGoerli,
    uniswap_v3_factory: getAddress(
      '0x4893376342d5D7b3e31d4184c08b265e5aB2A3f6',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0x622e4726a167799826d1E1D150b076A7725f5D81',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    ),
    aperture_uniswap_v3_automan: getAddress(
      '0xcd9002c47348c54B1C044e30E449CdAe44124139',
    ),
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.ARBITRUM_GOERLI_TESTNET_CHAIN_ID,
      getAddress('0xe39Ab88f8A4777030A534146A9Ca3B52bd5D43A3'),
      18,
      'WETH',
      'WETH',
    ),
    infura_network_id: 'arbitrum-goerli',
    maxGasCeiling: 0.05,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID]: {
    chain: mainnet,
    uniswap_v3_factory: getAddress(
      '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    ),
    aperture_uniswap_v3_automan: getAddress(
      '0x00000000Ede6d8D217c60f93191C060747324bca',
    ),
    aperture_router_proxy: getAddress(
      '0x0000000095538AD2A95685330eD1268C69753BC2',
    ),
    optimal_swap_router: getAddress(
      '0x00000000063E0E1E06A0FE61e16bE8Bdec1BEA31',
    ),
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
      getAddress('0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    coingecko_asset_platform_id: 'ethereum',
    infura_network_id: 'mainnet',
    uniswap_subgraph_url:
      'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    whitelistedPools: getWhitelistedPools(
      ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
      whitelistedPoolsEthereum,
    ),
    whitelistedTokens: getWhitelistedTokens(
      ApertureSupportedChainId.ETHEREUM_MAINNET_CHAIN_ID,
      whitelistedPoolsEthereum,
    ),
    maxGasCeiling: 0.5,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID]: {
    chain: arbitrum,
    uniswap_v3_factory: getAddress(
      '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    ),
    aperture_uniswap_v3_automan: getAddress(
      '0x00000000Ede6d8D217c60f93191C060747324bca',
    ),
    aperture_router_proxy: getAddress(
      '0x0000000095538AD2A95685330eD1268C69753BC2',
    ),
    optimal_swap_router: getAddress(
      '0x00000000063E0E1E06A0FE61e16bE8Bdec1BEA31',
    ),
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID,
      getAddress('0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    coingecko_asset_platform_id: 'arbitrum-one',
    infura_network_id: 'arbitrum',
    uniswap_subgraph_url:
      'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-one',
    whitelistedPools: getWhitelistedPools(
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID,
      whitelistedPoolsArbitrum,
    ),
    whitelistedTokens: getWhitelistedTokens(
      ApertureSupportedChainId.ARBITRUM_MAINNET_CHAIN_ID,
      whitelistedPoolsArbitrum,
    ),
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID]: {
    chain: polygon,
    uniswap_v3_factory: getAddress(
      '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    ),
    aperture_uniswap_v3_automan: getAddress(
      '0x0000000002F4Dd78bA85fE4B662983816c9Ae95F',
    ),
    aperture_router_proxy: getAddress(
      '0x0000000095538AD2A95685330eD1268C69753BC2',
    ),
    optimal_swap_router: getAddress(
      '0x00000000063E0E1E06A0FE61e16bE8Bdec1BEA31',
    ),
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.POLYGON_MAINNET_CHAIN_ID,
      getAddress('0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270'),
      18,
      'WMATIC',
      'Wrapped Matic',
    ),
    coingecko_asset_platform_id: 'polygon-pos',
    infura_network_id: 'matic',
    uniswap_subgraph_url:
      'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v3-polygon',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID]: {
    chain: optimism,
    uniswap_v3_factory: getAddress(
      '0x1F98431c8aD98523631AE4a59f267346ea31F984',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
    ),
    aperture_uniswap_v3_automan: getAddress(
      '0x0000000002F4Dd78bA85fE4B662983816c9Ae95F',
    ),
    aperture_router_proxy: getAddress(
      '0x0000000095538AD2A95685330eD1268C69753BC2',
    ),
    optimal_swap_router: getAddress(
      '0x00000000063E0E1E06A0FE61e16bE8Bdec1BEA31',
    ),
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.OPTIMISM_MAINNET_CHAIN_ID,
      getAddress('0x4200000000000000000000000000000000000006'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    coingecko_asset_platform_id: 'optimistic-ethereum',
    infura_network_id: 'optimism',
    uniswap_subgraph_url:
      'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.CELO_MAINNET_CHAIN_ID]: {
    chain: celo,
    uniswap_v3_factory: getAddress(
      '0xAfE208a311B21f13EF87E33A90049fC17A7acDEc',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0x3d79EdAaBC0EaB6F08ED885C05Fc0B014290D95A',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0x5615CDAb10dc425a742d643d949a7F474C01abc4',
    ),
    // Not yet deployed.
    aperture_uniswap_v3_automan: getAddress(
      '0x0000000002F4Dd78bA85fE4B662983816c9Ae95F',
    ),
    // CELO (aka cGLD or Celo Gold) is the native currency on the Celo mainnet, and accessible through the following ERC20 contract.
    // Both share the same view of account balances, i.e. if you transfer via the ERC20 contract, the native currency balance will be updated accordingly, and vice versa.
    // Therefore, this is not technically a wrapped token of the native currency, but rather, the native currency itself's ERC20 interface.
    // Uniswap NPM contracts sets WETH9 as the zero address. Aperture Automan contract should be updated to check for this, and skip wrapping/unwraping accordingly.
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.CELO_MAINNET_CHAIN_ID,
      getAddress('0x471EcE3750Da237f93B8E339c536989b8978a438'),
      18,
      'CELO',
      'Celo native asset',
    ),
    coingecko_asset_platform_id: 'celo',
    rpc_url: 'https://forno.celo.org',
    uniswap_subgraph_url:
      'https://api.thegraph.com/subgraphs/name/jesse-sawa/uniswap-celo',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID]: {
    chain: bsc,
    uniswap_v3_factory: getAddress(
      '0xdB1d10011AD0Ff90774D0C6Bb92e5C5c8b4461F7',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0x7b8A01B39D58278b5DE7e48c8449c9f4F5170613',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0xB971eF87ede563556b2ED4b1C0b0019111Dd85d2',
    ),
    aperture_uniswap_v3_automan: getAddress(
      '0x000000000580f20d53f6d2eC56d12A5Fa75Ac8cF',
    ),
    aperture_router_proxy: getAddress(
      '0x0000000095538AD2A95685330eD1268C69753BC2',
    ),
    optimal_swap_router: getAddress(
      '0xE0529B92EBdd478B36BC22434625d898ebE4b489',
    ),
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.BNB_MAINNET_CHAIN_ID,
      getAddress('0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'),
      18,
      'WBNB',
      'Wrapped BNB',
    ),
    coingecko_asset_platform_id: 'binance-smart-chain',
    rpc_url: 'https://bsc-dataseed.bnbchain.org',
    uniswap_subgraph_url:
      'https://api.thegraph.com/subgraphs/name/ilyamk/uniswap-v3---bnb-chain',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID]: {
    chain: base,
    uniswap_v3_factory: getAddress(
      '0x33128a8fC17869897dcE68Ed026d694621f6FDfD',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0x03a520b32C04BF3bEEf7BEb72E919cf822Ed34f1',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0x2626664c2603336E57B271c5C0b26F421741e481',
    ),
    aperture_uniswap_v3_automan: getAddress(
      '0x00000000EDb4489cB49FE07246f39345c9f838cD',
    ),
    aperture_router_proxy: getAddress(
      '0x7ECD9FDB80E1445Defd38170F05189B85084EA93',
    ),
    optimal_swap_router: getAddress(
      '0xCc06600868DdDab1073DEEC925E9D8c22fA8b889',
    ),
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.BASE_MAINNET_CHAIN_ID,
      getAddress('0x4200000000000000000000000000000000000006'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    coingecko_asset_platform_id: 'base',
    rpc_url: 'https://mainnet.base.org',
    uniswap_subgraph_url:
      'https://api.studio.thegraph.com/query/48211/uniswap-v3-base/version/latest',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID]: {
    chain: avalanche,
    uniswap_v3_factory: getAddress(
      '0x740b1c1de25031C31FF4fC9A62f554A55cdC1baD',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0x655C406EBFa14EE2006250925e54ec43AD184f8B',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0xbb00FF08d01D300023C629E8fFfFcb65A5a578cE',
    ),
    aperture_uniswap_v3_automan: getAddress(
      '0x00000000035daa51254bEc3dE4FC1Cd277b35705',
    ),
    aperture_router_proxy: getAddress(
      '0x0000000095538AD2A95685330eD1268C69753BC2',
    ),
    optimal_swap_router: getAddress(
      '0x039eC83141218fC68bd85E0067d696769E0576bf',
    ),
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.AVALANCHE_MAINNET_CHAIN_ID,
      getAddress('0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7'),
      18,
      'WAVAX',
      'Wrapped AVAX',
    ),
    coingecko_asset_platform_id: 'avalanche',
    rpc_url: 'https://api.avax.network/ext/bc/C/rpc',
    uniswap_subgraph_url:
      'https://api.thegraph.com/subgraphs/name/lynnshaoyu/uniswap-v3-avax',
    maxGasCeiling: 0.2,
    routingApiInfo: UNISWAP_OFFICIAL_ROUTING_API_INFO,
  },
  [ApertureSupportedChainId.MANTA_PACIFIC_MAINNET_CHAIN_ID]: {
    chain: {
      id: 169,
      name: 'Manta Pacific Mainnet',
      network: 'manta-mainnet',
      nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
      },
      rpcUrls: {
        public: {
          http: ['https://pacific-rpc.manta.network/http'],
          webSocket: ['wss://pacific-rpc.manta.network/ws'],
        },
        default: {
          http: ['https://pacific-rpc.manta.network/http'],
          webSocket: ['wss://pacific-rpc.manta.network/ws'],
        },
      },
      blockExplorers: {
        etherscan: {
          name: 'manta-mainnet',
          url: 'https://pacific-explorer.manta.network',
        },
        default: {
          name: 'manta-testnet',
          url: 'https://pacific-explorer.manta.network',
        },
      },
      contracts: {
        multicall3: {
          address: '0xf43727c9BEb4C0aA3fEE1281A902e518f8586E54',
          blockCreated: 41570,
        },
      },
    } as const satisfies Chain,
    uniswap_v3_factory: getAddress(
      '0x5bd1F6735B80e58aAC88B8A94836854d3068a13a',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0xe77e3F98a386a4C8f8c706A2aCfFdf57e70D06c6',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0x3488d5A2D0281f546e43435715C436b46Ec1C678',
    ),
    aperture_uniswap_v3_automan: getAddress(
      '0x0000000004276d0052eFdBA3E65a6f87fd55C5B7',
    ),
    aperture_router_proxy: getAddress(
      '0x0000000095538AD2A95685330eD1268C69753BC2',
    ),
    optimal_swap_router: getAddress(
      '0x000000000d44011EACAB39AB7965687d0bc2B16A',
    ),
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.MANTA_PACIFIC_MAINNET_CHAIN_ID,
      getAddress('0x0Dc808adcE2099A9F62AA87D9670745AbA741746'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    rpc_url: 'https://pacific-rpc.manta.network/http',
    maxGasCeiling: 0.2,
    uniswap_subgraph_url:
      'https://api.goldsky.com/api/public/project_clnz7akg41cv72ntv0uhyd3ai/subgraphs/aperture/uniswap-v3/gn',
    routingApiInfo: {
      type: 'ROUTING_API',
      url: 'https://manta-routing.aperture.finance/quote',
    },
  },
  [ApertureSupportedChainId.MANTA_PACIFIC_TESTNET_CHAIN_ID]: {
    chain: {
      id: 3441005,
      name: 'Manta Testnet L2 Rollup',
      network: 'manta-testnet',
      nativeCurrency: {
        decimals: 18,
        name: 'Ether',
        symbol: 'ETH',
      },
      rpcUrls: {
        public: {
          http: ['https://manta-testnet.calderachain.xyz/http'],
          webSocket: ['wss://manta-testnet.calderachain.xyz/ws'],
        },
        default: {
          http: ['https://manta-testnet.calderachain.xyz/http'],
          webSocket: ['wss://manta-testnet.calderachain.xyz/ws'],
        },
      },
      blockExplorers: {
        etherscan: {
          name: 'manta-testnet',
          url: 'https://pacific-explorer.manta.network',
        },
        default: {
          name: 'manta-testnet',
          url: 'https://pacific-explorer.manta.network',
        },
      },
      contracts: {
        multicall3: {
          address: '0x07dba6DE009f8B367D934d9b33B7ddca41ec8269',
          blockCreated: 550901,
        },
      },
      testnet: true,
    } as const satisfies Chain,
    uniswap_v3_factory: getAddress(
      '0x884402DfdEf9702dBA7fF8dDdF62AbD6afffb28b',
    ),
    uniswap_v3_nonfungible_position_manager: getAddress(
      '0x2dc114c0DEf2BC849996756E691FC6e8339649E1',
    ),
    uniswap_v3_swap_router_02: getAddress(
      '0x5bd1F6735B80e58aAC88B8A94836854d3068a13a',
    ),
    aperture_uniswap_v3_automan: getAddress(
      '0x00000000c04A561724F4Ea1181cA6E2E74E70FC1',
    ),
    aperture_router_proxy: getAddress(
      '0x0000000095538AD2A95685330eD1268C69753BC2',
    ),
    optimal_swap_router: getAddress(
      '0x000000002c1732dCF01E5C9E057d3fD2A7f1c238',
    ),
    wrappedNativeCurrency: new Token(
      ApertureSupportedChainId.MANTA_PACIFIC_TESTNET_CHAIN_ID,
      getAddress('0xdB1fE098232A00A8B81dd6c2A911f2486cb374EE'),
      18,
      'WETH',
      'Wrapped Ether',
    ),
    rpc_url: 'https://manta-testnet.calderachain.xyz/http',
    maxGasCeiling: 0.2,
    uniswap_subgraph_url:
      'https://d3lcl3uht06cq4.cloudfront.net/subgraphs/name/aperture/uniswap-v3',
    routingApiInfo: {
      type: 'ROUTING_API',
      url: 'https://manta-routing.aperture.finance/quote',
    },
  },
};

export function getChainInfo(chainId: ApertureSupportedChainId) {
  return CHAIN_ID_TO_INFO[chainId];
}
