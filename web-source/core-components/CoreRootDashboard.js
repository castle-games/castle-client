import * as React from 'react';
import * as Constants from '~/common/constants';

import { css } from 'react-emotion';

import UIListMediaInPlaylist from '~/core-components/reusable/UIListMediaInPlaylist';
import UIHeaderDismiss from '~/core-components/reusable/UIHeaderDismiss';
import UIEmptyState from '~/core-components/reusable/UIEmptyState';
import UIControl from '~/core-components/reusable/UIControl';

const STYLES_CONTAINER = css`
  @keyframes dashboard-animation {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  animation: dashboard-animation 280ms ease;

  width: 420px;
  height: 100%;
  overflow-y: scroll;
  background ${Constants.colors.background};
  border-left: 1px solid ${Constants.colors.border};

  ::-webkit-scrollbar {
    display: none;
    width: 1px;
  }
`;

export default class CoreRootDashboard extends React.Component {
  render() {
    const data = this.props.storage.getItem('history');

    if (!data) {
      return (
        <div className={STYLES_CONTAINER}>
          <UIHeaderDismiss onDismiss={this.props.onDismiss} />
          <UIEmptyState title="History">
            As you play different Media using Castle, the last 10 links you visited will appear
            here.
          </UIEmptyState>
        </div>
      );
    }

    const { history } = JSON.parse(data);
    if (!history || !history.length) {
      return (
        <div className={STYLES_CONTAINER}>
          <UIHeaderDismiss onDismiss={this.props.onDismiss} />
          <UIEmptyState title="History">
            As you play different Media using Castle, the last 10 links you visited will appear
            here.
          </UIEmptyState>
        </div>
      );
    }

    return (
      <div className={STYLES_CONTAINER}>
        <UIHeaderDismiss onDismiss={this.props.onDismiss}>
          <UIControl onClick={this.props.onClearHistory}>Clear History</UIControl>
        </UIHeaderDismiss>
        <UIEmptyState title="History">Here is a history of the media you have played.</UIEmptyState>
        <UIListMediaInPlaylist
          media={this.props.media}
          onMediaSelect={this.props.onMediaSelect}
          onUserSelect={this.props.onUserSelect}
          mediaItems={history}
        />
      </div>
    );
  }
}
