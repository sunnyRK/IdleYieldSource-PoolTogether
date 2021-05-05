/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */

import { Signer, Contract, ContractFactory, Overrides } from "ethers";
import { Provider, TransactionRequest } from "@ethersproject/providers";

import type { IdleYieldSourceProxyFactoryHarness } from "../IdleYieldSourceProxyFactoryHarness";

export class IdleYieldSourceProxyFactoryHarness__factory extends ContractFactory {
  constructor(signer?: Signer) {
    super(_abi, _bytecode, signer);
  }

  deploy(
    _instance: string,
    _iGenericProxyFactory: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): Promise<IdleYieldSourceProxyFactoryHarness> {
    return super.deploy(
      _instance,
      _iGenericProxyFactory,
      overrides || {}
    ) as Promise<IdleYieldSourceProxyFactoryHarness>;
  }
  getDeployTransaction(
    _instance: string,
    _iGenericProxyFactory: string,
    overrides?: Overrides & { from?: string | Promise<string> }
  ): TransactionRequest {
    return super.getDeployTransaction(
      _instance,
      _iGenericProxyFactory,
      overrides || {}
    );
  }
  attach(address: string): IdleYieldSourceProxyFactoryHarness {
    return super.attach(address) as IdleYieldSourceProxyFactoryHarness;
  }
  connect(signer: Signer): IdleYieldSourceProxyFactoryHarness__factory {
    return super.connect(signer) as IdleYieldSourceProxyFactoryHarness__factory;
  }
  static connect(
    address: string,
    signerOrProvider: Signer | Provider
  ): IdleYieldSourceProxyFactoryHarness {
    return new Contract(
      address,
      _abi,
      signerOrProvider
    ) as IdleYieldSourceProxyFactoryHarness;
  }
}

const _abi = [
  {
    inputs: [
      {
        internalType: "address",
        name: "_instance",
        type: "address",
      },
      {
        internalType: "address",
        name: "_iGenericProxyFactory",
        type: "address",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_idleToken",
        type: "address",
      },
    ],
    name: "createNewProxy",
    outputs: [
      {
        internalType: "address",
        name: "instanceCreated",
        type: "address",
      },
      {
        internalType: "bytes",
        name: "result",
        type: "bytes",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "iGenericProxyFactory",
    outputs: [
      {
        internalType: "contract IGenericProxyFactory",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "idleYieldSourceInstance",
    outputs: [
      {
        internalType: "contract IdleYieldSourceHarness",
        name: "",
        type: "address",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
];

const _bytecode =
  "0x608060405234801561001057600080fd5b506040516103c83803806103c883398101604081905261002f9161007c565b600080546001600160a01b039384166001600160a01b031991821617909155600180549290931691161790556100ae565b80516001600160a01b038116811461007757600080fd5b919050565b6000806040838503121561008e578182fd5b61009783610060565b91506100a560208401610060565b90509250929050565b61030b806100bd6000396000f3fe608060405234801561001057600080fd5b50600436106100415760003560e01c80634f9ccab81461004657806364a9326414610070578063a25d79c51461009b575b600080fd5b610059610054366004610153565b6100ae565b604051610067929190610235565b60405180910390f35b600154610083906001600160a01b031681565b6040516001600160a01b039091168152602001610067565b600054610083906001600160a01b031681565b60015460008054604080516351fb4bdd60e11b81526001600160a01b039283166004820152602481019190915260448101839052919260609291169063a3f697ba90606401600060405180830381600087803b15801561010d57600080fd5b505af1158015610121573d6000803e3d6000fd5b505050506040513d6000823e601f3d908101601f191682016040526101499190810190610176565b9094909350915050565b600060208284031215610164578081fd5b813561016f816102bd565b9392505050565b60008060408385031215610188578081fd5b8251610193816102bd565b602084015190925067ffffffffffffffff808211156101b0578283fd5b818501915085601f8301126101c3578283fd5b8151818111156101d5576101d56102a7565b604051601f8201601f19908116603f011681019083821181831017156101fd576101fd6102a7565b81604052828152886020848701011115610215578586fd5b610226836020830160208801610277565b80955050505050509250929050565b60018060a01b03831681526040602082015260008251806040840152610262816060850160208701610277565b601f01601f1916919091016060019392505050565b60005b8381101561029257818101518382015260200161027a565b838111156102a1576000848401525b50505050565b634e487b7160e01b600052604160045260246000fd5b6001600160a01b03811681146102d257600080fd5b5056fea2646970667358221220b84137426ddf3bc8c63b460ef9420ad1c7649d7ba0d5dd2b4c5703b3b3b30b0564736f6c63430008040033";
