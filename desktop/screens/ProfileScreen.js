import * as React from 'react';
import * as Actions from '~/common/actions';
import * as Constants from '~/common/constants';
import * as SVG from '~/components/primitives/svg';

import { css } from 'react-emotion';

import UIButton from '~/components/reusable/UIButton';
import UIHorizontalNavigation from '~/components/reusable/UIHorizontalNavigation';
import UIEmptyState from '~/components/reusable/UIEmptyState';

import EditProfile from '~/components/profile/EditProfile';
import RegisterGame from '~/components/profile/RegisterGame';
import UIGameGrid from '~/components/reusable/UIGameGrid';
import { CurrentUserContext } from '~/contexts/CurrentUserContext';
import { NavigationContext, NavigatorContext } from '~/contexts/NavigationContext';
import ProfileHeader from '~/components/profile/ProfileHeader';
import ProfileSettings from '~/components/profile/ProfileSettings';
import SignOut from '~/components/profile/SignOut';

const STYLES_CONTAINER = css`
  width: 100%;
  min-width: 25%;
  height: 100%;
  overflow-y: scroll;
  color: ${Constants.colors.text};
  background: ${Constants.colors.background};

  ::-webkit-scrollbar {
    display: none;
    width: 1px;
  }
`;

const STYLES_GAME_GRID = css``;

class ProfileScreen extends React.Component {
  static defaultProps = {
    creator: null,
    viewer: null,
    onAfterSave: () => {},
    navigateToGame: async (game) => {},
    navigateToGameUrl: async (url) => {},
    navigateToUserProfile: (user) => {},
  };
  state = {
    mode: this.props.options.mode,
  };

  componentWillReceiveProps(nextProps) {
    const existingUserId =
      this.props.creator && this.props.creator.userId ? this.props.creator.userId : null;
    const nextUserId =
      nextProps.creator && nextProps.creator.userId ? nextProps.creator.userId : null;
    if (nextUserId != existingUserId) {
      // we're rendering a new profile, reset state.
      this._onShowGames();
    }

    if (nextProps.options && nextProps.options.mode) {
      this.setState({ mode: nextProps.options.mode });
    }
  }

  _onShowGames = () => this.setState({ mode: 'games' });
  _onShowAddGame = () => this.setState({ mode: 'add-game' });
  _onShowEditProfile = () => this.setState({ mode: 'edit-profile' });
  _onShowSignOut = () => this.setState({ mode: 'sign-out' });
  _onShowSettings = () => this.setState({ mode: 'settings' });

  _onAfterAddGame = () => {
    // after adding a game, back out to the full list of games
    this._onShowGames();
    this.props.onAfterSave();
  };

  _getNavigationItems = (isOwnProfile) => {
    let navigationItems = [{ label: 'Games', key: 'games' }];

    if (isOwnProfile) {
      navigationItems.push({ label: 'Add game', key: 'add-game' });
      navigationItems.push({ label: 'Edit Profile', key: 'edit-profile' });
      navigationItems.push({ label: 'Settings', key: 'settings' });
      navigationItems.push({ label: 'Sign Out', key: 'sign-out' });
    }

    return navigationItems;
  };

  _onNavigationChange = (selectedKey) => {
    const callbacks = {
      games: this._onShowGames,
      'add-game': this._onShowAddGame,
      'edit-profile': this._onShowEditProfile,
      'sign-out': this._onShowSignOut,
      settings: this._onShowSettings,
    };

    if (callbacks.hasOwnProperty(selectedKey)) {
      callbacks[selectedKey]();
    }
  };

  _updateGame = async (game) => {
    let updatedGame;
    try {
      updatedGame = await Actions.updateGameAtUrl(game.url);
    } catch (e) {
      updatedGame = {};
    }
    if (updatedGame && updatedGame.gameId) {
      this.props.onAfterSave();
    }
  };

  _renderGameContent = (isOwnProfile, viewer, creator) => {
    return creator.gameItems && creator.gameItems.length ? (
      <div className={STYLES_GAME_GRID}>
        <UIGameGrid
          renderCartridgeOnly
          viewer={viewer}
          creator={creator}
          gameItems={creator.gameItems}
          onGameSelect={this.props.navigateToGame}
          onGameUpdate={isOwnProfile ? this._updateGame : null}
        />
      </div>
    ) : (
      <UIEmptyState title="No games yet">
        {isOwnProfile
          ? 'You have not added any games to your profile yet.'
          : 'This user has not added any games to their profile yet.'}
      </UIEmptyState>
    );
  };

  _renderAddGame = (isOwnProfile) => {
    if (!isOwnProfile) return null;

    return <RegisterGame onAfterSave={this._onAfterAddGame} />;
  };

  _renderEditProfileContent = (isOwnProfile, user) => {
    if (!isOwnProfile) return null;

    return <EditProfile user={user} onAfterSave={this.props.onAfterSave} />;
  };

  _renderSettings = (isOwnProfile, user) => {
    if (!isOwnProfile) return null;

    return <ProfileSettings user={user} />;
  };

  _renderSignOutContent = (isOwnProfile) => {
    if (!isOwnProfile) return null;
    return <SignOut onSignOut={this.props.onSignOut} />;
  };

  render() {
    const { viewer, creator } = this.props;
    const isOwnProfile = viewer && viewer.userId == creator.userId;

    let profileContentElement;
    const { mode } = this.state;

    if (mode === 'edit-profile') {
      profileContentElement = this._renderEditProfileContent(isOwnProfile, viewer);
    } else if (mode === 'add-game') {
      profileContentElement = this._renderAddGame(isOwnProfile);
    } else if (mode === 'sign-out') {
      profileContentElement = this._renderSignOutContent(isOwnProfile);
    } else if (mode === 'settings') {
      profileContentElement = this._renderSettings(isOwnProfile, viewer);
    } else {
      profileContentElement = this._renderGameContent(isOwnProfile, viewer, creator);
    }

    return (
      <div className={STYLES_CONTAINER}>
        <ProfileHeader
          creator={creator}
          isOwnProfile={isOwnProfile}
          navigateToGameUrl={this.props.navigateToGameUrl}
        />
        <UIHorizontalNavigation
          items={this._getNavigationItems(isOwnProfile)}
          selectedKey={this.state.mode}
          onChange={this._onNavigationChange}
        />
        {profileContentElement}
      </div>
    );
  }
}

export default class ProfileScreenWithContext extends React.Component {
  _renderProfile = (navigator, navigation, currentUser) => {
    return (
      <ProfileScreen
        navigateToGame={navigator.navigateToGame}
        navigateToGameUrl={navigator.navigateToGameUrl}
        navigateToUserProfile={navigator.navigateToUserProfile}
        viewer={currentUser.user}
        creator={navigation.userProfileShown}
        options={navigation.options ? navigation.options : { mode: 'games' }}
        onSignOut={currentUser.clearCurrentUser}
        onAfterSave={currentUser.refreshCurrentUser}
      />
    );
  };

  render() {
    return (
      <NavigatorContext.Consumer>
        {(navigator) => (
          <NavigationContext.Consumer>
            {(navigation) => (
              <CurrentUserContext.Consumer>
                {(currentUser) => this._renderProfile(navigator, navigation, currentUser)}
              </CurrentUserContext.Consumer>
            )}
          </NavigationContext.Consumer>
        )}
      </NavigatorContext.Consumer>
    );
  }
}
