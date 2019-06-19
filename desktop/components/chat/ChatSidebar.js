import * as React from 'react';
import * as SVG from '~/common/svg';
import * as Strings from '~/common/strings';
import * as Constants from '~/common/constants';
import * as NativeUtil from '~/native/nativeutil';
import * as ChatActions from '~/common/actions-chat';

import { css } from 'react-emotion';

import { ConnectionStatus } from 'castle-chat-lib';
import { CurrentUserContext } from '~/contexts/CurrentUserContext';
import { SocialContext } from '~/contexts/SocialContext';
import { NavigatorContext, NavigationContext } from '~/contexts/NavigationContext';
import { ChatSessionContext } from '~/contexts/ChatSessionContext';

import ChatMessages from '~/components/chat/ChatMessages';
import ChatInput from '~/components/chat/ChatInput';

const STYLES_CONTAINER_BASE = css`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  flex-direction: column;
  width: 100%;
  min-width: 10%;
  height: 100%;
  background: rgb(0, 0, 0);
`;

class ChatSidebar extends React.Component {
  state = {
    value: '',
    mode: 'MESSAGES',
  };

  async componentDidUpdate(prevProps) {
    if (prevProps.navigation.game.title !== this.props.navigation.game.title) {
      await this._handleJoinGameChannel();
    }
  }

  async componentDidMount() {
    await this._handleJoinGameChannel();
  }

  _handleJoinGameChannel = async () => {
    if (!this.props.navigation.game) {
      return;
    }

    const response = await ChatActions.createChatChannel({
      name: this.props.navigation.game.title,
    });

    await this.props.social.refreshChannelData();

    if (!response || response.errors) {
      const error = response.errors[0];
      if (error) {
        if (error.extensions.code === 'CHANNEL_NAME_ALREADY_EXISTS') {
          const channel = this.props.social.allChatChannels.find((c) => {
            return c.name === this.props.navigation.game.title;
          });

          if (channel) {
            await this.props.chat.handleConnectGameContext(channel);
          }
        }
      }
      return;
    }

    if (response.data && response.data.createChatChannel) {
      this.props.chat.handleConnectGameContext(response.data.createChatChannel);
    }
  };

  _handleChange = (e) => {
    this.setState({ [e.target.name]: e.target.value });
  };

  _handleKeyDown = (e) => {
    if (e.which === 13 && !e.shiftKey) {
      event.preventDefault();
      if (Strings.isEmpty(this.state.value.trim())) {
        return;
      }

      this.props.chat.handleSendChannelMessage(this.state.value);
      this.setState({ value: '' });
    }
  };

  render() {
    const { mode } = this.state;

    if (!this.props.navigation.game) {
      return null;
    }

    if (this.props.navigation.isFullScreen) {
      return null;
    }

    if (!this.props.chat.channel) {
      return <div className={STYLES_CONTAINER_BASE} />;
    }

    let messages = [];
    if (this.props.chat.channel && this.props.chat.messages[this.props.chat.channel.channelId]) {
      messages = this.props.chat.messages[this.props.chat.channel.channelId];
    }

    return (
      <div className={STYLES_CONTAINER_BASE}>
        <ChatMessages
          messages={messages}
          chat={this.props.chat}
          navigator={this.props.navigator}
          social={this.props.social}
          theme={{ textColor: Constants.colors.white }}
        />
        <ChatInput
          value={this.state.value}
          name="value"
          placeholder="Type a message"
          onChange={this._handleChange}
          onKeyDown={this._handleKeyDown}
          theme={{ textColor: Constants.colors.white }}
        />
      </div>
    );
  }
}

export default class ChatSidebarWithContext extends React.Component {
  render() {
    return (
      <CurrentUserContext.Consumer>
        {(currentUser) => {
          return (
            <SocialContext.Consumer>
              {(social) => {
                return (
                  <ChatSessionContext.Consumer>
                    {(chat) => {
                      return (
                        <NavigationContext.Consumer>
                          {(navigation) => {
                            return (
                              <NavigatorContext.Consumer>
                                {(navigator) => (
                                  <ChatSidebar
                                    viewer={currentUser.user}
                                    currentUser={currentUser}
                                    navigator={navigator}
                                    navigation={navigation}
                                    social={social}
                                    chat={chat}
                                  />
                                )}
                              </NavigatorContext.Consumer>
                            );
                          }}
                        </NavigationContext.Consumer>
                      );
                    }}
                  </ChatSessionContext.Consumer>
                );
              }}
            </SocialContext.Consumer>
          );
        }}
      </CurrentUserContext.Consumer>
    );
  }
}
