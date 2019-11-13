import * as React from 'react';
import * as Constants from '~/common/constants';

import { css } from 'react-emotion';
import { UserPresenceContext } from '~/contexts/UserPresenceContext';

const STYLES_CONTAINER = css`
  display: inline-flex;
`;

const STYLES_INDICATOR_CONTAINER = css`
  width: 12px;
  height: 12px;
  margin: 2px 4px 2px 0;
  border-radius: 6px;
`;

class UIUserStatusIndicator extends React.Component {
  _renderIndicator = (isOnline, isAnonymous) => {
    // offline
    let indicatorStyle = { border: `2px solid ${Constants.colors.userStatus.offline}` };
    if (isOnline) {
      const color = isAnonymous
        ? Constants.colors.userStatus.guest
        : Constants.colors.userStatus.online;
      indicatorStyle = {
        border: `2px solid ${color}`,
        background: color,
      };
    }
    return <div className={STYLES_INDICATOR_CONTAINER} style={indicatorStyle} />;
  };

  render() {
    const { user } = this.props;
    const isOnline = user.userId && this.props.userPresence.onlineUserIds[user.userId];
    const isAnonymous = user.isAnonymous;
    return (
      <div className={STYLES_CONTAINER} style={{ ...this.props.style }}>
        {this._renderIndicator(isOnline, isAnonymous)}
      </div>
    );
  }
}

export default class UIUserStatusIndicatorWithContext extends React.Component {
  render() {
    return (
      <UserPresenceContext.Consumer>
        {(userPresence) => <UIUserStatusIndicator userPresence={userPresence} {...this.props} />}
      </UserPresenceContext.Consumer>
    );
  }
}
