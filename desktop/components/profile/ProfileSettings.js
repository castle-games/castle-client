import * as React from 'react';
import * as Actions from '~/common/actions';
import * as Constants from '~/common/constants';
import * as ExperimentalFeatures from '~/common/experimental-features';

import { css } from 'react-emotion';
import { CurrentUserContext } from '~/contexts/CurrentUserContext';

import UICheckbox from '~/components/reusable/UICheckbox';

const STYLES_CONTAINER = css`
  color: ${Constants.colors.black};
  padding: 32px;
  max-width: 768px;
`;

const STYLES_HEADER = css`
  color: ${Constants.colors.text};
  font-family: ${Constants.font.heading};
  font-size: ${Constants.typescale.lvl5};
`;

const STYLES_PARAGRAPH = css`
  color: ${Constants.colors.black};
  font-size: ${Constants.typescale.base};
  line-height: ${Constants.linescale.base};
  margin-top: 16px;
`;

const STYLES_SECTION_TITLE = css`
  font-size: ${Constants.typescale.lvl6};
  font-family: ${Constants.font.heading};
  font-weight: 400;
  margin-top: 32px;
  margin-bottom: 8px;
`;

const STYLES_ROW = css`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 8px;
`;

const STYLES_COLUMN_FLUID = css`
  display: flex;
  justify-content: flex-end;
  color: ${Constants.colors.black};
  font-size: ${Constants.typescale.base};
  line-height: ${Constants.linescale.base};
  min-width: 25%;
  width: 100%;
  padding-right: 48px;
`;

const STYLES_COLUMN = css`
  font-family: ${Constants.font.mono};
  color: ${Constants.colors.black};
  line-height: ${Constants.linescale.base};
  width: 96px;
  font-size: 12px;
  text-transform: uppercase;
  flex-shrink: 0;
`;

const Row = (props) => {
  return (
    <div className={STYLES_ROW}>
      <span className={STYLES_COLUMN_FLUID}>{props.children}</span>
      <span className={STYLES_COLUMN}>{props.firstCol}</span>
      <span className={STYLES_COLUMN}>{props.secondCol}</span>
      <span className={STYLES_COLUMN}>{props.thirdCol}</span>
    </div>
  );
};

export default class ProfileSettings extends React.Component {
  static contextType = CurrentUserContext;

  constructor(props) {
    super(props);

    this.state = {
      stagingGameServersEnabled: ExperimentalFeatures.isEnabled(
        ExperimentalFeatures.STAGING_GAME_SERVERS
      ),
    };
  }

  _handleUpdateEmailDigestFrequency = async (frequency) => {
    await Actions.setNotificationPreferences({
      preferences: {
        emailDigestFrequency: frequency,
      },
    });
    await this.context.refreshCurrentUser();
    this.props.onShowSettings();
  };

  _handleUpdateDesktopChatNotifications = async (type) => {
    await Actions.setNotificationPreferences({
      preferences: {
        desktop: {
          chat: type,
        },
      },
    });
    await this.context.refreshCurrentUser();
    this.props.onShowSettings();
  };

  _handleUpdateDesktopOtherNotifications = async (type) => {
    await Actions.setNotificationPreferences({
      preferences: {
        desktop: {
          other: type,
        },
      },
    });
    await this.context.refreshCurrentUser();
    this.props.onShowSettings();
  };

  _handleToggleStagingGameServers = async () => {
    let stagingGameServersEnabled = !this.state.stagingGameServersEnabled;

    this.setState({
      stagingGameServersEnabled,
    });

    ExperimentalFeatures.setEnabled(
      ExperimentalFeatures.STAGING_GAME_SERVERS,
      stagingGameServersEnabled
    );
  };

  render() {
    const { user, settings } = this.context;
    const { email } = user;
    const { notifications } = settings;

    return (
      <div className={STYLES_CONTAINER}>
        <h2 className={STYLES_HEADER}>Your notifications</h2>

        <p className={STYLES_PARAGRAPH}>Send an email to {email}...</p>
        <Row
          firstCol={<span>Daily</span>}
          secondCol={<span>Weekly</span>}
          thirdCol={<span>Never</span>}
        />
        <Row
          firstCol={
            <UICheckbox
              onClick={() => this._handleUpdateEmailDigestFrequency('daily')}
              value={notifications.emailDigestFrequency === 'daily'}
            />
          }
          secondCol={
            <UICheckbox
              onClick={() => this._handleUpdateEmailDigestFrequency('weekly')}
              value={notifications.emailDigestFrequency === 'weekly'}
            />
          }
          thirdCol={
            <UICheckbox
              onClick={() => this._handleUpdateEmailDigestFrequency('never')}
              value={notifications.emailDigestFrequency === 'never'}
            />
          }>
          With unread activity
        </Row>

        <p className={STYLES_PARAGRAPH}>Show a desktop notification...</p>
        <Row
          firstCol={<span>Mentions</span>}
          secondCol={<span>All</span>}
          thirdCol={<span>None</span>}
        />
        <Row
          firstCol={
            <UICheckbox
              onClick={() => this._handleUpdateDesktopChatNotifications('tag')}
              value={notifications.desktop.chat === 'tag'}
            />
          }
          secondCol={
            <UICheckbox
              onClick={() => this._handleUpdateDesktopChatNotifications('all')}
              value={notifications.desktop.chat === 'all'}
            />
          }
          thirdCol={
            <UICheckbox
              onClick={() => this._handleUpdateDesktopChatNotifications('none')}
              value={notifications.desktop.chat === 'none'}
            />
          }>
          For chat messages
        </Row>

        <Row firstCol={<span>Enabled</span>} secondCol={<span>Disabled</span>} />
        <Row
          firstCol={
            <UICheckbox
              onClick={() => this._handleUpdateDesktopOtherNotifications('enabled')}
              value={notifications.desktop.other === 'enabled'}
            />
          }
          secondCol={
            <UICheckbox
              onClick={() => this._handleUpdateDesktopOtherNotifications('disabled')}
              value={notifications.desktop.other === 'disabled'}
            />
          }>
          For other activity
        </Row>

        <h2 className={STYLES_HEADER} style={{ paddingTop: 50 }}>
          Developer Options
        </h2>

        <p className={STYLES_PARAGRAPH} style={{ paddingBottom: 20 }}>
          Advanced developer options. Most people should not need these.
        </p>

        <Row
          firstCol={
            <UICheckbox
              onClick={this._handleToggleStagingGameServers}
              value={this.state.stagingGameServersEnabled}
            />
          }>
          Enable staging game servers
        </Row>
      </div>
    );
  }
}
