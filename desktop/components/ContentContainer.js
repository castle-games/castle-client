import * as React from 'react';
import { css } from 'react-emotion';
import { DevelopmentSetterContext } from '~/contexts/DevelopmentContext';
import { NavigationContext, NavigatorContext } from '~/contexts/NavigationContext';

import * as Constants from '~/common/constants';
import * as Strings from '~/common/strings';
import * as Urls from '~/common/urls';

import GameWindow from '~/native/gamewindow';
import GameScreen from '~/screens/GameScreen';
import HomeScreen from '~/screens/HomeScreen';
import ProfileScreen from '~/screens/ProfileScreen';
import LoginSignupScreen from '~/screens/LoginSignupScreen';
import NotificationScreen from '~/screens/NotificationScreen';
import SearchScreen from '~/screens/SearchScreen';
import ContentNavigationBar from '~/components/ContentNavigationBar';
import NowPlayingBar from '~/components/NowPlayingBar';
import HomeMakeBanner from '~/components/home/HomeMakeBanner';
import HomeUpdateBanner from '~/components/home/HomeUpdateBanner';

const STYLES_CONTAINER = css`
  font-family: ${Constants.font.default};
  background: ${Constants.colors.default};
  width: 100%;
  display: flex;
  flex-direction: column;
`;

class ContentContainer extends React.Component {
  _game;

  static defaultProps = {
    mode: 'home',
    setIsDeveloping: () => {},
  };

  state = {
    searchQuery: '',
    isAddingGame: false,
  };

  componentDidUpdate(prevProps) {
    if (
      this.props.mode === 'game' &&
      this.props.timeGameLoaded !== prevProps.timeGameLoaded &&
      this.props.game
    ) {
      // if we loaded a new game, auto-show logs for local urls
      const isLocal = Urls.isPrivateUrl(this.props.game.url);
      this.props.setIsDeveloping(isLocal);
      this._handleUpdateGameWindowFrame();
    }
  }

  _handleSearchReset = () => {
    this.setState({
      searchQuery: '',
    });
  };

  _handleSearchChange = async (e) => {
    this.setState(
      {
        searchQuery: e.target.value,
      },
      () => {
        if (Strings.isEmpty(this.state.searchQuery)) {
          return this._handleSearchReset();
        }
      }
    );
  };

  _handleSearchSubmit = async (e) => {
    const isCandidate = Strings.isMaybeCastleURL(e.target.value);

    if (!isCandidate) {
      return this._handleSearchChange(e);
    }

    let url = e.target.value;
    try {
      url = url.slice(0).trim();
      if (Urls.isPrivateUrl(url)) {
        url = url.replace('castle://', 'http://');
      }
    } catch (_) {
      //
    }

    this.props.navigator.navigateToGameUrl(url);
    this._handleSearchReset();
  };

  _handleUpdateGameWindowFrame = () => {
    if (!this._game) {
      return;
    }

    const gameScreen = this._game.getScreen();

    if (gameScreen) {
      gameScreen._updateGameWindowFrame();
    }
  };

  updateGameWindowFrame = () => {
    this._handleUpdateGameWindowFrame();
  };

  _renderContent = (mode) => {
    if (mode === 'game') {
      return (
        <GameScreen
          ref={(c) => {
            this._game = c;
          }}
          isDeveloperPaneVisible={this.props.isNowPlayingVisible}
          onFullScreenToggle={this.props.onFullScreenToggle}
        />
      );
    } else if (mode === 'home') {
      return (
        <HomeScreen
          featuredGames={this.props.featuredGames}
          featuredExamples={this.props.featuredExamples}
          timeLastNavigated={this.props.timeLastNavigated}
        />
      );
    } else if (mode === 'profile') {
      return <ProfileScreen />;
    } else if (mode === 'signin') {
      return <LoginSignupScreen />;
    } else if (mode === 'notifications') {
      return <NotificationScreen />;
    }
  };

  _renderSearch = () => {
    return (
      <SearchScreen
        query={this.state.searchQuery}
        allContent={this.props.allContent}
        onSearchReset={this._handleSearchReset}
      />
    );
  };

  render() {
    let contentElement;
    if (Strings.isEmpty(this.state.searchQuery)) {
      contentElement = this._renderContent(this.props.mode);
    } else {
      contentElement = this._renderSearch();
    }

    return (
      <div className={STYLES_CONTAINER}>
        {this.props.mode === 'home' || this.props.mode === 'profile' ? (
          <HomeMakeBanner
            navigator={this.props.navigator}
            navigateToGameUrl={this.props.navigator.navigateToGameUrl}
            navigateToCurrentUserProfile={() =>
              this.props.navigator.navigateToCurrentUserProfile({ isAddingGame: true })
            }
          />
        ) : null}

        {this.props.mode === 'profile' || this.props.mode === 'home' ? (
          <ContentNavigationBar
            searchQuery={this.state.searchQuery}
            onSearchReset={this._handleSearchReset}
            onSearchChange={this._handleSearchChange}
            onSearchSubmit={this._handleSearchSubmit}
          />
        ) : null}
        {contentElement}
        {this.props.game ? (
          <NowPlayingBar
            isVisible={this.props.isNowPlayingVisible}
            onUpdateGameWindowFrame={this._handleUpdateGameWindowFrame}
            onSetDeveloper={this.props.setIsDeveloping}
            onFullScreenToggle={this.props.onFullScreenToggle}
            game={this.props.game}
            mode={this.props.mode}
            navigator={this.props.navigator}
          />
        ) : null}
      </div>
    );
  }
}

export default class ContentContainerWithContext extends React.Component {
  _container;

  updateGameWindowFrame = () => {
    if (!this._container) {
      return;
    }

    this._container.updateGameWindowFrame();
  };

  render() {
    return (
      <DevelopmentSetterContext.Consumer>
        {(development) => (
          <NavigationContext.Consumer>
            {(navigation) => {
              return (
                <NavigatorContext.Consumer>
                  {(navigator) => (
                    <ContentContainer
                      ref={(c) => {
                        this._container = c;
                      }}
                      mode={navigation.contentMode}
                      timeGameLoaded={navigation.timeGameLoaded}
                      timeLastNavigated={navigation.timeLastNavigated}
                      game={navigation.game}
                      navigator={navigator}
                      setIsDeveloping={development.setIsDeveloping}
                      isNowPlayingVisible={this.props.isNowPlayingVisible}
                      {...this.props}
                    />
                  )}
                </NavigatorContext.Consumer>
              );
            }}
          </NavigationContext.Consumer>
        )}
      </DevelopmentSetterContext.Consumer>
    );
  }
}
