import * as React from 'react';
import * as Constants from '~/common/constants';

import { css } from 'react-emotion';

import UIListMedia from '~/core-components/reusable/UIListMedia';
import UIListPlaylists from '~/core-components/reusable/UIListPlaylists';
import UIEmptyState from '~/core-components/reusable/UIEmptyState';
import UIGridMedia from '~/core-components/reusable/UIGridMedia';

import CoreWelcomeScreen from '~/core-components/CoreWelcomeScreen';

const STYLES_CONTAINER = css`
  @keyframes info-animation {
    from {
      opacity: 0;
    }

    to {
      opacity: 1;
    }
  }

  animation: info-animation 280ms ease;

  width: 100%;
  min-width: 25%;
  height: 100%;
  overflow-y: scroll;
  background ${Constants.colors.background};
  color: ${Constants.colors.white};

  ::-webkit-scrollbar {
    display: none;
    width: 1px;
  }
`;

const STYLES_NO_RESULTS_FEATURED_MEDIA = css`
  padding: 16px 0 0 48px;
`;

export default class CoreBrowseResults extends React.Component {
  static defaultProps = {
    mediaItems: [],
    playlists: [],
  };

  render() {
    if (this.props.isPristine) {
      return (
        <div className={STYLES_CONTAINER}>
          <CoreWelcomeScreen
            onSelectRandom={this.props.onSelectRandom}
            onUserSelect={this.props.onUserSelect}
            onPlaylistSelect={this.props.onPlaylistSelect}
            onMediaSelect={this.props.onMediaSelect}
            allMedia={this.props.allMedia}
            featuredMedia={this.props.featuredMedia}
          />
        </div>
      );
    }

    if (this.props.playlists.length || this.props.mediaItems.length) {
      return (
        <div className={STYLES_CONTAINER}>
          {this.props.playlists.length ? (
            <UIListPlaylists
              playlists={this.props.playlists}
              onUserSelect={this.props.onUserSelect}
              onPlaylistSelect={this.props.onPlaylistSelect}
            />
          ) : null}
          {this.props.mediaItems.length ? (
            <UIListMedia
              mediaItems={this.props.mediaItems}
              onUserSelect={this.props.onUserSelect}
              onMediaSelect={this.props.onMediaSelect}
            />
          ) : null}
        </div>
      );
    }

    return (
      <div className={STYLES_CONTAINER}>
        <UIEmptyState
          title="No media found"
          style={{ borderTop: `1px solid ${Constants.colors.border}` }}>
          We didn't find any games or playlists matching your search. If you're not sure what to
          play, try one of the following games...
        </UIEmptyState>
        <div className={STYLES_NO_RESULTS_FEATURED_MEDIA}>
          <UIGridMedia
            mediaItems={this.props.featuredMedia}
            onMediaSelect={this.props.onMediaSelect}
            />
        </div>
      </div>
    );
  }
}
