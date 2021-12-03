import { StdFee } from "secretjs/types/types";
import { PROPOSAL_BASE_FEE } from '../../../utils/gasPrices';
import { toUscrtFee } from 'utils';

export function getGasFee(GAS_CONSTANT, rewardsContract, activeProposals): StdFee {
  let coinType;

  if (rewardsContract === process.env.SEFI_STAKING_CONTRACT) { //if this is the SEFI contract
    coinType = 'SEFI';
  } else {
    coinType = 'OTHER';
    activeProposals = 0;
  }

  const gas = GAS_CONSTANT[coinType] + PROPOSAL_BASE_FEE * activeProposals;

  return {
    amount: [{ amount: toUscrtFee(gas), denom: 'uscrt' }],
    gas: gas.toString(),
  };
};
