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
  UniV3OptimalSwapRouter,
  UniV3OptimalSwapRouterInterface,
} from "../../src/UniV3OptimalSwapRouter";

const _abi = [
  {
    inputs: [
      {
        internalType: "contract INonfungiblePositionManager",
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
    name: "factory",
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
        internalType: "contract INonfungiblePositionManager",
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
    name: "uniswapV3SwapCallback",
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
  "0x60e060409080825280620021b980380380916200001d828562000155565b83396020928391810103126200015057516001600160a01b039081811690818103620001505760805283516312a9293f60e21b8152908382600481845afa9283156200014557600493859360009162000123575b501660a052845163c45a015560e01b815292839182905afa9182156200011857600092620000e4575b505060c052516120089081620001b1823960805181610634015260a0518181816103bd015281816106a201526106e1015260c05181818161018a015281816104d101526105c10152f35b620001089250803d1062000110575b620000ff818362000155565b8101906200018f565b38806200009a565b503d620000f3565b83513d6000823e3d90fd5b6200013e9150843d86116200011057620000ff818362000155565b3862000071565b85513d6000823e3d90fd5b600080fd5b601f909101601f19168101906001600160401b038211908210176200017957604052565b634e487b7160e01b600052604160045260246000fd5b908160209103126200015057516001600160a01b038116810362000150579056fe60a060408181526004918236101561040b575b5036156103a657346103a157601435606090811c9260008035831c92367fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffa6019260313560f81c9273ffffffffffffffffffffffffffffffffffffffff9188871885028918603235851c61009261008a338785166107b9565b3033856107f6565b806014527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff6034526f095ea7b30000000000000000000000009081855260209889866044601082885af13d15600188511417161561039557858091816034528d5181605a8237826046358c1c5af11561038c576010858a9481946044946014528260345282525af13d156001845114171615610381578160345261013630886107b9565b93610141308b6107b9565b9689519682880188811067ffffffffffffffff821117610355578b528988528b8289015260283560e81c8b8901528a519574ff00000000000000000000000000000000000000007f000000000000000000000000000000000000000000000000000000000000000017865283892083527fe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b548c526055600b2016958b5260001461033f57610208866101f2338e6107b9565b8a01905b602e3560e81d602b3560e81d8961084f565b50809c9297915086998861025a575b50505050505050039485831802809218019318019180610248575b50508061023b57005b6102469133906114fe565b005b6102539133906114fe565b3880610232565b839495969a50908760c47fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0829594019c8d998a519a528651937f128acb0800000000000000000000000000000000000000000000000000000000855230828601528060248601528c604486015273fffd8963efd1fc6a506488495d951d53639afb810273fffd8963efd1fc6a506488495d951d5263988d2518606485015260a060848501528d8051918a8301809260a48801925afa5001925af1903d141615610336578883518092511802188203945238808080808b81610217565b823d81803e3d90fd5b61020861034c338b6107b9565b870189906101f6565b6024866041877f4e487b7100000000000000000000000000000000000000000000000000000000835252fd5b633e3f8f738252601cfd5b843d81803e3d90fd5b84633e3f8f738752601cfd5b600080fd5b73ffffffffffffffffffffffffffffffffffffffff7f00000000000000000000000000000000000000000000000000000000000000001633036103e557005b517f2f1ca35a000000000000000000000000000000000000000000000000000000008152fd5b600090813560e01c9081634aa4a4fc14610658575080637f1e9ef6146105e9578063c45a0155146105765763fa461e3303610012579190346105725760607ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126105725781359060443567ffffffffffffffff9384821161056e573660238301121561056e5781013593841161056a576024810193602436918301011161056a57815160608587376060862074ff00000000000000000000000000000000000000007f00000000000000000000000000000000000000000000000000000000000000001787526020527fe34f199b19b2b4f47f68442619d555527d244f78a3297ea89325f843f87b8b54835273ffffffffffffffffffffffffffffffffffffffff6055600b2016925281330361056a57848313156105555750610552923090356106c6565b80f35b610552935060243592503090604401356106c6565b8480fd5b8580fd5b8280fd5b5090346105e557817ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126105e5576020905173ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000168152f35b5080fd5b5090346105e557817ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126105e5576020905173ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000168152f35b9050346105e557817ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126105e55760209073ffffffffffffffffffffffffffffffffffffffff7f0000000000000000000000000000000000000000000000000000000000000000168152f35b92919073ffffffffffffffffffffffffffffffffffffffff807f0000000000000000000000000000000000000000000000000000000000000000168082871614806107b0575b61072f575b50811630036107265750610724926114fe565b565b610724936107f6565b348503610786578460049160009283809381937fd0e30db00000000000000000000000000000000000000000000000000000000083525af1156107835750308184161461077c5738610711565b5050505050565b80fd5b60046040517fa11a990f000000000000000000000000000000000000000000000000000000008152fd5b5034151561070c565b9060209060246000809481937f70a082310000000000000000000000000000000000000000000000000000000083526004525afa15610783575190565b601c600060649281946020966040519860605260405260601b602c526f23b872dd000000000000000000000000600c525af13d15600160005114171615610841576000606052604052565b637939f4246000526004601cfd5b929493949190916000958115806114f6575b6114e1578260020b8460020b90808212918215926114b7575b5081156114aa575b5061148057843b1561147257604051610120810181811067ffffffffffffffff821117611443576040526000815260006020820152600060408201526000606082015260006080820152600060a0820152600060c0820152600060e082015260006101008201527f3850c7bd0000000000000000000000000000000000000000000000000000000060005260406000600481895afa156103a1576000519560205195879660408401527f1a6865020000000000000000000000000000000000000000000000000000000060005260206000600481855afa156103a157600051907fddca3f430000000000000000000000000000000000000000000000000000000060005260206000600481865afa156103a15762ffffff60005116907fd0c93a7c0000000000000000000000000000000000000000000000000000000060005260206000600481875afa156103a157610a0792610a01926000519187528b602088015288606088015287608088015260e0870152610100860152611547565b95611547565b908560a08401528160c0840152610a6373ffffffffffffffffffffffffffffffffffffffff831673ffffffffffffffffffffffffffffffffffffffff881673ffffffffffffffffffffffffffffffffffffffff8b1687896118aa565b97507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff80009060005b604085015160020b928a8661010081015160020b9382600014611343576000858807128588050360081d93600185810b91900b03611327575b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff60018060ff849a8960008183071291050316011b01165b80156112ea577f07060605060205040602030205040301060502050303040105050304000000006f8421084210842108cc6318c6db6d54be826fffffffffffffffffffffffffffffffff1060071b83811c67ffffffffffffffff1060061b1783811c63ffffffff1060051b1783811c61ffff1060041b1783811c60ff1060031b1792831c1c601f161a17955b938396610b9a82828760081b0102611547565b948461128d57610be473ffffffffffffffffffffffffffffffffffffffff6020860151166fffffffffffffffffffffffffffffffff8651166080870151908960e089015193611c04565b95919690969560608301510196608083015103975b73ffffffffffffffffffffffffffffffffffffffff8088169116810361127c57610c329160c060a0850151911515940151918a8a6118aa565b15151461120b575050505050505050505b600060805281519260208301516080526060830151956080840151928915600014610f57575073ffffffffffffffffffffffffffffffffffffffff811673ffffffffffffffffffffffffffffffffffffffff6080511610610e76575b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff608051161015610ceb575b505050610ce59060805185611a53565b91030192565b91955091975084519185602081015160a082015160c08301519060e084015190838860601b04606086015101610d218282611f6d565b98610d4e6080610d44610d3e87620f4240038a620f424002611b5a565b84611f6d565b9801519382611f6d565b878401039483861115610e6857610ce59a610d778f95610e5c9a60c0610e319801519101611e39565b9086620f4240038488020490030394620f424003029060601b620f42400204900360011b9260011b8302828002018070ffffffffffffffffffffffffffffffffff1060071b81811c68ffffffffffffffffff1060061b1781811c64ffffffffff1060051b1781811c62ffffff1060041b1760019060b56201000084831c0191831c1b0260121c80830401811c80830401811c80830401811c80830401811c80830401811c80830401811c80830401901c8080920410900390565b0160601b0581811190821802189660e0610e4e8c6080518b611afc565b910151620f42400390611d79565b91030196903880610cd5565b63202368086000526004601cfd5b999650610e98610e8f60e0850151620f42400384611cde565b85608051611b93565b9673ffffffffffffffffffffffffffffffffffffffff8b1673ffffffffffffffffffffffffffffffffffffffff891610600014610eef575073ffffffffffffffffffffffffffffffffffffffff819a5b9050610c9f565b99959173ffffffffffffffffffffffffffffffffffffffff90610f28610f18878a608051611afc565b60e0870151620f42400390611d79565b900392610f388689608051611a53565b0196806080528181166020860152876060860152836080860152610ee8565b905073ffffffffffffffffffffffffffffffffffffffff819793979692961673ffffffffffffffffffffffffffffffffffffffff6080511611611150575b73ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff608051161115610fdb575b505050610ce59060805185611ab4565b91955091975084519160208601519260a08701519360c08801519460e08901519586620f4240039660608b0151978560601b9880848b048784028c620f424002048201031115610e68578986611127948f856111449b610ce59f8a611073610d3e858f611057908d61107b978d850290620f4240020401611f6d565b9760806110648c89611f6d565b910151019f620f424002611b5a565b8d039c611e39565b9302040103958204930290620f42400204010360011b9260011b8302828002018070ffffffffffffffffffffffffffffffffff1060071b81811c68ffffffffffffffffff1060061b1781811c64ffffffffff1060051b1781811c62ffffff1060041b1760019060b56201000084831c0191831c1b0260121c80830401811c80830401811c80830401811c80830401811c80830401811c80830401811c80830401901c8080920410900390565b0160601b0481811090821802189660e0610e4e8c6080518b6119e3565b91030196903880610fcb565b99965061117261116960e0850151620f42400384611cde565b85608051611932565b9673ffffffffffffffffffffffffffffffffffffffff8b8116908916106111b3575073ffffffffffffffffffffffffffffffffffffffff819a5b9050610f95565b99959173ffffffffffffffffffffffffffffffffffffffff906111dc610f18876080518b6119e3565b9003926111ec866080518a611ab4565b01968060805281811660208601528360608601528760808601526111ac565b7ff30dba930000000000000000000000000000000000000000000000000000000060005282828260081b010260020b600452604060006024818b5afa156103a1578f93602051856000031885018c51018c5260208c015260081b010203604088015260608701526080860152610a8a565b505050505050505050505050610c43565b6112d373ffffffffffffffffffffffffffffffffffffffff60208697960151166fffffffffffffffffffffffffffffffff8751166060880151908960e08a015193611c04565b969195906060830151039660808301510197610bf9565b5050507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff0160010b925061131e8383611fbb565b928a8685610afb565b5061133e6000858807128588050360081d86611fbb565b610ac3565b6001600086890712868905030160020b60081d9360010b8460010b14600014611433575b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff6001808399886000818307129105030160ff161b0119165b80156114135780600003167e1f0d1e100c1d070f090b19131c1706010e11080a1a141802121b1503160405601f826fffffffffffffffffffffffffffffffff1060071b83811c67ffffffffffffffff1060061b1783811c63ffffffff1060051b1792831c63d76453e004161a1795610b87565b50505060019193500160010b9161142a8383611fbb565b928a86856113a0565b5061143e8386611fbb565b611367565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b6301ac05a56000526004601cfd5b60046040517f30673a1b000000000000000000000000000000000000000000000000000000008152fd5b620d89e891501338610882565b7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff276181391503861087a565b50505050509050600090600090600090600090565b508015610861565b60109260209260145260345260446000938480936fa9059cbb00000000000000000000000082525af13d15600183511417161561153a57603452565b6390b8ec1890526004601cfd5b60020b6000811260000381810118620d89e881116118925763ffffffff9160807001ffffffffffffffffffffffffffffffff7ffffcb933bd6fad37aa2d162d1a59400100000000000000000000000000000000828560071b161c169260028116611877575b6004811661185c575b60088116611841575b60108116611826575b6020811661180b575b604081166117f0575b8181166117d5575b61010081166117ba575b610200811661179f575b6104008116611784575b6108008116611769575b611000811661174e575b6120008116611733575b6140008116611718575b61800081166116fd575b6201000081166116e2575b6202000081166116c8575b6204000081166116ae575b6208000016611693575b5060001261166c575b0160201c90565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff04611665565b6b048a170391f7dc42444e8fa26000929302901c919061165c565b6d2216e584f5fa1ea926041bedfe98909302811c92611652565b926e5d6af8dedb81196699c329225ee60402811c92611647565b926f09aa508b5b7a84e1c677de54f3e99bc902811c9261163c565b926f31be135f97d08fd981231505542fcfa602811c92611631565b926f70d869a156d2a1b890bb3df62baf32f702811c92611627565b926fa9f746462d870fdf8a65dc1f90e061e502811c9261161d565b926fd097f3bdfd2022b8845ad8f792aa582502811c92611613565b926fe7159475a2c29b7443b29c7fa6e889d902811c92611609565b926ff3392b0822b70005940c7a398e4b70f302811c926115ff565b926ff987a7253ac413176f2b074cf7815e5402811c926115f5565b926ffcbe86c7900a88aedcffc83b479aa3a402811c926115eb565b926ffe5dee046a99a2a811c461f1969c305302811c926115e1565b926fff2ea16466c96a3843ec78b326b5286102811c926115d9565b926fff973b41fa98c081472e6896dfb254c002811c926115d0565b926fffcb9843d60f6159c9db58835c92664402811c926115c7565b926fffe5caca7e10e4e61c3624eaa0941cd002811c926115be565b926ffff2e50f5f656932ef12357cf3c7fdcc02811c926115b5565b926ffff97272373d413259a46990580e213a02811c926115ac565b6308c379a0600052602080526101546041526045601cfd5b9193918385116118be575050505050600090565b8285106118cf575050505050600190565b6118f2936118e0866118e993611f6d565b90860390611f6d565b93820390611eda565b1090565b9190820180921161190357565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b919081156119de577bffffffffffffffffffffffffffffffff0000000000000000000000009060601b169073ffffffffffffffffffffffffffffffffffffffff80931690818102828282041461199b575b5061198f9183046118f6565b80820615159104011690565b830191838310156119ac5791611983565b90506119b9828285611eda565b92096119c3571690565b60010180156119d0571690565b63ae47f7026000526004601cfd5b505090565b918282108284180280808518931893146103a1577bffffffffffffffffffffffffffffffff00000000000000000000000060019160601b169273ffffffffffffffffffffffffffffffffffffffff611a448183169185168203918287611eda565b94098284061715151691040190565b9182821082841802908180851894146103a1577bffffffffffffffffffffffffffffffff000000000000000000000000611ab09373ffffffffffffffffffffffffffffffffffffffff938491181692851683039160601b16611eda565b0490565b611af992916fffffffffffffffffffffffffffffffff9180821082821802809173ffffffffffffffffffffffffffffffffffffffff9283911816921816039116611f6d565b90565b6001916c010000000000000000000000009180821082821802809173ffffffffffffffffffffffffffffffffffffffff928391181692181603611b51816fffffffffffffffffffffffffffffffff8616611f6d565b93091515160190565b8115611b64570490565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601260045260246000fd5b611bd692909173ffffffffffffffffffffffffffffffffffffffff9190828211611be1576fffffffffffffffffffffffffffffffff169060601b04915b166118f6565b8060a01c6103a15790565b906fffffffffffffffffffffffffffffffff611bfe921690611e39565b91611bd0565b919094929373ffffffffffffffffffffffffffffffffffffffff808716908416101594620f424091820396611c398883611cde565b8715611ccd57611c4a8587846119e3565b925b838210611c95575050968792611c628284611d79565b9209611c83575b945b15611c7a5791611af992611ab4565b611af992611a53565b600191500180156119d0578590611c69565b9798509250505082158215176103a1578515611cbd57611cb6908284611932565b8095611c6b565b611cc8908284611b93565b611cb6565b611cd8858388611afc565b92611c4c565b60009291808202917fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8282099183831084018084039314611d6b57620f42409183831115611d5e577fde8f6cefed634549b62c77574f722e1ac57e23f24d8fd5cb790fb65668c26139959650099182810360061c9211900360fa1b170290565b63ae47f70287526004601cfd5b505050620f42409192500490565b600090620f424090818102917fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8183099183831084018084039314611e1d5782861115611e1057908591099160018585038616809604600281600302811880830282030280830282030280830282030280830282030280830282030280920290030295808086850304960304019211900302170290565b63ae47f70285526004601cfd5b505050908215611e2c57500490565b63ae47f70290526004601cfd5b6000908060601b906c010000000000000000000000007fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8183099183831084018084039314611e1d5782861115611e1057908591099160018585038616809604600281600302811880830282030280830282030280830282030280830282030280830282030280920290030295808086850304960304019211900302170290565b90600091818102917fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff8183099183831084018084039314611e1d5782861115611e1057908591099160018585038616809604600281600302811880830282030280830282030280830282030280830282030280830282030280920290030295808086850304960304019211900302170290565b818102917fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff910981811082019003806c0100000000000000000000000011156119d05760a01b9060601c1790565b9060209060246000809481937f5339c29600000000000000000000000000000000000000000000000000000000835260010b6004525afa1561078357519056fea164736f6c6343000816000a";

type UniV3OptimalSwapRouterConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: UniV3OptimalSwapRouterConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class UniV3OptimalSwapRouter__factory extends ContractFactory {
  constructor(...args: UniV3OptimalSwapRouterConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override deploy(
    npm: string,
    overrides?: PayableOverrides & { from?: string }
  ): Promise<UniV3OptimalSwapRouter> {
    return super.deploy(
      npm,
      overrides || {}
    ) as Promise<UniV3OptimalSwapRouter>;
  }
  override getDeployTransaction(
    npm: string,
    overrides?: PayableOverrides & { from?: string }
  ): TransactionRequest {
    return super.getDeployTransaction(npm, overrides || {});
  }
  override attach(address: string): UniV3OptimalSwapRouter {
    return super.attach(address) as UniV3OptimalSwapRouter;
  }
  override connect(signer: Signer): UniV3OptimalSwapRouter__factory {
    return super.connect(signer) as UniV3OptimalSwapRouter__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): UniV3OptimalSwapRouterInterface {
    return new utils.Interface(_abi) as UniV3OptimalSwapRouterInterface;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): UniV3OptimalSwapRouter {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as UniV3OptimalSwapRouter;
  }
}