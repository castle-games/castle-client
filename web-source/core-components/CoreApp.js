import * as React from 'react';
import * as Fixtures from '~/common/fixtures';

import { css } from 'react-emotion';
import { isKeyHotkey } from 'is-hotkey';

import CoreLayout from '~/core-components/layouts/CoreLayout';
import CoreLayoutOverlay from '~/core-components/layouts/CoreLayoutOverlay';
import CoreMediaScreen from '~/core-components/CoreMediaScreen';
import CoreBrowserHeader from '~/core-components/CoreBrowserHeader';
import CoreBrowserURLInput from '~/core-components/CoreBrowserURLInput';
import CoreNavigationSidebar from '~/core-components/CoreNavigationSidebar';
import CoreGameInfo from '~/core-components/CoreGameInfo';
import CoreUserDashboard from '~/core-components/CoreUserDashboard';
import CoreScoreInfo from '~/core-components/CoreScoreInfo';
import CoreToolbar from '~/core-components/CoreToolbar';

const isOverlayHotkey = isKeyHotkey('mod+e');

export default class CoreApp extends React.Component {
  constructor(props) {
    super();

    this.state = props.state;
  }

  componentDidMount() {
    window.addEventListener('keydown', this._handleKeyDown);
  }

  componentWillUnmount() {
    window.removeEventListener('keydown', this._handleKeyDown);
  }

  _handleKeyDown = e => {
    if (isOverlayHotkey(e)) {
      return this._handleToggleOverlay();
    }
  };

  _handleToggleAuthentication = () =>
    this.setState({ viewer: this.state.viewer ? null : Fixtures.User });

  _handleToggleEntityFavorite = () => {};

  _handleURLChange = e => this.setState({ [e.target.name]: e.target.value });

  _handleURLSubmit = e => window.alert(this.state.url);

  _handleToggleSearch = () => window.alert('search');

  _handleToggleProfile = () => window.alert('profile');

  _handleToggleScore = () => this.setState({ isScoreVisible: !this.state.isScoreVisible });

  _handleToggleDashboard = () =>
    this.setState({
      isMediaInfoVisible: false,
      isDashboardVisible: !this.state.isDashboardVisible,
    });

  _handleToggleMediaInfo = () =>
    this.setState({
      isMediaInfoVisible: !this.state.isMediaInfoVisible,
      isDashboardVisible: false,
    });

  _handleNextMedia = () => window.alert('next');

  _handlePreviousMedia = () => window.alert('previous');

  _handleRandomMedia = () => window.alert('random');

  _handleRegisterGame = () => window.alert('register');

  _handleFavoriteMedia = () => window.alert('favorite');

  _handleHideOverlay = () => this.setState({ isOverlayActive: false });

  _handleToggleOverlay = () => this.setState({ isOverlayActive: !this.state.isOverlayActive });

  _handleToggleMediaExpanded = () =>
    this.setState({ isMediaExpanded: !this.state.isMediaExpanded });

  _handleShareScores = () => window.alert('score share');

  render() {
    // NOTE(jim): For example purposes, state can be stubbed out from anywhere.
    const { state } = this;

    let maybeBottomNode;
    if (state.isOverlayActive) {
      maybeBottomNode = (
        <CoreBrowserURLInput
          name="url"
          value={state.url}
          viewer={state.viewer}
          onURLChange={this._handleURLChange}
          onURLSubmit={this._handleURLSubmit}
          onToggleDashboard={this._handleToggleDashboard}
          onToggleEntityFavorite={this._handleToggleEntityFavorite}
        />
      );
    }

    let maybeTopNode;
    if (state.isOverlayActive) {
      maybeTopNode = (
        <CoreBrowserHeader
          viewer={state.viewer}
          onToggleAuthentication={this._handleToggleAuthentication}
          onToggleMediaInfo={this._handleToggleMediaInfo}
          onToggleScores={this._handleToggleScore}
        />
      );
    }

    let maybeLeftSidebarNode;
    if (state.isOverlayActive && state.viewer) {
      maybeLeftSidebarNode = (
        <CoreNavigationSidebar
          viewer={state.viewer}
          onToggleProfile={this._handleToggleProfile}
          onToggleSearch={this._handleToggleSearch}
        />
      );
    }

    let maybeRightSidebarNode;
    if (state.isOverlayActive && state.isScoreVisible) {
      maybeRightSidebarNode = <CoreScoreInfo onShareScores={this._handleShareScores} />;
    }

    let maybeRightNode;
    if (state.isOverlayActive && state.isMediaInfoVisible) {
      maybeRightNode = (
        <CoreGameInfo
          onRegisterMedia={this._handleRegisterGame}
          onNextMedia={this._handleNextMedia}
          onRandomMedia={this._handleRandomMedia}
          onPreviousMedia={this._handlePreviousMedia}
        />
      );
    }

    if (state.isOverlayActive && state.isDashboardVisible) {
      maybeRightNode = (
        <CoreUserDashboard
          onNextMedia={this._handleNextMedia}
          onRandomMedia={this._handleRandomMedia}
          onPreviousMedia={this._handlePreviousMedia}
        />
      );
    }

    let maybeToolbarNode;
    if (state.isOverlayActive) {
      maybeToolbarNode = (
        <CoreToolbar
          expanded={state.isMediaExpanded}
          onToggleMediaExpanded={this._handleToggleMediaExpanded}
          onHideOverlay={this._handleHideOverlay}
          onFavoriteMedia={this._handleFavoriteMedia}
        />
      );
    }

    if (state.isOverlayLayout) {
      return (
        <CoreLayoutOverlay
          topNode={maybeTopNode}
          bottomNode={maybeBottomNode}
          toolbarNode={maybeToolbarNode}
          leftSidebarNode={maybeLeftSidebarNode}
          rightSidebarNode={maybeRightSidebarNode}
          rightNode={maybeRightNode}>
          <CoreMediaScreen expanded={state.isMediaExpanded} />
        </CoreLayoutOverlay>
      );
    }

    return (
      <CoreLayout
        topNode={maybeTopNode}
        bottomNode={maybeBottomNode}
        toolbarNode={maybeToolbarNode}
        leftSidebarNode={maybeLeftSidebarNode}
        rightSidebarNode={maybeRightSidebarNode}
        rightNode={maybeRightNode}>
        <CoreMediaScreen expanded={state.isMediaExpanded} />
      </CoreLayout>
    );
  }
}
