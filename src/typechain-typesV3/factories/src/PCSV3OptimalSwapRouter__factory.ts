/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Signer,
  utils,
  Contract,
  ContractFactory,
  PayableOverrides,
} from "ethers";
import type { Provider, TransactionRequest } from "@ethersproject/providers";
import type {
  PCSV3OptimalSwapRouter,
  PCSV3OptimalSwapRouterInterface,
} from "../../src/PCSV3OptimalSwapRouter";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract IPCSV3NonfungiblePositionManager",
        name: "npm",
        type: "address",
      },
    ],
    stateMutability: "payable",
    type: "constructor",
  },
  {
    inputs: [],
    name: "Invalid_Tick_Range",
    type: "error",
  },
  {
    inputs: [],
    name: "MismatchETH",
    type: "error",
  },
  {
    inputs: [],
    name: "NotWETH9",
    type: "error",
  },
  {
    stateMutability: "nonpayable",
    type: "fallback",
  },
  {
    inputs: [],
    name: "WETH9",
    outputs: [
      {
        internalType: "address payable",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deployer",
    outputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "npm",
    outputs: [
      {
        internalType: "contract ICommonNonfungiblePositionManager",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "int256",
        name: "amount0Delta",
        type: "int256",
      },
      {
        internalType: "int256",
        name: "amount1Delta",
        type: "int256",
      },
      {
        internalType: "bytes",
        name: "data",
        type: "bytes",
      },
    ],
    name: "pancakeV3SwapCallback",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    stateMutability: "payable",
    type: "receive",
  },
] as const;

const _bytecode =
  "0x60e08060405260208161213b803803809161001a828561013e565b83398101031261013957516001600160a01b038116908190036101395760808190526040516312a9293f60e21b8152602081600481855afa9182156101105760049260209260009161011c575b506001600160a01b031660a052604051631abe729160e31b815292839182905afa908115610110576000916100e1575b5060c052604051611fa4908161019782396080518161051d015260a0518181816103d80152818161058c01526106fa015260c05181818161019e015281816104ae01526106490152f35b610103915060203d602011610109575b6100fb818361013e565b810190610177565b38610097565b503d6100f1565b6040513d6000823e3d90fd5b6101339150833d8511610109576100fb818361013e565b38610067565b600080fd5b601f909101601f19168101906001600160401b0382119082101761016157604052565b634e487b7160e01b600052604160045260246000fd5b9081602091031261013957516001600160a01b0381168103610139579056fe60a080604052600436101561042a575b5036156103c157346103bc5760003560601c60143560601c9060313560f81c9060323560601c7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa63601838584180285189061008b6100833373ffffffffffffffffffffffffffffffffffffffff8516610806565b303385610842565b826014527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff6034526f095ea7b3000000000000000000000000600052602060006044601082865af13d156001600051141716156103ae57600080918160345260405181605a82378260463560601c5af11561035f576044601060008093602095601452816034526f095ea7b300000000000000000000000082525af13d156001600051141716156103ae5760006034526101453082610806565b61014f3085610806565b90604051906060820182811067ffffffffffffffff82111761037f5760405283825285602083015260283560e81c60408301526040519474ff00000000000000000000000000000000000000007f000000000000000000000000000000000000000000000000000000000000000017600052606083206020527f6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e260405273ffffffffffffffffffffffffffffffffffffffff6055600b20169560405260001461036957610236816102203389610806565b8501905b602e3560e81d602b3560e81d8961089b565b50506080519560009382610285575b50506000039485831802809218019318019180610273575b50508061026657005b61027191339061153f565b005b61027e91339061153f565b388061025d565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe09194500192604060008551926060875282517f128acb080000000000000000000000000000000000000000000000000000000081523060048201528a60248201528560448201528a73fffd8963efd1fc6a506488495d951d53639afb810273fffd8963efd1fc6a506488495d951d5263988d2518606482015260a060848201528260c489516020810160a48501818d60045afa5001925af160403d14161561035f57600051878160205118021860000393523880610245565b3d6000803e3d6000fd5b6102366103763386610806565b82018490610224565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b633e3f8f736000526004601cfd5b600080fd5b73ffffffffffffffffffffffffffffffffffffffff7f000000000000000000000000000000000000000000000000000000000000000016330361040057005b7f2f1ca35a0000000000000000000000000000000000000000000000000000000060005260046000fd5b60003560e01c90816323a69e75146105b0575080634aa4a4fc146105415780637f1e9ef6146104d25763d5f3948814610463573861000f565b346103bc5760007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126103bc57602060405173ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000168152f35b346103bc5760007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126103bc57602060405173ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000168152f35b346103bc5760007ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126103bc57602060405173ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000168152f35b346103bc5760607ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126103bc576004356044359167ffffffffffffffff83116103bc57366023840112156103bc5782600401359267ffffffffffffffff84116103bc57602481019360243691830101116103bc57606084600037606060002074ff00000000000000000000000000000000000000007f0000000000000000000000000000000000000000000000000000000000000000176000526020527f6ce8eb472fa82df5469c6ab6d485f17c3ad13c8cd7af59b3d4a8026c5ce0f7e260405273ffffffffffffffffffffffffffffffffffffffff6055600b2016916040528133036103bc5760008313156106cf5750610271923090356106e0565b610271935060243592503090604401355b92919073ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000168073ffffffffffffffffffffffffffffffffffffffff861614806107fd575b610771575b5073ffffffffffffffffffffffffffffffffffffffff8116300361076857506107669261153f565b565b61076693610842565b3484036107d35760006004818681947fd0e30db00000000000000000000000000000000000000000000000000000000083525af1156103bc573073ffffffffffffffffffffffffffffffffffffffff8316146107cd573861073e565b50505050565b7fa11a990f0000000000000000000000000000000000000000000000000000000060005260046000fd5b50341515610739565b6024600080926020947f70a082310000000000000000000000000000000000000000000000000000000083526004525afa156103bc5760005190565b601c600060649281946020966040519860605260405260601b602c526f23b872dd000000000000000000000000600c525af13d1560016000511417161561088d576000606052604052565b637939f4246000526004601cfd5b600060808190529594919391821580611537575b611520578360020b8560020b90808212918215926114f6575b5081156114e9575b506114bf57813b156114b157604051610120810181811067ffffffffffffffff82111761037f576040526000815260006020820152600060408201526000606082015260006080820152600060a0820152600060c0820152600060e082015260006101008201527f3850c7bd0000000000000000000000000000000000000000000000000000000060005260406000600481865afa156103bc576000519260205196849760408401527f1a6865020000000000000000000000000000000000000000000000000000000060005260206000600481855afa156103bc57600051907fddca3f430000000000000000000000000000000000000000000000000000000060005260206000600481865afa156103bc5762ffffff60005116907fd0c93a7c0000000000000000000000000000000000000000000000000000000060005260206000600481875afa156103bc57610a5592610a4f9260005191875288602088015289606088015287608088015260e087015261010086015261158a565b9661158a565b938660a08401528460c0840152610ab173ffffffffffffffffffffffffffffffffffffffff861673ffffffffffffffffffffffffffffffffffffffff891673ffffffffffffffffffffffffffffffffffffffff8416878a6118e4565b608052507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8000906000905b600084604081015160020b9461010082015160020b946080516000146113d55783868807128688050360081d9160010b8260010b146000146113c5575b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff600260ff8399898881830712910503161b01165b8015611387577f07060605060205040602030205040301060502050303040105050304000000006f8421084210842108cc6318c6db6d54be826fffffffffffffffffffffffffffffffff1060071b83811c67ffffffffffffffff1060061b1783811c63ffffffff1060051b1783811c61ffff1060041b1783811c60ff1060031b1792831c1c601f161a17955b948196610bec82828560081b010261158a565b946080511560001461132b57610c3c73ffffffffffffffffffffffffffffffffffffffff6020870151166fffffffffffffffffffffffffffffffff8751166080880151908960e08a015193611b45565b92919690969260608201510196608082015103975b73ffffffffffffffffffffffffffffffffffffffff8085169116810361131a57610c8c9060a083015160c06080511515940151918b8b6118e4565b1515146112a257505050505050505050505b80519260208201519260608301519660808401519260805115600014610fd8575073ffffffffffffffffffffffffffffffffffffffff811673ffffffffffffffffffffffffffffffffffffffff861610610ede575b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff85161015610d3b575b50505090610d359185611a54565b91030191565b9196509291975085519286602081015160c08201519560e08301519081620f424003908060601b84810460608701510190610d7a60a088015183611f0a565b9a610d93610d8d8689620f424002611a93565b85611f0a565b95610daa60a060808b01519889019a015186611f0a565b890396871115610ed057610d359c86610e7996610dca85610ec39d611da2565b930204900303940290620f42400204900360011b9260011b8302828002018070ffffffffffffffffffffffffffffffffff1060071b81811c68ffffffffffffffffff1060061b1781811c64ffffffffff1060051b1781811c62ffffff1060041b1760b56201000083831c019160011c1b0260121c8082040160011c8082040160011c8082040160011c8082040160011c8082040160011c8082040160011c8082040160011c8080920410900390565b0160601b058181119082180218978a89038060ff1d908101189060016c0100000000000000000000000060e0610eaf858a611f0a565b930151620f42400393880915151601611cf3565b9103019690913880610d27565b63202368086000526004601cfd5b999750610efe610ef760e0850151620f42400384611c61565b8686611acc565b9773ffffffffffffffffffffffffffffffffffffffff8b1673ffffffffffffffffffffffffffffffffffffffff8a1610600014610f55575073ffffffffffffffffffffffffffffffffffffffff819a5b9050610cf3565b9993918585610fa792610f9f82879c969c038060ff1d90810118610f798186611f0a565b60016c0100000000000000000000000060e08c0151620f42400393880915151601611cf3565b900394611a54565b019573ffffffffffffffffffffffffffffffffffffffff848181166020860152886060860152836080860152610f4e565b905073ffffffffffffffffffffffffffffffffffffffff819893989792971673ffffffffffffffffffffffffffffffffffffffff8616116111d5575b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff85161115611060575b50505090610d359185038060ff1d9081011890611f0a565b9196509291975085519260208701519360c08801519460e08901519182620f4240039260608b0151908260601b908985870283620f4240020484019204820392831115610ed05784868e956110fb610d359d6110f36110ed6111c89c60a08c60806110dc6110d561119f9e8585015190611f0a565b9b8a611f0a565b910151019c0151620f424002611a93565b84611f0a565b890398611da2565b93020401039160011b9260011b8302828002018070ffffffffffffffffffffffffffffffffff1060071b81811c68ffffffffffffffffff1060061b1781811c64ffffffffff1060051b1781811c62ffffff1060041b1760b56201000083831c019160011c1b0260121c8082040160011c8082040160011c8082040160011c8082040160011c8082040160011c8082040160011c8082040160011c8080920410900390565b0160601b0481811090821802189760e06111ba868d8c611a06565b910151620f42400390611cf3565b9103019690913880611048565b9997506111f56111ee60e0850151620f42400384611c61565b868661196c565b9773ffffffffffffffffffffffffffffffffffffffff8b8116908a1610611236575073ffffffffffffffffffffffffffffffffffffffff819a5b9050611014565b9993916112719061125e61124e8886899c969c611a06565b60e0870151620f42400390611cf3565b90039285038060ff1d9081011886611f0a565b019573ffffffffffffffffffffffffffffffffffffffff84818116602086015283606086015288608086015261122f565b7ff30dba9300000000000000000000000000000000000000000000000000000000815283838660081b010260020b6004526040816024818b5afa156113175760205190608051900318608051018a51018a5260208a01526080519260081b010203604087015260608601526080850152610adb565b80fd5b505050505050505050505050610c9e565b9361137073ffffffffffffffffffffffffffffffffffffffff6020830151166fffffffffffffffffffffffffffffffff8351166060840151908960e086015193611b45565b969192906060820151039660808201510197610c51565b50919450507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0160010b6113bb8183611f58565b9390859085610b4d565b506113d08185611f58565b610b18565b60018487890712878905030160020b60081d9160010b8260010b146000146114a1575b60018082988887818307129105030160ff161b8403165b801561148157808403167e1f0d1e100c1d070f090b19131c1706010e11080a1a141802121b1503160405601f826fffffffffffffffffffffffffffffffff1060071b83811c67ffffffffffffffff1060061b1783811c63ffffffff1060051b1792831c63d76453e004161a1795610bd9565b50905060019194500160010b6114978183611f58565b939085908561140f565b506114ac8185611f58565b6113f8565b6301ac05a56000526004601cfd5b7f30673a1b0000000000000000000000000000000000000000000000000000000060005260046000fd5b620d89e8915013386108d0565b7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff27618139150386108c8565b505050505090506000906000906000608052600090565b5080156108af565b6010600060449260209582956014526034526fa9059cbb00000000000000000000000082525af13d1560016000511417161561157c576000603452565b6390b8ec186000526004601cfd5b8060ff1d81810118620d89e881116118cc5763ffffffff91600182167001fffcb933bd6fad37aa2d162d1a594001027001000000000000000000000000000000001891600281166118b0575b60048116611894575b60088116611878575b6010811661185c575b60208116611840575b60408116611824575b60808116611808575b61010081166117ec575b61020081166117d0575b61040081166117b4575b6108008116611798575b611000811661177c575b6120008116611760575b6140008116611744575b6180008116611728575b62010000811661170c575b6202000081166116f1575b6204000081166116d6575b62080000166116bd575b600012611696575b0160201c90565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0461168f565b6b048a170391f7dc42444e8fa290910260801c90611687565b6d2216e584f5fa1ea926041bedfe9890920260801c9161167d565b916e5d6af8dedb81196699c329225ee6040260801c91611672565b916f09aa508b5b7a84e1c677de54f3e99bc90260801c91611667565b916f31be135f97d08fd981231505542fcfa60260801c9161165c565b916f70d869a156d2a1b890bb3df62baf32f70260801c91611652565b916fa9f746462d870fdf8a65dc1f90e061e50260801c91611648565b916fd097f3bdfd2022b8845ad8f792aa58250260801c9161163e565b916fe7159475a2c29b7443b29c7fa6e889d90260801c91611634565b916ff3392b0822b70005940c7a398e4b70f30260801c9161162a565b916ff987a7253ac413176f2b074cf7815e540260801c91611620565b916ffcbe86c7900a88aedcffc83b479aa3a40260801c91611616565b916ffe5dee046a99a2a811c461f1969c30530260801c9161160c565b916fff2ea16466c96a3843ec78b326b528610260801c91611603565b916fff973b41fa98c081472e6896dfb254c00260801c916115fa565b916fffcb9843d60f6159c9db58835c9266440260801c916115f1565b916fffe5caca7e10e4e61c3624eaa0941cd00260801c916115e8565b916ffff2e50f5f656932ef12357cf3c7fdcc0260801c916115df565b916ffff97272373d413259a46990580e213a0260801c916115d6565b6308c379a0600052602080526101546041526045601cfd5b9193918385116118f8575050505050600090565b828510611909575050505050600190565b61192c9361191a8661192393611f0a565b90860390611f0a565b93820390611e63565b1090565b9190820180921161193d57565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b91908115611a015760601b9180820281838204146119b4575b5082916119a89173ffffffffffffffffffffffffffffffffffffffff9404611930565b80820615159104011690565b83018381106119855791506119ca828285611e63565b92096119ea575b73ffffffffffffffffffffffffffffffffffffffff1690565b600101806119d1575b63ae47f7026000526004601cfd5b505090565b918282108284180280808518931893146103bc5760019060601b92828103611a4573ffffffffffffffffffffffffffffffffffffffff83168287611e63565b94098284061715151691040190565b818118818310028082189392811891146103bc57611a8f918373ffffffffffffffffffffffffffffffffffffffff831692039060601b611e63565b0490565b8115611a9d570490565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b9073ffffffffffffffffffffffffffffffffffffffff90611aff938060a01c15600014611b355760601b04915b16611930565b740100000000000000000000000000000000000000008110156103bc5773ffffffffffffffffffffffffffffffffffffffff1690565b90611b3f91611da2565b91611af9565b919094929473ffffffffffffffffffffffffffffffffffffffff811673ffffffffffffffffffffffffffffffffffffffff8416101594620f42400390611b8b8288611c61565b8615611c2f57611b9c848684611a06565b975b888210611bf8575050958691620f4240611bb88284611cf3565b9209611be6575b945b15611bdd5791611bda92038060ff1d9081011890611f0a565b90565b611bda92611a54565b600191500180156119f3578590611bbf565b96975091505082158215176103bc578515611c1f57611c1890828461196c565b8095611bc1565b611c2a908284611acc565b611c18565b8185038060ff1d9081011860016c01000000000000000000000000611c548388611f0a565b9287091515160197611b9e565b81810291620f424081838504148315170215611c82575050620f4240900490565b807fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff620f42409284098481108501900392099080620f424011156119f357828211900360fa1b910360061c177fde8f6cefed634549b62c77574f722e1ac57e23f24d8fd5cb790fb65668c261390290565b90620f424082029181620f4240828504148215170215611d135750900490565b81620f42407fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8184098581108601900392099082600003831692818111156119f357839004806003026002188082026002030280820260020302808202600203028082026002030280820260020302809102600203029360018484830304948060000304019211900302170290565b908160601b91816c01000000000000000000000000828504148215170215611dca5750900490565b816c010000000000000000000000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8184098581108601900392099082600003831692818111156119f357839004806003026002188082026002030280820260020302808202600203028082026002030280820260020302809102600203029360018484830304948060000304019211900302170290565b81810292918115828504821417830215611e7e575050900490565b807fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff849284098581108601900392099082600003831692818111156119f357839004806003026002188082026002030280820260020302808202600203028082026002030280820260020302809102600203029360018484830304948060000304019211900302170290565b818102917fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff910981811082019003806c0100000000000000000000000011156119f35760a01b9060601c1790565b6024600080926020947f5339c29600000000000000000000000000000000000000000000000000000000835260010b6004525afa156103bc576000519056fea164736f6c634300081a000a";

type PCSV3OptimalSwapRouterConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: PCSV3OptimalSwapRouterConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class PCSV3OptimalSwapRouter__factory extends ContractFactory {
  constructor(...args: PCSV3OptimalSwapRouterConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    npm: string,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<PCSV3OptimalSwapRouter> {
    return super.deploy(
      npm,
      overrides || {}
    ) as Promise<PCSV3OptimalSwapRouter>;
  }
  override getDeployTransaction(
    npm: string,
    overrides?: PayableOverrides & { from?: string }
  ): TransactionRequest {
    return super.getDeployTransaction(npm, overrides || {});
  }
  override attach(address: string): PCSV3OptimalSwapRouter {
    return super.attach(address) as PCSV3OptimalSwapRouter;
  }
  override connect(signer: Signer): PCSV3OptimalSwapRouter__factory {
    return super.connect(signer) as PCSV3OptimalSwapRouter__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): PCSV3OptimalSwapRouterInterface {
    return new utils.Interface(_abi) as PCSV3OptimalSwapRouterInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): PCSV3OptimalSwapRouter {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as PCSV3OptimalSwapRouter;
  }
}
