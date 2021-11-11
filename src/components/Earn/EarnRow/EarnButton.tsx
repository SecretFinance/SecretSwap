import { DepositRewards } from '../../../blockchain-bridge/scrt';
import React, { useEffect, useState } from 'react';
import { toUscrtFee, valueToDecimals } from '../../../utils';
import cn from 'classnames';
import * as styles from './styles.styl';
import { Button } from 'semantic-ui-react';
import { unlockToken } from '../../../utils';
import { useStores } from 'stores';
import moment from 'moment';
import { GAS_FOR_CLAIM, PROPOSAL_BASE_FEE, GAS_FOR_EARN_DEPOSIT } from '../../../utils/gasPrices';

// todo: add failed toast or something
const EarnButton = ({ props, value, changeValue, togglePulse, setPulseInterval }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const amount = Number(value).toFixed(6);
  const { theme, user } = useStores();

  const [fee, setFee] = useState({
    amount: [{ amount: toUscrtFee(GAS_FOR_EARN_DEPOSIT), denom: 'uscrt' }],
    gas: String(GAS_FOR_EARN_DEPOSIT),
  } as any);

  const activeProposals = user.numOfActiveProposals;
  const rewardsContact = props.token.rewardsContract;
  const newPoolContract = process.env.SEFI_STAKING_CONTRACT;

  const setGasFee = () => {
    if (rewardsContact === newPoolContract && activeProposals > 0) {
      let fee = {
        amount: [{ amount: toUscrtFee(GAS_FOR_CLAIM + PROPOSAL_BASE_FEE * activeProposals), denom: 'uscrt' }],
        gas: GAS_FOR_CLAIM + PROPOSAL_BASE_FEE * activeProposals,
      };
      setFee(fee);
    }
  };

  useEffect(() => {
    setGasFee();
  }, [activeProposals]);

  return (
    <Button
      loading={loading}
      className={`${styles.button} ${styles[theme.currentTheme]}`}
      disabled={Number(value) === 0 || isNaN(value)}
      onClick={async () => {
        setLoading(true);
        await DepositRewards({
          secretjs: props.userStore.secretjsSend,
          recipient: props.token.rewardsContract,
          address: props.token.lockedAssetAddress,
          // maximum precision for the contract is 6 decimals
          amount: valueToDecimals(amount, props.token.decimals),
          fee,
        })
          .then(_ => {
            changeValue({
              target: {
                value: '0.0',
              },
            });
            props.userStore.updateScrtBalance();
            props.notify('success', `Staked ${amount} s${props.token.display_props.symbol} in the rewards contract`);
            if (props.token.deposit === unlockToken) {
              togglePulse();
              const interval = setInterval(togglePulse, 700);
              setPulseInterval(interval);
            }
          })
          .catch(reason => {
            props.notify('error', `Failed to deposit: ${reason}`);
            console.log(`Failed to deposit: ${reason}`);
          });
        ///TODO:FIX THIS
        await Promise.all([
          props.userStore.refreshTokenBalanceByAddress(props.token.rewardsContract),
          props.userStore.refreshRewardsBalances('', props.token.rewardsContract),
        ]);
        setLoading(false);
      }}
    >
      Earn
    </Button>
  );
};

export default EarnButton;
