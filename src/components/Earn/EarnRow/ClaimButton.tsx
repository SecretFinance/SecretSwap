import { Redeem } from '../../../blockchain-bridge/scrt';
import React, { useEffect, useState } from 'react';
import * as styles from './styles.styl';
import { Button, Icon, Popup } from 'semantic-ui-react';
import { useStores } from 'stores';
import { AsyncSender } from '../../../blockchain-bridge/scrt/asyncSender';
import { toUscrtFee, unlockToken } from 'utils';
import { unlockJsx } from 'pages/Swap/utils';
import { formatSignificantFigures } from '../../../utils';
import Loader from 'react-loader-spinner';
import { GAS_FOR_CLAIM, PROPOSAL_BASE_FEE } from '../../../utils/gasPrices';

const ClaimButton = (props: {
  secretjs: AsyncSender;
  balance: string;
  unlockPopupText: string;
  rewardsContract: string;
  contract: string;
  available: string;
  symbol: string;
  notify: Function;
  rewardsToken?: string;
}) => {
  const { user, theme } = useStores();
  const [loading, setLoading] = useState<boolean>(false);
  const [fee, setFee] = useState({
    amount: [{ amount: toUscrtFee(GAS_FOR_CLAIM), denom: 'uscrt' }],
    gas: String(GAS_FOR_CLAIM),
  } as any);

  const displayAvailable = () => {
    if (props.available === unlockToken) {
      return (
        <div className={`${styles.create_viewingkey} ${styles[theme.currentTheme]}`}>
          {unlockJsx({
            onClick: async () => {
              await user.keplrWallet.suggestToken(user.chainId, props.contract);
              // TODO trigger balance refresh if this was an "advanced set" that didn't
              // result in an on-chain transaction
              await user.updateBalanceForSymbol(props.symbol);
              await user.updateScrtBalance();
            },
          })}
          {props.balance?.includes(unlockToken) && (
            <Popup
              content={props.unlockPopupText}
              className={styles.iconinfo__popup}
              trigger={<Icon className={styles.icon_info} name="info" circular size="tiny" />}
            />
          )}
        </div>
      );
    } else {
      return props.available ? (
        <strong>{formatSignificantFigures(props.available, 6)}</strong>
      ) : (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Loader type="ThreeDots" color="#ff726e" height="0.2em" />
        </div>
      );
    }
  };

  const setGasFee = () => {
    const activeProposals = user.numOfActiveProposals;
    const { rewardsContract } = props;
    const newPoolContract = process.env.SEFI_STAKING_CONTRACT;
    if (rewardsContract === newPoolContract && activeProposals > 0) {
      let fee = {
        amount: [{ amount: toUscrtFee(GAS_FOR_CLAIM + PROPOSAL_BASE_FEE * activeProposals), denom: 'uscrt' }],
        gas: GAS_FOR_CLAIM + PROPOSAL_BASE_FEE * activeProposals,
      };
      setFee(fee);
    }
  };

  useEffect(() => {
    setGasFee();
    //eslint-disable-next-line
  }, [user.numOfActiveProposals]);

  return (
    <>
      <div className={`${styles.claim_label} ${styles[theme.currentTheme]}`}>
        {displayAvailable()}
        <span style={{ marginLeft: '10px' }}>{props.rewardsToken}</span>
      </div>
      <Button
        loading={loading}
        className={`${styles.button} ${styles[theme.currentTheme]}`}
        disabled={typeof props.available === 'undefined' || props.available === '0'}
        onClick={async () => {
          setLoading(true);
          try {
            await Redeem({
              secretjs: props.secretjs,
              address: props.contract,
              amount: '0',
              fee,
            });

            props.notify('success', `Claimed ${props.available} ${props.rewardsToken}`);
          } catch (reason) {
            props.notify('error', `Failed to claim: ${reason}`);
            console.error(`Failed to claim: ${reason}`);
          }
          await Promise.all([
            await user.updateBalanceForSymbol(props.symbol),
            await user.updateBalanceForSymbol(props.rewardsToken || 'sSCRT'),
            await user.refreshRewardsBalances(props.symbol),
            await user.updateScrtBalance(),
          ]);
          setLoading(false);
        }}
      >
        Claim
      </Button>
    </>
  );
};

export default ClaimButton;
