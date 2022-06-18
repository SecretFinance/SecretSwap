import BigNumber from 'bignumber.js';
import React from 'react';
import { CosmWasmClient } from 'secretjs';
import { Accordion, Button, Container, Divider, Header, Image } from 'semantic-ui-react';
import { CSSProperties } from 'styled-components';
import { displayHumanizedBalance, humanizeBalance } from 'utils';
import { PriceRow } from '../../components/Swap/PriceRow';
import { getFeeForExecute } from '../../blockchain-bridge';
import { FlexRowSpace } from '../../components/Swap/FlexRowSpace';
import { SwapTokenMap } from '../TokenModal/types/SwapToken';
import { SwapPair } from '../TokenModal/types/SwapPair';
import { DownArrow } from '../../ui/Icons/DownArrow';
import { PairAnalyticsLink } from '../../components/Swap/PairAnalyticsLink';
import Loader from 'react-loader-spinner';
import { shareOfPoolNumberFormat, storeTxResultLocally } from './utils';
import { AsyncSender } from '../../blockchain-bridge/scrt/asyncSender';
import Theme from 'themes';
import { GAS_FOR_WITHDRAW_LP_FROM_SWAP } from '../../utils/gasPrices';
import './style.scss'

export class WithdrawLiquidityPanel extends React.Component<
  {
    tokens: SwapTokenMap;
    balances: { [symbol: string]: BigNumber | JSX.Element };
    secretjs: CosmWasmClient;
    secretjsSender: AsyncSender;
    selectedPair: SwapPair;
    notify: (type: 'success' | 'error', msg: string, closesAfterMs?: number) => void;
    getBalance: CallableFunction;
    onCloseTab: CallableFunction;
    theme: Theme;
    isRowOpen: boolean;
    setIsRowOpen: Function;
  },
  {
    isLoading: boolean;
    withdrawPercentage: number;
    isActive: boolean;
    isLoadingBalance: boolean;
  }
> {
  state = {
    isLoading: false,
    withdrawPercentage: 0,
    isActive: false,
    isLoadingBalance: false,
  };

  render() {
    let [symbolA, symbolB] = [
      this.props.selectedPair.asset_infos[0].symbol,
      this.props.selectedPair.asset_infos[1].symbol,
    ];

    if (symbolA === symbolB) {
      return null;
    }

    let selectedPair = this.props.selectedPair;
    if (symbolB === 'sSCRT') {
      selectedPair = new SwapPair(
        symbolB,
        selectedPair.asset_infos[1].info,
        symbolA,
        selectedPair.asset_infos[0].info,
        selectedPair.contract_addr,
        selectedPair.liquidity_token,
        selectedPair.pair_identifier,
      );

      symbolB = symbolA;
      symbolA = 'sSCRT';
    }
    if (selectedPair.pair_identifier.includes(globalThis.config.SSCRT_CONTRACT)) {
      const tokenB = selectedPair.pair_identifier.split('/').filter(a => a !== globalThis.config.SSCRT_CONTRACT);
      selectedPair.pair_identifier = `${globalThis.config.SSCRT_CONTRACT}${SwapPair.id_delimiter}${tokenB}`;
    }

    const [tokenA, tokenB] = selectedPair.assetIds();

    const decimalsA = this.props.tokens.get(tokenA)?.decimals;
    const decimalsB = this.props.tokens.get(tokenB)?.decimals;

    const lpTokenBalance = this.props.balances[selectedPair.lpTokenSymbol()]; // LP-secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek/secret15grq8y54tvc24j8hf8chunsdcr84fd3d30fvqv
    const lpTokenTotalSupply = this.props.balances[selectedPair.liquidity_token + '-total-supply'] as BigNumber;

    let lpShare = new BigNumber(0);
    let lpShareJsxElement = lpTokenBalance; // View Balance
    let pooledTokenA: string;
    let pooledTokenB: string;

    const pairSymbol = selectedPair.identifier();
    const pairSymbolInverse = selectedPair
      .identifier()
      .split(SwapPair.id_delimiter)
      .reverse()
      .join(SwapPair.id_delimiter);

    const lpTokenBalanceNum = new BigNumber(lpTokenBalance as BigNumber);
    if (!lpTokenBalanceNum.isNaN()) {
      if (lpTokenTotalSupply?.isGreaterThan(0)) {
        lpShare = lpTokenBalanceNum.dividedBy(lpTokenTotalSupply);

        pooledTokenA = displayHumanizedBalance(
          humanizeBalance(
            lpShare.multipliedBy(
              (this.props.balances[`${tokenA}-${pairSymbol}`] ??
                this.props.balances[`${tokenA}-${pairSymbolInverse}`]) as BigNumber,
            ),
            decimalsA,
          ),
        );

        pooledTokenB = displayHumanizedBalance(
          humanizeBalance(
            lpShare.multipliedBy(
              (this.props.balances[`${tokenB}-${pairSymbol}`] ??
                this.props.balances[`${tokenB}-${pairSymbolInverse}`]) as BigNumber,
            ),
            decimalsB,
          ),
        );

        lpShareJsxElement = (
          <span>{`${shareOfPoolNumberFormat.format(
            lpTokenBalanceNum
              .multipliedBy(100)
              .dividedBy(lpTokenTotalSupply)
              .toNumber(),
          )}%`}</span>
        );
      } else {
        pooledTokenA = '0';
        pooledTokenB = '0';
        lpShareJsxElement = <span>0%</span>;
      }
    }

    const getLogo = (address: string) => (
      <Image
        src={this.props.tokens.get(address)?.logo}
        avatar
        style={{
          boxShadow: 'rgba(0, 0, 0, 0.075) 0px 6px 10px',
          borderRadius: '24px',
          maxHeight: '24px',
          maxWidth: '24px',
        }}
      />
    );

    const rowStyle: CSSProperties = {
      display: 'flex',
      padding: '0.5em 0 0 0',
      color: this.props.theme.currentTheme == 'light' ? '#5F5F6B' : '#DEDEDE',
    };

    const poolA = new BigNumber(this.props.balances[`${tokenA}-${pairSymbol}`] as any);
    const poolB = new BigNumber(this.props.balances[`${tokenB}-${pairSymbol}`] as any);

    const price = humanizeBalance(poolA, decimalsA).dividedBy(humanizeBalance(poolB, decimalsB));

    const lpTokenBalanceString = lpTokenBalanceNum.toFormat(0, {
      groupSeparator: '',
    });
    const amountInTokenDenom = lpTokenBalanceNum.multipliedBy(this.state.withdrawPercentage).toFormat(0, {
      groupSeparator: '',
    });

    return (
      <Container
        style={{
          padding: '.5rem 1rem',
          margin: '.5rem 0',
          borderRadius: '16px',
          border: this.props.theme.currentTheme == 'light' ? '1px solid #DEDEDE' : '1px solid white',
          backgroundColor: this.props.theme.currentTheme == 'light' ? 'white' : '',
        }}
      >
        <Accordion fluid>
          <Accordion.Title
            active={this.state.isActive}
            onClick={async () => {
              if (this.state.isActive && this.props.isRowOpen) {
                this.setState({ isActive: false });
                this.props.setIsRowOpen(false);
              } else if (!this.props.isRowOpen) {
                this.setState({ isActive: true, isLoadingBalance: true });
                // get balances and subscribe for events for this pair
                await this.props.getBalance(selectedPair);
                this.setState({ isLoadingBalance: false });
                this.props.setIsRowOpen(true);
              } else {
                this.props.notify('error', 'You may not be able to open more than one row at the same time.');
              }
            }}
          >
            <div
              style={{
                display: 'flex',
              }}
            >
              {getLogo(tokenA)}
              {getLogo(tokenB)}
              <strong
                style={{
                  margin: 'auto',
                  color: this.props.theme.currentTheme == 'light' ? '#5F5F6B' : '#DEDEDE',
                }}
              >
                {selectedPair.humanizedSymbol()}
              </strong>
              <FlexRowSpace />
            </div>
          </Accordion.Title>
          <Accordion.Content active={this.state.isActive}>
            {this.state.isLoadingBalance ? (
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <Loader type="ThreeDots" color="#cb9b51" height="0.5em" />
              </div>
            ) : null}
            <div hidden={this.state.isLoadingBalance}>
              <div style={rowStyle}>
                <span>Your Total Pool Tokens</span>
                <FlexRowSpace />
                {lpTokenBalanceNum.isNaN()
                  ? lpTokenBalance
                  : displayHumanizedBalance(humanizeBalance(lpTokenBalanceNum, 6))}
              </div>
              {!lpTokenBalanceNum.isNaN() && (
                <>
                  <div style={rowStyle}>
                    <span style={{ margin: 'auto' }}>{`Pooled ${this.props.tokens.get(tokenA)?.symbol}`}</span>
                    <FlexRowSpace />
                    <span style={{ margin: 'auto', paddingRight: '0.3em' }}>{pooledTokenA}</span>
                    {getLogo(tokenA)}
                  </div>
                  <div style={rowStyle}>
                    <span style={{ margin: 'auto' }}>{`Pooled ${this.props.tokens.get(tokenB)?.symbol}`}</span>
                    <FlexRowSpace />
                    <span style={{ margin: 'auto', paddingRight: '0.3em' }}>{pooledTokenB}</span>
                    {getLogo(tokenB)}
                  </div>
                  <div style={rowStyle}>
                    <span>Your Pool Share</span>
                    <FlexRowSpace />
                    {lpShareJsxElement}
                  </div>
                </>
              )}
              <PairAnalyticsLink pairAddress={selectedPair?.contract_addr} />
              {lpTokenBalanceNum.isNaN() || lpTokenBalanceString === '0' ? null : (
                <>
                  <Divider horizontal>
                    <Header as="h4" style={{ color: this.props.theme.currentTheme == 'light' ? '#5F5F6B' : '#DEDEDE' }}>
                      Withdraw
                    </Header>
                  </Divider>
                  <div
                    style={{
                      ...rowStyle,
                      fontSize: '50px',
                      paddingBottom: '0.2em',
                    }}
                  >
                    <FlexRowSpace />
                    {`${new BigNumber(this.state.withdrawPercentage * 100).toFixed(0)}%`}
                    <FlexRowSpace />
                  </div>
                  <div style={{ ...rowStyle, paddingBottom: '0.2em' }}>
                    <input
                      style={{
                        flex: 1,
                        margin: '0.75rem 0 0.5rem 0',
                      }}
                      type="range"
                      color='#cb9b51'
                      min={0}
                      max={1}
                      step={0.01}
                      value={this.state.withdrawPercentage}
                      onChange={e => {
                        this.setState({
                          withdrawPercentage: Number(e.target.value),
                        });
                      }}
                    />
                  </div>
                  <div style={rowStyle}>
                    <Button
                      basic
                      className='withdrawAmountBtn'
                      onClick={async () => {
                        this.setState({ withdrawPercentage: 0.25 });
                      }}
                    >
                      25%
                    </Button>
                    <Button
                      basic
                      className='withdrawAmountBtn'
                      onClick={async () => {
                        this.setState({ withdrawPercentage: 0.5 });
                      }}
                    >
                      50%
                    </Button>
                    <Button
                      basic
                      className='withdrawAmountBtn'
                      onClick={async () => {
                        this.setState({ withdrawPercentage: 0.75 });
                      }}
                    >
                      75%
                    </Button>
                    <Button
                      basic
                      className='withdrawAmountBtn'
                      onClick={async () => {
                        this.setState({ withdrawPercentage: 1 });
                      }}
                    >
                      MAX
                    </Button>
                  </div>
                  <div style={rowStyle}>
                    <FlexRowSpace />
                    <DownArrow />
                    <FlexRowSpace />
                  </div>
                  <div style={rowStyle}>
                    <span style={{ margin: 'auto' }}>{this.props.tokens.get(tokenA)?.symbol}</span>
                    <FlexRowSpace />
                    <span style={{ margin: 'auto', paddingRight: '0.3em' }}>
                      {this.state.withdrawPercentage === 0 || this.state.withdrawPercentage === 1 ? null : '~'}
                      {displayHumanizedBalance(
                        new BigNumber(pooledTokenA.replace(/,/g, '')).multipliedBy(this.state.withdrawPercentage),
                      )}
                    </span>
                    {getLogo(tokenA)}
                  </div>
                  <div style={rowStyle}>
                    <span style={{ margin: 'auto' }}>{this.props.tokens.get(tokenB)?.symbol}</span>
                    <FlexRowSpace />
                    <span style={{ margin: 'auto', paddingRight: '0.3em' }}>
                      {this.state.withdrawPercentage === 0 || this.state.withdrawPercentage === 1 ? null : '~'}
                      {displayHumanizedBalance(
                        new BigNumber(pooledTokenB.replace(/,/g, '')).multipliedBy(this.state.withdrawPercentage),
                      )}
                    </span>
                    {getLogo(tokenB)}
                  </div>
                  {!price.isNaN() && (
                    <PriceRow
                      fromToken={this.props.tokens.get(tokenA)?.symbol}
                      toToken={this.props.tokens.get(tokenB)?.symbol}
                      price={price}
                    />
                  )}
                  <div style={rowStyle}>
                    <FlexRowSpace />
                    <Button
                      primary
                      loading={this.state.isLoading}
                      disabled={this.state.isLoading || amountInTokenDenom === '0'}
                      className='withdrawBtn'
                      onClick={async () => {
                        this.setState({ isLoading: true });

                        const { withdrawPercentage } = this.state;

                        try {
                          const result = await this.props.secretjsSender.asyncExecute(
                            selectedPair.liquidity_token,
                            {
                              send: {
                                recipient: selectedPair.contract_addr,
                                amount: amountInTokenDenom,
                                msg: btoa(
                                  JSON.stringify({
                                    withdraw_liquidity: {},
                                  }),
                                ),
                              },
                            },
                            '',
                            [],
                            getFeeForExecute(GAS_FOR_WITHDRAW_LP_FROM_SWAP),
                          );
                          storeTxResultLocally(result);
                          this.props.notify(
                            'success',
                            `Withdrawn ${100 * withdrawPercentage}% from your pooled ${selectedPair.humanizedSymbol()}`,
                          );

                          this.setState({
                            withdrawPercentage: 0,
                          });
                          await this.props.getBalance(selectedPair);
                        } catch (error) {
                          this.props.notify(
                            'error',
                            `Error withdrawing ${100 *
                              withdrawPercentage}% from your pooled ${selectedPair.humanizedSymbol()}: ${
                              error.message
                            }`,
                          );
                          console.error(error);
                        }

                        this.setState({
                          isLoading: false,
                        });
                      }}
                    >
                      Withdraw
                    </Button>
                    <FlexRowSpace />
                  </div>
                </>
              )}
            </div>
          </Accordion.Content>
        </Accordion>
      </Container>
    );
  }
}
