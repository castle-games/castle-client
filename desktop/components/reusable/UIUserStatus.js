import * as React from 'react';
import * as Constants from '~/common/constants';
import * as Strings from '~/common/strings';

import { css } from 'react-emotion';

import UserStatus from '~/common/userstatus';

const STYLES_STATUS_LINK = css`
  color: ${Constants.colors.action};
  word-spacing: -0.1rem;
  text-decoration: underline;
  cursor: pointer;
`;

const STYLES_STATUS_UNREGISTERED_TITLE = css`
  word-spacing: -0.1rem;
  color: ${Constants.colors.text2};
`;

export default class UIUserStatus extends React.Component {
  static defaultProps = {
    user: null,
    navigateToGameUrl: (url) => {},
  };

  render() {
    const { user } = this.props;
    let statusElement = null;
    if (user.lastUserStatus && user.lastUserStatus.game) {
      // show last status if it exists and is relevant
      let status = UserStatus.renderStatusText(user.lastUserStatus);
      if (status.status) {
        if (user.lastUserStatus.game.gameId) {
          // link to game if it's registered
          statusElement = (
            <React.Fragment>
              {status.verb}{' '}
              <span
                className={STYLES_STATUS_LINK}
                onClick={() =>
                  this.props.navigateToGameUrl(user.lastUserStatus.game.url, {
                    launchSource: 'user-status',
                  })
                }>
                {status.title}
              </span>
            </React.Fragment>
          );
        } else {
          statusElement = (
            <React.Fragment>
              {status.verb} <span className={STYLES_STATUS_UNREGISTERED_TITLE}>{status.title}</span>
            </React.Fragment>
          );
        }
      }
    }
    if (!statusElement && user.createdTime) {
      // if no relevant or recent status, just show signed up date
      statusElement = `Joined on ${Strings.toDate(user.createdTime)}`;
    }
    return <React.Fragment>{statusElement}</React.Fragment>;
  }
}
