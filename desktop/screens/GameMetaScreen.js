import * as React from 'react';
import * as Actions from '~/common/actions';
import * as Constants from '~/common/constants';

import { css } from 'react-emotion';
import { ChatContext } from '~/contexts/ChatContext';
import { NavigatorContext, NavigationContext } from '~/contexts/NavigationContext';
import { UserPresenceContext } from '~/contexts/UserPresenceContext';

import ChatMembers from '~/components/chat/ChatMembers';
import GameMetaHeader from '~/components/gamemeta/GameMetaHeader';
import UIHorizontalNavigation from '~/components/reusable/UIHorizontalNavigation';

const STYLES_CONTAINER = css`
  width: 100%;
  min-width: 10
  background: ${Constants.colors.white};
  height: 100%;
  overflow-y: scroll;
  ::-webkit-scrollbar {
    display: none;
    width: 1px;
  }
  display: flex;
  align-items: center;
  justify-content: flex-start;
  flex-direction: column;
`;

class GameMetaScreen extends React.Component {
  state = {
    game: null,
    mode: 'members',
  };

  componentDidUpdate(prevProps, prevState) {
    this._update(prevProps, prevState);
  }

  componentDidMount() {
    this._mounted = true;
    this._update(null, null);
  }

  componentWillUnmount() {
    this._mounted = false;
  }

  _update = async (prevProps, prevState) => {
    const { chat, channelId } = this.props;
    if (chat) {
      chat.markChannelRead(channelId);
    }
    if (!prevProps || prevProps.channelId !== channelId) {
      // clear prev state
      let updates = { mode: 'members' };
      if (this.state.game) {
        updates.game = null;
      }
      await this.setState(updates);
      const channel = chat.channels[channelId];
      if (channel.type === 'game' && channel.gameId) {
        try {
          let game = await Actions.getGameByGameId(channel.gameId);
          this.setState({ game });
        } catch (_) {}
      }
    }
  };

  _getNavigationItems = () => {
    let items = [];
    const numChannelMembers = this.props.chat.channelOnlineCounts[this.props.channelId];
    items.push({ label: `People Online (${numChannelMembers})`, key: 'members' });
    return items;
  };

  _handleNavigationChange = (selectedKey) => {
    this.setState({ mode: selectedKey });
  };

  _handleLeaveChannel = async () => {
    this.props.chat.closeChannel(this.props.channelId);
    this.props.navigator.navigateToHome();
  };

  _handleOpenDirectMessage = (user) => {
    this.props.chat.openChannelForUser(user);
  };

  _renderContent = (channel, mode) => {
    switch (mode) {
      case 'members':
      default:
        return (
          <ChatMembers
            userIds={channel.subscribedUsers.map((user) => user.userId)}
            onSendMessage={this._handleOpenDirectMessage}
          />
        );
    }
  };

  render() {
    const { game, mode } = this.state;

    if (!this.props.channelId) {
      return null;
    }

    const channel = this.props.chat.channels[this.props.channelId];

    return (
      <div className={STYLES_CONTAINER}>
        <div
          className={css`
            width: 768px;
            max-width: 768px;
            margin-top: 24px;
          `}>
          <GameMetaHeader
            game={game}
            onSelectGame={this.props.navigator.navigateToGame}
            onSelectUser={this.props.navigator.navigateToUserProfile}
            onLeaveChannel={this._handleLeaveChannel}
          />
          <div
            className={css`
              display: block;
              width: 100%;
            `}>
            <UIHorizontalNavigation
              items={this._getNavigationItems()}
              onChange={this._handleNavigationChange}
              selectedKey={mode}
              style={{ borderBottom: `2px solid #ececec`, width: '100%' }}
            />
            {this._renderContent(channel, mode)}
          </div>
        </div>
      </div>
    );
  }
}

export default class GameMetaScreenWithContext extends React.Component {
  render() {
    return (
      <UserPresenceContext.Consumer>
        {(userPresence) => (
          <ChatContext.Consumer>
            {(chat) => (
              <NavigationContext.Consumer>
                {(navigation) => (
                  <NavigatorContext.Consumer>
                    {(navigator) => (
                      <GameMetaScreen
                        navigator={navigator}
                        channelId={navigation.gameMetaChannelId}
                        userIdToUser={userPresence.userIdToUser}
                        chat={chat}
                      />
                    )}
                  </NavigatorContext.Consumer>
                )}
              </NavigationContext.Consumer>
            )}
          </ChatContext.Consumer>
        )}
      </UserPresenceContext.Consumer>
    );
  }
}
