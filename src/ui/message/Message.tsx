import React, { useState } from 'react'
import './styles.scss';
import { Link } from 'react-router-dom';
import { useStores } from 'stores';

const MessageDismiss = () => {
  const { theme } = useStores();
  const [visible, setVisible] = useState(false);

  const handleDismiss = (e) => {
    e.preventDefault();
    setVisible(false);
  };

  return (
    <>
      {
        visible ?
          <div className={`messsage-body ${theme.currentTheme}`}>
            <div className="message-content">
              <p className="header">🚨SEFI staking pool has been upgraded to support <a href="https://scrt.network/blog/sefi-governance-live-mainnet-private-voting">governance</a>!🚨</p>
              <p className="subtitle">
                <Link to={"/migration"}>Migrate your tokens</Link> to continue earning.
              </p>
            </div>
            <div className="close-content">
              <a onClick={(e) => handleDismiss(e)}>
                <img src="/static/close.svg" alt="close icon" />
              </a>
            </div>
          </div>
          : null
      }
    </>
  );
}

export default MessageDismiss;
