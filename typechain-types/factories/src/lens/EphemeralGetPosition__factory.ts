/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Signer,
  utils,
  Contract,
  ContractFactory,
  PayableOverrides,
  BigNumberish,
} from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  EphemeralGetPosition,
  EphemeralGetPositionInterface,
} from "../../../src/lens/EphemeralGetPosition";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract INonfungiblePositionManager",
        name: "npm",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    stateMutability: "payable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "contract INonfungiblePositionManager",
        name: "npm",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "tokenId",
        type: "uint256",
      },
    ],
    name: "getPosition",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "tokenId",
            type: "uint256",
          },
          {
            internalType: "address",
            name: "owner",
            type: "address",
          },
          {
            components: [
              {
                internalType: "uint96",
                name: "nonce",
                type: "uint96",
              },
              {
                internalType: "address",
                name: "operator",
                type: "address",
              },
              {
                internalType: "address",
                name: "token0",
                type: "address",
              },
              {
                internalType: "address",
                name: "token1",
                type: "address",
              },
              {
                internalType: "uint24",
                name: "fee",
                type: "uint24",
              },
              {
                internalType: "int24",
                name: "tickLower",
                type: "int24",
              },
              {
                internalType: "int24",
                name: "tickUpper",
                type: "int24",
              },
              {
                internalType: "uint128",
                name: "liquidity",
                type: "uint128",
              },
              {
                internalType: "uint256",
                name: "feeGrowthInside0LastX128",
                type: "uint256",
              },
              {
                internalType: "uint256",
                name: "feeGrowthInside1LastX128",
                type: "uint256",
              },
              {
                internalType: "uint128",
                name: "tokensOwed0",
                type: "uint128",
              },
              {
                internalType: "uint128",
                name: "tokensOwed1",
                type: "uint128",
              },
            ],
            internalType: "struct PositionFull",
            name: "position",
            type: "tuple",
          },
          {
            components: [
              {
                internalType: "uint160",
                name: "sqrtPriceX96",
                type: "uint160",
              },
              {
                internalType: "int24",
                name: "tick",
                type: "int24",
              },
              {
                internalType: "uint16",
                name: "observationIndex",
                type: "uint16",
              },
              {
                internalType: "uint16",
                name: "observationCardinality",
                type: "uint16",
              },
              {
                internalType: "uint16",
                name: "observationCardinalityNext",
                type: "uint16",
              },
              {
                internalType: "uint8",
                name: "feeProtocol",
                type: "uint8",
              },
              {
                internalType: "bool",
                name: "unlocked",
                type: "bool",
              },
            ],
            internalType: "struct Slot0",
            name: "slot0",
            type: "tuple",
          },
          {
            internalType: "uint128",
            name: "activeLiquidity",
            type: "uint128",
          },
          {
            internalType: "uint8",
            name: "decimals0",
            type: "uint8",
          },
          {
            internalType: "uint8",
            name: "decimals1",
            type: "uint8",
          },
        ],
        internalType: "struct PositionState",
        name: "state",
        type: "tuple",
      },
    ],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x6080601f6200071238819003918201601f19168301916001600160401b0383118484101762000472578084926040948552833981010312620005f7578051906001600160a01b0382168203620005f75760200151906040519162000063836200060a565b6000808452602084015260405161018081016001600160401b0381118282101762000472576040526000815260006020820152600060408201526000606082015260006080820152600060a0820152600060c0820152600060e082015260006101008201526000610120820152600061014082015260006101608201526040840152604051620000f3816200060a565b6000815260006020820152600060408201526000606082015260006080820152600060a0820152600060c0820152606084015260006080840152600060a0840152600060c08401526331a9108f60e11b6000528060045260206000602481855afa156200060057600080516001600160a01b03166020850152818452604084015163133f757160e31b8252600492909252610180908290602490855afa15620005fc5750600060048160209363c45a015560e01b82525afa15620005f757600080516040838101518082015160608083015160809093015184516001600160a01b039384168852938316602090815262ffffff909116855290862060ff60a01b90951786529384527fe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b5483526055600b2091909252630d34328160e11b84521691600481845afa15620005f757600080516001600160801b031660808401526060830151633850c7bd60e01b825260e091600490845afa15620005f757604082015160e08101519091906001600160801b031662000488575b5050604081810151015160ff90620002ac906001600160a01b0316620006f2565b1660a082015260408101516060015160ff90620002d2906001600160a01b0316620006f2565b1660c082015260ff60c0604051928051602085015260018060a01b036020820151166040850152604081015160018060601b03815116606086015260018060a01b03602082015116608086015260018060a01b0360408201511660a086015260018060a01b036060820151168386015262ffffff60808201511660e086015260a081015160020b6101008601528281015160020b61012086015260018060801b0360e08201511661014086015261010081015161016086015261012081015161018086015260018060801b03610140820151166101a086015261016060018060801b03910151166101c085015281606082015160018060a01b038151166101e0870152602081015160020b61020087015261ffff80604083015116610220880152806060830151166102408801526080820151166102608701528460a082015116610280870152015115156102a085015260018060801b036080820151166102c08501528260a0820151166102e085015201511661030090818301528152610320810181811060018060401b038211176200047257604052602081519101f35b634e487b7160e01b600052604160045260246000fd5b60c060a083015160020b92015160020b9060206060850151015160020b91620004b2848362000626565b92620004bf828462000626565b948112156200056f57505050906101609060608060408501516040840151900394015191015190035b604084015161010081015160e082018051929590936200054e9390926001600160801b03926200051d9284169190036200069c565b61014087018051919092166001600160801b039182160181169091526101208601519351909390841691036200069c565b929091018051919092166001600160801b039182160116905238806200028b565b12620005975750610160906060806040850151604084015190039401519101519003620004e8565b9163f305839960e01b60005260206000600481865afa15620005f757602060006004818051604087015190036040860151900396634614131960e01b82525afa15620005f7576060610160928160005191015190039101519003620004e8565b600080fd5b3d90fd5b3d6000803e3d6000fd5b60e081019081106001600160401b038211176200047257604052565b604051919291610100908181016001600160401b0381118282101762000472576040526024600080948184528160208501528160408501528160608501528160808501528160a08501528160c08501528160e0850152839763f30dba9360e01b835260020b6004525afa15620006995750565b80fd5b6000828202926000198184099284841085018085039414620006e857600160801b9284841115620006db5750096080918382119003821b9203901c1790565b63ae47f70290526004601cfd5b5050505060801c90565b60206004818093601260005263313ce56760e01b82525afa60051b519056fe";

type EphemeralGetPositionConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: EphemeralGetPositionConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class EphemeralGetPosition__factory extends ContractFactory {
  constructor(...args: EphemeralGetPositionConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    npm: string,
    tokenId: BigNumberish,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<EphemeralGetPosition> {
    return super.deploy(
      npm,
      tokenId,
      overrides || {}
    ) as Promise<EphemeralGetPosition>;
  }
  override getDeployTransaction(
    npm: string,
    tokenId: BigNumberish,
    overrides?: PayableOverrides & { from?: string }
  ): TransactionRequest {
    return super.getDeployTransaction(npm, tokenId, overrides || {});
  }
  override attach(address: string): EphemeralGetPosition {
    return super.attach(address) as EphemeralGetPosition;
  }
  override connect(signer: Signer): EphemeralGetPosition__factory {
    return super.connect(signer) as EphemeralGetPosition__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): EphemeralGetPositionInterface {
    return new utils.Interface(_abi) as EphemeralGetPositionInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): EphemeralGetPosition {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as EphemeralGetPosition;
  }
}
