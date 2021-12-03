import { emergencyRedeem, Redeem } from '../../../blockchain-bridge/scrt';
import React, { useState } from 'react';
import { valueToDecimals } from '../../../utils';
import * as styles from './styles.styl';
import { Button } from 'semantic-ui-react';
import { useStores } from 'stores';
import { GAS_FOR_EARN_WITHDRAW } from '../../../utils/gasPrices';
import { getGasFee } from './gasFunctions';

const WithdrawButton = ({ props, value, changeValue }) => {
  const [loading, setLoading] = useState<boolean>(false);
  const amount = Number(value).toFixed(6);
  const { theme, user } = useStores();

  return (
    <Button
      loading={loading}
      className={`${styles.button} ${styles[theme.currentTheme]}`}
      onClick={async () => {
        setLoading(true);
        let redeemTask = props.token.deprecated
          ? emergencyRedeem({
              secretjs: props.userStore.secretjsSend,
              address: props.token.rewardsContract,
              fee: getGasFee(GAS_FOR_EARN_WITHDRAW, props.token.rewardsContract, user.numOfActiveProposals),
            })
          : Redeem({
              secretjs: props.userStore.secretjsSend,
              address: props.token.rewardsContract,
              amount: valueToDecimals(amount, props.token.decimals),
              fee: getGasFee(GAS_FOR_EARN_WITHDRAW, props.token.rewardsContract, user.numOfActiveProposals),
            });

        await redeemTask
          .then(_ => {
            props.userStore.updateScrtBalance();
            props.notify('success', `Removed ${amount} s${props.token.display_props.symbol} from the rewards contract`);
            changeValue({
              target: {
                value: '0.0',
              },
            });
          })
          .catch(reason => {
            props.notify('error', `Failed to withdraw: ${reason}`);
            console.log(`Failed to withdraw: ${reason}`);
            setLoading(false);
          });
        //TODO FIX THIS
        await Promise.all([
          props.userStore.refreshTokenBalanceByAddress(props.token.rewardsContract),
          props.userStore.refreshRewardsBalances('', props.token.rewardsContract),
        ]).catch(() => setLoading(false));
        setLoading(false);
      }}
    >
      Withdraw
    </Button>
  );
};

export default WithdrawButton;
