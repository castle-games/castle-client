import * as React from 'react';
import * as Constants from '~/common/constants';

import { css } from 'react-emotion';

import UIControl from '~/core-components/reusable/UIControl';

const STYLES_CONTAINER = css`
  @keyframes header-animation {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  animation: header-animation 280ms ease;

  background: ${Constants.colors.black40};
  color: ${Constants.colors.white};
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  width: 100%;
  padding: 0 16px 0 16px;
  border-bottom: 1px solid ${Constants.colors.white10};
`;

const STYLES_CONTAINER_LEFT = css`
  min-width: 25%;
  width: 100%;
  padding-right: 16px;
  display: flex;
  align-items: center;
`;

const STYLES_CONTAINER_RIGHT = css`
  flex-shrink: 0;
  padding-left: 16px;
  display: flex;
  align-items: center;
`;

export default class CoreRootHeader extends React.Component {
  render() {
    return (
      <div className={STYLES_CONTAINER}>
        <div className={STYLES_CONTAINER_LEFT} />
        <div className={STYLES_CONTAINER_RIGHT}>
          <UIControl onClick={this.props.onToggleCurrentPlaylist}>
            {this.props.playlist.name}
          </UIControl>
        </div>
      </div>
    );
  }
}

/*
export default class CoreRootHeader extends React.Component {
  render() {
    return (
      <div className={STYLES_CONTAINER}>
        <div className={STYLES_CONTAINER_LEFT}>
          {!this.props.viewer ? (
            <UIControl style={{ marginRight: 24 }} onClick={this.props.onToggleAuthentication}>
              Sign In
            </UIControl>
          ) : null}
          {this.props.viewer ? (
            <UIControl style={{ marginRight: 24 }} onClick={this.props.onToggleAuthentication}>
              Sign out
            </UIControl>
          ) : null}
        </div>
        <div className={STYLES_CONTAINER_RIGHT}>
          <UIControl style={{ marginRight: 24 }} onClick={this.props.onToggleCurrentPlaylist}>
            Current Playlist
          </UIControl>
          <UIControl style={{ marginRight: 24 }} onClick={this.props.onToggleDashboard}>
            Dashboard
          </UIControl>
          <UIControl style={{ marginRight: 24 }} onClick={this.props.onToggleMediaInfo}>
            Info
          </UIControl>
          <UIControl onClick={this.props.onToggleScores}>Scores</UIControl>
        </div>
      </div>
    );
  }
}
*/
