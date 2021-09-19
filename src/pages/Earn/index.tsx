import * as React from 'react';
import { useEffect, useState } from 'react';
import { Box } from 'grommet';
import { BaseContainer, PageContainer } from 'components';
import { observer } from 'mobx-react-lite';
import { useStores } from 'stores';
import * as styles from '../EthBridge/styles.styl';
// import { IColumn, Table } from '../../components/Table';
// import { ERC20Select } from '../Exchange/ERC20Select';
import EarnRow from '../../components/Earn/EarnRow';
import { calculateAPY } from '../../components/Earn/EarnRow';
import { rewardsDepositKey, rewardsKey } from '../../stores/UserStore';
import { divDecimals, sleep, zeroDecimalsFormatter } from '../../utils';
import { InfoModalEarn } from '../../components/InfoModalEarn';
import { Icon } from 'components/Base/components/Icons';
import { ITokenInfo } from '../../stores/interfaces';
import * as services from 'services';
import Loader from 'react-loader-spinner';
import { Text } from 'components/Base';
import './notifications.css'
import { notify } from '../../blockchain-bridge/scrt/utils';

export const EarnRewards = observer((props: any) => {
  const { user, tokens, rewards,theme } = useStores();
  const [sushiAPY, setSushiAPY] = useState<Number>(-1);

  const [filteredTokens, setFilteredTokens] = useState<ITokenInfo[]>([]);

  useEffect(() => {
    const asyncWrapper = async () => {
      while (tokens.isPending) {
        await sleep(100);
      }
      setFilteredTokens(await tokens.tokensUsage('REWARDS'));
    };
    asyncWrapper().then(() => { });
  }, [tokens, tokens.data]);

  useEffect(() => {
    // const refreshAllTokens = async () => {
    //   while (!user.secretjs || tokens.isPending) {
    //     await sleep(100);
    //   }
    //   await Promise.all([...filteredTokens.map(token => user.updateBalanceForSymbol(token.display_props.symbol))]);
    // };
    const resolveSushiAPY = async () => {
      while (!user.secretjs || !user.scrtRate) {
        await sleep(100);
      }

      try {
        const sushipool = await services.getSushiPool('0x9c86bc3c72ab97c2234cba8c6c7069009465ae86');
        const liquidity = sushipool.entryUSD - sushipool.exitUSD;
        const apy = ((3000 * user.scrtRate) / liquidity) * 52;
        setSushiAPY(Number((apy * 100).toFixed(2)));
      } catch (error) {
        setSushiAPY(0);
      }
    };

    resolveSushiAPY().then(() => { });
    //refreshAllTokens().then(() => {});
  }, [filteredTokens]);

  useEffect(() => {
    rewards.init({
      isLocal: true,
      sorter: 'none',
      pollingInterval: 20000,
    });
    rewards.fetch();
  }, []);

  return (
    <BaseContainer>
      <PageContainer>
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100px',
            padding: '16px',
            position: 'absolute',
            left: '0',
            top: '100px',
            backgroundColor: '#F5F8FE',
            zIndex: -1,
          }}
        />
        <div
          style={{
            display: 'flex',
            minWidth: '550px',
            maxWidth: '1100px',
            backgroundColor: '#F5F8FE',
          }}
        >
          <Icon
            glyph="InfoIcon"
            size="medium"
            color={'black'}
            style={{
              display: 'inline-block',
              marginRight: '16px',
            }}
          />
          <p
            style={{
              minWidth: '550px',
              maxWidth: '1047px',
              display: 'inline-block',
            }}
          >
            If you have created viewing keys for secretTokens and secretSCRT, you should be able to see secretTokens
            locked in the rewards contract and your rewards. If you can't see these figures please refresh your browser.
          </p>
        </div>
        <div
          style={{
            display: 'flex',
            minWidth: '550px',
            maxWidth: '1100px',
            backgroundColor: '#F5F8FE',
            marginTop: '0.3em',
          }}
        >
          <Icon
            glyph="InfoIcon"
            size="medium"
            color={'black'}
            style={{
              display: 'inline-block',
              marginRight: '16px',
            }}
          />
          <p
            style={{
              minWidth: '550px',
              maxWidth: '1047px',
              display: 'flex',
              flexDirection: 'row',
            }}
          >
              <ul>
                <li>Earn rewards are currently disabled. New reward pools will be added in the near future</li>
                <li>
                  To withdraw rewards from the pool, use the "withdraw" button for each pool. This will automatically
                  withdraw all your rewards. You do not need a viewing key to use this feature
                </li>
                <li>
                  We recommend backing up your viewing keys for the earn pools. These may be used in the future to
                  validate earned SEFI rewards
                </li>
                <li>
                  Known issues:
                  <ul>
                    <li>
                      Withdraw message will return a 0.0000 for the amount of lp tokens withdrawn regardless of amount
                    </li>
                    <li>Creating a viewing key for disabled earn contracts may fail</li>
                  </ul>
                </li>
              </ul>
          </p>
        </div>
        <Box direction="row" wrap={true} fill={true} justify="center" align="start">
          <Box direction="column" align="center" justify="center" className={styles.base}>
            {rewards.allData
              .slice()
              .map(rewardToken => {
                if (Number(rewardToken.deadline) < 2_000_000) {
                  return null;
                }
                let token = filteredTokens.find(element => element.dst_address === rewardToken.inc_token.address);
                if (!token) {
                  return null;
                }
                return {
                  rewardsContract: rewardToken.pool_address,
                  lockedAsset: rewardToken.inc_token.symbol,
                  lockedAssetAddress: token.dst_address,
                  totalLockedRewards: divDecimals(
                    Number(rewardToken.total_locked) * Number(token.price),
                    rewardToken.inc_token.decimals,
                  ),
                  rewardsDecimals: String(rewardToken.rewards_token.decimals),
                  rewards: user.balanceRewards[rewardsKey(rewardToken.inc_token.symbol)],
                  deposit: user.balanceRewards[rewardsDepositKey(rewardToken.inc_token.symbol)],
                  balance: user.balanceToken[token.src_coin],
                  decimals: token.decimals,
                  name: token.name,
                  price: token.price,
                  rewardsPrice: String(rewardToken.rewards_token.price),
                  display_props: token.display_props,
                  remainingLockedRewards: rewardToken.pending_rewards,
                  deadline: Number(rewardToken.deadline),
                };
              }).filter(function (el) {
                return el != null;
              })
              .slice()
              .sort((a, b) => {
                const rewards_a = zeroDecimalsFormatter.format(Number(calculateAPY(a, Number(a.rewardsPrice), Number(a.price))));
                const rewards_b = zeroDecimalsFormatter.format(Number(calculateAPY(b, Number(b.rewardsPrice), Number(b.price))));
                return Number(rewards_b) - Number(rewards_a);
              })
              .map(rewardToken => {

                return (
                  <EarnRow
                    notify={notify}
                    key={rewardToken.lockedAsset}
                    userStore={user}
                    token={rewardToken}
                    callToAction="Earn sSCRT"
                    theme={theme}
                  />
                );
              })}
          </Box>
        </Box>
        <InfoModalEarn />
      </PageContainer>
    </BaseContainer>
  );
});
