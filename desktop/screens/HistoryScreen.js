import * as React from 'react';
import * as Constants from '~/common/constants';

import { css } from 'react-emotion';
import { CurrentUserContext } from '~/contexts/CurrentUserContext';
import { NavigatorContext } from '~/contexts/NavigationContext';

import UIGameSet from '~/components/reusable/UIGameSet';

const STYLES_CONTAINER = css`
  background: ${Constants.colors.white};
  box-shadow: inset 1px 0 2px -1px rgba(0, 0, 0, 0.5);
  width: 100%;
  height: 100%;
  background: #ffffff;
  overflow-y: scroll;
  ::-webkit-scrollbar {
    display: none;
    width: 1px;
  }
`;

const STYLES_SECTION_TITLE = css`
  font-weight: 900;
  font-family: ${Constants.font.heading};
  font-size: ${Constants.typescale.lvl5};
  margin-bottom: 16px;
  margin-left: 24px;
`;

const STYLES_HISTORY_CONTENT = css`
  margin: 16px 0px 0px 0px;
`;

class HistoryScreen extends React.Component {
  static defaultProps = {
    history: [],
    refreshHistory: async () => {},
  };

  componentDidMount() {
    this.props.refreshHistory();
  }

  _navigateToGame = (game, options) => {
    return this.props.navigateToGame(game, { launchSource: `history`, ...options });
  };

  render() {
    const recentGames = this.props.history
      ? this.props.history.map((historyItem) => {
          return { ...historyItem.game, key: historyItem.userStatusId };
        })
      : [];

    return (
      <div className={STYLES_CONTAINER}>
        <div className={STYLES_HISTORY_CONTENT}>
          <div className={STYLES_SECTION_TITLE}>History</div>
          <UIGameSet
            viewer={this.props.viewer}
            gameItems={recentGames}
            onUserSelect={this.props.navigateToUserProfile}
            onGameSelect={this._navigateToGame}
            onSignInSelect={this.props.navigateToSignIn}
          />
        </div>
      </div>
    );
  }
}

export default class HistoryScreenWithContext extends React.Component {
  render() {
    return (
      <NavigatorContext.Consumer>
        {(navigator) => (
          <CurrentUserContext.Consumer>
            {(currentUser) => (
              <HistoryScreen
                viewer={currentUser ? currentUser.user : null}
                navigateToUserProfile={navigator.navigateToUserProfile}
                navigateToGame={navigator.navigateToGame}
                navigateToSignIn={navigator.navigateToSignIn}
                history={currentUser.userStatusHistory}
                refreshHistory={currentUser.refreshCurrentUser}
                {...this.props}
              />
            )}
          </CurrentUserContext.Consumer>
        )}
      </NavigatorContext.Consumer>
    );
  }
}
