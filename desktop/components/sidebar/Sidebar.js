import * as React from 'react';
import * as Actions from '~/common/actions';
import * as ChatUtilities from '~/common/chat-utilities';
import * as Constants from '~/common/constants';

import { css } from 'react-emotion';

import { CurrentUserContext } from '~/contexts/CurrentUserContext';
import { NavigatorContext, NavigationContext } from '~/contexts/NavigationContext';
import { UserPresenceContext } from '~/contexts/UserPresenceContext';
import { ChatContext } from '~/contexts/ChatContext';

import SidebarChannels from '~/components/sidebar/SidebarChannels';
import SidebarDirectMessages from '~/components/sidebar/SidebarDirectMessages';
import SidebarGroupChannelItem from '~/components/sidebar/SidebarGroupChannelItem';
import SidebarHeader from '~/components/sidebar/SidebarHeader';
import SidebarNavigationItem from '~/components/sidebar/SidebarNavigationItem';
import SidebarOptions from '~/components/sidebar/SidebarOptions';
import SidebarOptionsMessages from '~/components/sidebar/SidebarOptionsMessages';
import SidebarProjects from '~/components/sidebar/SidebarProjects';

// NOTE(jim): Legacy.
import HomeUpdateBanner from '~/components/HomeUpdateBanner';

const STYLES_CONTAINER = css`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  width: ${Constants.sidebar.width};
  min-width: 10%;
  height: 100vh;
  flex-shrink: 0;
  transition: 200ms ease width;
`;

const STYLES_SIDEBAR = css`
  width: 100%;
  height: 100%;
  flex-shrink: 0;
  background: ${Constants.REFACTOR_COLORS.elements.channels};
  overflow-y: scroll;
  overflow-wrap: break-word;

  ::-webkit-scrollbar {
    display: none;
  }
`;

const STYLES_SECTION = css`
  margin-bottom: 8px;
`;

class Sidebar extends React.Component {
  state = {
    value: '',
    mode: 'DEFAULT',
  };

  componentDidMount() {
    const { currentUser } = this.props;
    currentUser.refreshCurrentUser();
  }

  _filterGameChannels = (channel) => channel.isSubscribed && channel.type === 'game';

  _handleSignIn = () => {
    return this.props.navigator.navigateToSignIn();
  };

  _handleSignOut = () => {
    this.props.currentUser.clearCurrentUser();
    this.setState({ mode: 'DEFAULT' });
  };

  _handleNavigateToChat = async (channel) => {
    this.props.navigator.navigateToChat({ channelId: channel.channelId });
    return this.setState({ mode: 'DEFAULT' });
  };

  _handleNavigateToMakeGame = () => {
    return this.props.navigator.navigateToCreate();
  };

  _handleNavigateToExamples = () => {
    return this.props.navigator.navigateToContentMode('examples');
  };

  _handleNavigateToGames = () => {
    return this.props.navigator.navigateToContentMode('home');
  };

  _handleShowOptions = () => this.setState({ mode: 'OPTIONS' });

  _handleShowDirectMessageOptions = () => this.setState({ mode: 'OPTIONS_MESSAGES' });

  _handleHideOptions = () => this.setState({ mode: 'DEFAULT' });

  _handleCreateDirectMessage = async (user) => {
    this.props.chat.openChannelForUser(user);
    this._handleHideOptions();
  };

  _handleOpenChannel = async (name) => {
    this.props.chat.openChannelWithName(name);
    this._handleHideOptions();
  };

  _renderUpdateBanner = () => {
    return this.props.updateAvailable ? (
      <HomeUpdateBanner
        updateAvailable={this.props.updateAvailable}
        onNativeUpdateInstall={this.props.onNativeUpdateInstall}
      />
    ) : null;
  };

  _renderRootSidebar = () => {
    const { navigator, currentUser, userPresence, chat } = this.props;
    const { chatChannelId, contentMode } = this.props;
    const viewer = currentUser.user;
    const isChatVisible = contentMode === 'chat';

    const header = (
      <SidebarHeader
        viewer={viewer}
        navigator={navigator}
        onShowOptions={this._handleShowOptions}
        onSignIn={this._handleSignIn}
        onSignOut={this._handleSignOut}
      />
    );

    if (!viewer) {
      return <div className={STYLES_SIDEBAR}>{header}</div>;
    }

    let lobbyChannel,
      isLobbySelected = false,
      numUsersOnline = 0;
    try {
      lobbyChannel = chat.findChannel(ChatUtilities.EVERYONE_CHANNEL_NAME);
      if (lobbyChannel) {
        isLobbySelected = contentMode === 'chat' && chatChannelId === lobbyChannel.channelId;
        numUsersOnline = chat.channelOnlineCounts[lobbyChannel.channelId];
      }
    } catch (_) {}

    return (
      <div className={STYLES_SIDEBAR}>
        {this._renderUpdateBanner()}
        {header}
        <div className={STYLES_SECTION}>
          <SidebarNavigationItem
            name="Play"
            svg="home"
            onClick={this._handleNavigateToGames}
            active={contentMode === 'home'}
          />
          <SidebarChannels
            selectedChannelId={chatChannelId}
            userStatusHistory={currentUser.userStatusHistory}
            isChatVisible={isChatVisible}
            channels={chat.channels}
            filterChannel={this._filterGameChannels}
            onSelectChannel={this._handleNavigateToChat}
          />
        </div>
        <div className={STYLES_SECTION}>
          <SidebarNavigationItem
            name="Create"
            svg="make"
            onClick={this._handleNavigateToMakeGame}
            active={contentMode === 'create'}
          />
          <SidebarProjects
            title="Recently Created"
            userStatusHistory={currentUser.userStatusHistory}
            onSelectGameUrl={navigator.navigateToGameUrl}
          />
        </div>
        <div className={STYLES_SECTION}>
          <SidebarNavigationItem
            name="Chat"
            svg="chat"
            onClick={() => this._handleNavigateToChat(lobbyChannel)}
          />
          <SidebarGroupChannelItem
            numMembersOnline={numUsersOnline}
            channel={lobbyChannel}
            userPresence={userPresence}
            isSelected={isLobbySelected}
            onClick={() => this._handleNavigateToChat(lobbyChannel)}
          />
          <SidebarDirectMessages
            selectedChannelId={chatChannelId}
            viewer={viewer}
            userPresence={userPresence}
            isChatVisible={isChatVisible}
            channels={chat.channels}
            onSelectChannel={this._handleNavigateToChat}
            onSendMessage={this._handleCreateDirectMessage}
          />
        </div>
      </div>
    );
  };

  _renderOptions = () => {
    const { currentUser } = this.props;

    return (
      <div className={STYLES_SIDEBAR}>
        <SidebarOptions onDismiss={this._handleHideOptions} onSignOut={this._handleSignOut} />
      </div>
    );
  };

  _renderMessageOptions = () => {
    const { currentUser, userPresence } = this.props;

    return (
      <div className={STYLES_SIDEBAR}>
        <SidebarOptionsMessages
          viewer={currentUser.user}
          userPresence={userPresence}
          onDismiss={this._handleHideOptions}
          onSendMessage={this._handleCreateDirectMessage}
        />
      </div>
    );
  };

  _renderChannelOptions = () => {
    const { currentUser, chat } = this.props;

    return (
      <div className={STYLES_SIDEBAR}>
        <SidebarOptionsChannels
          viewer={currentUser.user}
          channels={chat.channels}
          onDismiss={this._handleHideOptions}
          onOpenChannel={this._handleOpenChannel}
        />
      </div>
    );
  };

  render() {
    const { mode } = this.state;
    const { contentMode } = this.props;
    if (contentMode === 'game') {
      return null;
    }

    let sidebarElement;
    switch (mode) {
      case 'OPTIONS':
        sidebarElement = this._renderOptions();
        break;
      case 'OPTIONS_MESSAGES':
        sidebarElement = this._renderMessageOptions();
      default:
        sidebarElement = this._renderRootSidebar();
    }

    return <div className={STYLES_CONTAINER}>{sidebarElement}</div>;
  }
}

export default class SidebarWithContext extends React.Component {
  render() {
    return (
      <CurrentUserContext.Consumer>
        {(currentUser) => (
          <UserPresenceContext.Consumer>
            {(userPresence) => (
              <ChatContext.Consumer>
                {(chat) => (
                  <NavigationContext.Consumer>
                    {(navigation) => (
                      <NavigatorContext.Consumer>
                        {(navigator) => (
                          <Sidebar
                            currentUser={currentUser}
                            navigator={navigator}
                            contentMode={navigation.contentMode}
                            chatChannelId={navigation.chatChannelId}
                            userPresence={userPresence}
                            chat={chat}
                            updateAvailable={this.props.updateAvailable}
                            onNativeUpdateInstall={this.props.onNativeUpdateInstall}
                          />
                        )}
                      </NavigatorContext.Consumer>
                    )}
                  </NavigationContext.Consumer>
                )}
              </ChatContext.Consumer>
            )}
          </UserPresenceContext.Consumer>
        )}
      </CurrentUserContext.Consumer>
    );
  }
}
