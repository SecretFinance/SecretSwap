import { EthMethods } from './EthMethods';
import { EthMethodsERC20 } from './EthMethodsERC20';
import { TOKEN } from '../../stores/interfaces';
import { EthMethodsSefi } from './EthMethodsSefi';
import { NETWORKS } from './networks';

const Web3 = require('web3');

// TODO Howard
// const web3URL = window.web3 ? window.web3.currentProvider : globalThis.config.ETH_NODE_URL;
const web3URL = globalThis.config.ETH_NODE_URL;

export const web3 = new Web3(web3URL);

const ethManagerJson = require('../out/MultiSigSwapWallet.json');

const ethManagerContract = new web3.eth.Contract(ethManagerJson.abi, globalThis.config.ETH_MANAGER_CONTRACT);
const bscManagerContract = new web3.eth.Contract(ethManagerJson.abi, globalThis.config.BSC_MANAGER_CONTRACT);
const plmManagerContract = new web3.eth.Contract(ethManagerJson.abi, globalThis.config.PLSM_MANAGER_CONTRACT);

export const fromScrtMethods: Record<NETWORKS, Record<TOKEN, any>> = {
  [NETWORKS.PLSM]: {
    [TOKEN.NATIVE]: new EthMethods({
      web3: web3,
      ethManagerContract: plmManagerContract,
    }),
    [TOKEN.ERC20]: new EthMethodsERC20({
      web3: web3,
      ethManagerContract: plmManagerContract,
      ethManagerAddress: globalThis.config.PLSM_MANAGER_CONTRACT,
    }),
    [TOKEN.S20]: null,
  },
  [NETWORKS.ETH]: {
    [TOKEN.NATIVE]: new EthMethods({
      web3: web3,
      ethManagerContract: ethManagerContract,
    }),

    [TOKEN.ERC20]: new EthMethodsERC20({
      web3: web3,
      ethManagerContract: ethManagerContract,
      ethManagerAddress: globalThis.config.ETH_MANAGER_CONTRACT,
    }),
    [TOKEN.S20]: null,
  },
  [NETWORKS.BSC]: {
    [TOKEN.NATIVE]: new EthMethods({
      web3: web3,
      ethManagerContract: bscManagerContract,
    }),

    [TOKEN.ERC20]: new EthMethodsERC20({
      web3: web3,
      ethManagerContract: bscManagerContract,
      ethManagerAddress: globalThis.config.BSC_MANAGER_CONTRACT,
    }),
    [TOKEN.S20]: null,
  },
};

const sefiTokenCompiledContract = require('../out/MyERC20.json');
const sefiTokenContract = new web3.eth.Contract(sefiTokenCompiledContract.abi, globalThis.config.ETH_GOV_TOKEN_ADDRESS);

const sefiDistCompiledContract = require('../out/MerkleDistributor.json');
const sefiDistContract = new web3.eth.Contract(sefiDistCompiledContract.abi, globalThis.config.ETH_DIST_TOKEN_ADDRESS);

export const ethMethodsSefi = new EthMethodsSefi({
  web3: web3,
  govTokenContract: sefiTokenContract,
  distributionContract: sefiDistContract,
});
