import * as React from 'react';
import * as Constants from '~/common/constants';

import { css } from 'react-emotion';
import { CurrentUserContext } from '~/contexts/CurrentUserContext';
import { NavigatorContext } from '~/contexts/NavigationContext';

import GamesHomeScreen from '~/screens/GamesHomeScreen';
import UIGameGrid from '~/components/reusable/UIGameGrid';

const STYLES_CONTAINER = css`
  background: ${Constants.colors.background};
  width: 100%;
  height: 100%;
  padding-bottom: 64px;

  overflow-y: scroll;
  ::-webkit-scrollbar {
    display: none;
    width: 1px;
  }
`;

const STYLES_MODAL = css`
  position: absolute;
  background: red;
`;

class HomeScreen extends React.Component {

  static defaultProps = {
    trendingGames: [],
    gamesUnderConstruction: [],
    newestGames: [],
    randomGames: [],
    featuredExamples: [],
    history: [],
    refreshHistory: async () => {},
  };

  state = {
    gameInfoToShow: null,
  };

  componentDidMount() {
    this.props.refreshHistory();
  }

  _navigateToGame = (game, options) => {
    return this.props.navigateToGame(game, { launchSource: `home-${this.props.mode}`, ...options });
  };

  render() {
    const { mode } = this.props;
    const recentGames = this.props.history
      ? this.props.history.map((historyItem) => {
          return { ...historyItem.game, key: historyItem.userStatusId };
        })
      : [];

    return (
      <div className={STYLES_CONTAINER}>
        {mode === 'posts' ? (
          <UIPostList
            viewer={this.props.viewer}
            onUserSelect={this.props.navigateToUserProfile}
            onGameSelect={this._navigateToGame}
            onSignInSelect={this.props.navigateToSignIn}
          />
        ) : null}
        {mode === 'home' ? (
          <GamesHomeScreen
            {...this.props}
          />
        ) : null}
        {mode === 'examples' ? (
          <UIGameGrid
            viewer={this.props.viewer}
            gameItems={this.props.featuredExamples}
            onUserSelect={this.props.navigateToUserProfile}
            onGameSelect={this._navigateToGame}
            onSignInSelect={this.props.navigateToSignIn}
          />
        ) : null}
        {mode === 'history' ? (
          <UIGameGrid
            viewer={this.props.viewer}
            gameItems={recentGames}
            onUserSelect={this.props.navigateToUserProfile}
            onGameSelect={this._navigateToGame}
            onSignInSelect={this.props.navigateToSignIn}
          />
        ) : null}
      </div>
    );
  }
}

export default class HomeScreenWithContext extends React.Component {
  render() {
    return (
      <NavigatorContext.Consumer>
        {(navigator) => (
          <CurrentUserContext.Consumer>
            {(currentUser) => (
              <HomeScreen
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
