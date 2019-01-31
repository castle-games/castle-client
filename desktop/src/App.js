import * as React from 'react';
import { css } from 'react-emotion';
import { isKeyHotkey } from 'is-hotkey';

import * as Actions from '~/common/actions';
import * as Browser from '~/common/browser';
import * as Constants from '~/common/constants';
import { CurrentUserContext } from '~/contexts/CurrentUserContext';
import { DevelopmentContext } from '~/contexts/DevelopmentContext';
import { History, HistoryContext } from '~/contexts/HistoryContext';
import Logs from '~/common/logs';
import { NavigationContext } from '~/contexts/NavigationContext';
import * as NativeUtil from '~/native/nativeutil';
import * as Strings from '~/common/strings';

import ContentContainer from '~/components/ContentContainer.js';
import SocialContainer from '~/components/SocialContainer.js';

const isReloadHotkey = isKeyHotkey('mod+r');
const isFullscreenHotkey = isKeyHotkey('mod+f');
const isDevelopmentHotkey = isKeyHotkey('mod+j');

const NATIVE_CHANNELS_POLL_INTERVAL = 300;

const STYLES_CONTAINER = css`
  font-family: ${Constants.font.default};
  background: ${Constants.colors.background};
  height: 100vh;
  width: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
  display: flex;
`;

export default class App extends React.Component {
  _nativeChannelsPollTimeout;

  constructor(props) {
    super();

    this.state = props.state;
    this.state.navigation.navigateToHome = this.navigateToHome;
    this.state.navigation.navigateToGameUrl = this.navigateToGameUrl;
    this.state.navigation.navigateToGame = this.navigateToGame;
    this.state.navigation.navigateToCurrentGame = this.navigateToCurrentGame;
    this.state.navigation.navigateToCurrentUserProfile = this.navigateToCurrentUserProfile;
    this.state.navigation.navigateToUserProfile = this.navigateToUserProfile;
    this.state.navigation.navigateToHistory = this.navigateToHistory;
    this.state.currentUser.setCurrentUser = this.setCurrentUser;
    this.state.currentUser.clearCurrentUser = this.clearCurrentUser;
    this.state.currentUser.refreshCurrentUser = this.refreshCurrentUser;
    this.state.development.setIsDeveloping = this.setIsDeveloping;
    this.state.development.clearLogs = this.clearLogs;
    this.state.history = new History(props.storage);
  }

  componentDidMount() {
    window.addEventListener('nativeOpenUrl', this._handleNativeOpenUrlEvent);
    window.addEventListener('keydown', this._handleKeyDownEvent);
    window.addEventListener('CASTLE_SYSTEM_KEY_PRESSED', this._handleLuaSystemKeyDownEvent);

    NativeUtil.setBrowserReady(() => {
      this._processNativeChannels();
    });
  }
  
  componentWillUnmount() {
    window.removeEventListener('nativeOpenUrl', this._handleNativeOpenUrlEvent);
    window.removeEventListener('keydown', this._handleKeyDownEvent);
    window.removeEventListener('CASTLE_SYSTEM_KEY_PRESSED', this._handleLuaSystemKeyDownEvent);
    window.clearTimeout(this._nativeChannelsPollTimeout);
  }

  // interface with lua channels
  _processNativeChannels = async () => {
    await NativeUtil.readLogChannelsAsync();
    const logs = Logs.consume();

    if (logs && logs.length) {
      this.setState({
        development: {
          ...this.state.development,
          logs: [...this.state.development.logs, ...logs]
        },
      });
    }
  
    this._nativeChannelsPollTimeout = window.setTimeout(
      this._processNativeChannels,
      NATIVE_CHANNELS_POLL_INTERVAL
    );
  };

  // event listeners
  _handleNativeOpenUrlEvent = (e) => {
    this.navigateToGameUrl(e.params.url);
  };

  _handleLuaSystemKeyDownEvent = async (e) => {
    await Actions.delay(50);
    this._handleKeyDownEvent({ ...e.params, preventDefault() {} });
  };

  _handleKeyDownEvent = (e) => {
    if (isReloadHotkey(e)) {
      return this.reload(e);
    }
    if (isFullscreenHotkey(e)) {
      (async () => {
        NativeUtil.setWindowFrameFullscreen(!(await NativeUtil.getWindowFrameFullscreen()));
      })();
      return;
    }
    if (isDevelopmentHotkey(e)) {
      return this.setIsDeveloping(!this.state.development.isDeveloping);
    }
  };

  reload = async (e) => {
    if (e) {
      e.preventDefault();
    }
    await Actions.delay(100);
    this.navigateToGameUrl(this.state.navigation.game.url);
  };

  // load game
  _loadGameAsync = async (game) => {
    let { url } = game;
    if (Strings.isEmpty(url)) {
      return;
    }
    const time = Date.now();
    this.setState({
      navigation: {
        ...this.state.navigation,
        contentMode: 'game',
        game,
        gameUrl: url,
        timeGameLoaded: time,
        timeLastNavigated: time,
      },
    });
  };

  // navigation actions
  navigateToHome = () => {
    this.setState({
      navigation: {
        ...this.state.navigation,
        contentMode: 'home',
        timeLastNavigated: Date.now(),
      },
    });
  }

  navigateToCurrentGame = () => {
    if (!this.state.navigation.game) {
      throw new Error(`Cannot navigate to current game because there is no current game.`);
    }
    this.setState({
      navigation: {
        ...this.state.navigation,
        contentMode: 'game',
        timeLastNavigated: Date.now(),
      }
    });
  };

  navigateToGameUrl = async (gameUrl) => {
    let game;
    try {
      game = await Browser.resolveGameAtUrlAsync(gameUrl);
    } catch (e) {
      // forward this error to the user
      // Logs.error(e.message);
    }

    if (game && game.url) {
      this._loadGameAsync(game);
    } else {
      // TODO: an error happened, surface it
    }
  };

  navigateToGame = (game) => {
    if (!game || Strings.isEmpty(game.url)) {
      return;
    }
    if (game.gameId) {
      // this is a known game object, not an abstract url request
      this._loadGameAsync(game);
    } else {
      // this is an incomplete game object, so try to resolve it before loading
      this.navigateToGameUrl(game.url);
    }
  };

  navigateToCurrentUserProfile = () => {
    if (this.state.currentUser.user) {
      this.navigateToUserProfile(this.state.currentUser.user);
      this.refreshCurrentUser();
    } else {
      // show sign in
      this.setState({
        navigation: ({
          ...this.state.navigation,
          contentMode: 'signin',
          timeLastNavigated: Date.now(),
        }),
      });
    }
  };

  navigateToUserProfile = (user) => {
    this.setState({
      navigation: {
        ...this.state.navigation,
        contentMode: 'profile',
        userProfileShown: user,
        timeLastNavigated: Date.now(),
      },
    });
  };

  navigateToHistory = () => {
    this.setState({
      navigation: {
        ...this.state.navigation,
        contentMode: 'history',
        timeLastNavigated: Date.now(),
      },
    });
  };

  // currentUser actions
  setCurrentUser = (user) => {
    this.setState({
      currentUser: {
        ...this.state.currentUser,
        user,
      },
    }, () => {
      if (user) {
        this.navigateToCurrentUserProfile();
      } else {
        this.navigateToHome();
      }
    });
  }

  clearCurrentUser = () => {
    if (!Actions.logout()) {
      return;
    }
    this.setState({
      currentUser: {
        ...this.state.currentUser,
        user: null,
      },
    }, () => {
      this.navigateToCurrentUserProfile();
    });
  }

  refreshCurrentUser = async () => {
    const viewer = await Actions.getViewer();
    if (!viewer) {
      return;
    }
    const updates = {
      currentUser: {
        ...this.state.currentUser,
        user: viewer,
      },
    };
    const userProfileShown = this.state.navigation.userProfileShown;
    if (viewer && userProfileShown && viewer.userId === userProfileShown.userId) {
      updates.navigation = {
        ...this.state.navigation,
        userProfileShown: viewer,
      };
    }
    this.setState(updates);
  }

  // development actions
  setIsDeveloping = (isDeveloping) => {
    this.setState({
      development: {
        ...this.state.development,
        isDeveloping,
      }
    });
  };

  clearLogs = () => {
    this.setState({
      development: {
        ...this.state.development,
        logs: [],
      }
    });
  };

  render() {
    return (
      <NavigationContext.Provider value={this.state.navigation}>
        <CurrentUserContext.Provider value={this.state.currentUser}>
          <HistoryContext.Provider value={this.state.history}>
            <DevelopmentContext.Provider value={this.state.development}>
              <div className={STYLES_CONTAINER}>
                <SocialContainer />
                <ContentContainer
                  featuredGames={this.state.featuredGames}
                  allContent={this.state.allContent}
                />
              </div>
            </DevelopmentContext.Provider>
          </HistoryContext.Provider>
        </CurrentUserContext.Provider>
      </NavigationContext.Provider>
    );
  }
};
