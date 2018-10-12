import * as React from 'react';
import * as Strings from '~/common/strings';
import * as Utilities from '~/common/utilities';
import * as ReactDOM from 'react-dom';
import * as Fixtures from '~/common/fixtures';
import * as Slack from '~/common/slack';
import * as Actions from '~/common/actions';
import * as CEF from '~/common/cef';

import { css } from 'react-emotion';
import { isKeyHotkey } from 'is-hotkey';

// NOTE(jim): Reusable layout component.
import CoreLayout from '~/core-components/layouts/CoreLayout';

// NOTE(jim): Root Components
import CoreRootHeader from '~/core-components/CoreRootHeader';
import CoreRootURLInput from '~/core-components/CoreRootURLInput';
import CoreRootLeftSidebar from '~/core-components/CoreRootLeftSidebar';
import CoreRootDashboard from '~/core-components/CoreRootDashboard';
import CoreRootToolbar from '~/core-components/CoreRootToolbar';
import CoreRootPlaylistSidebar from '~/core-components/CoreRootPlaylistSidebar';
import CoreSignIn from '~/core-components/CoreSignIn';

// NOTE(jim): Media Scene
import CoreMediaScreen from '~/core-components/CoreMediaScreen';
import CoreMediaInformation from '~/core-components/CoreMediaInformation';

// NOTE(jim): Browse Scene
import CoreBrowsePlaylistResults from '~/core-components/CoreBrowsePlaylistResults';
import CoreBrowseMediaResults from '~/core-components/CoreBrowseMediaResults';
import CoreBrowseSearchInput from '~/core-components/CoreBrowseSearchInput';

// NOTE(jim): Profile Scene
import CoreProfile from '~/core-components/CoreProfile';
import CoreProfileSidebar from '~/core-components/CoreProfileSidebar';

// NOTE(jim): Playlist Scene
import CorePlaylist from '~/core-components/CorePlaylist';

// NOTE(jim): Development Logs Scene
import CoreDevelopmentLogs from '~/core-components/CoreDevelopmentLogs';

const isOverlayHotkey = isKeyHotkey('mod+e');
const isDevelopmentLogHotkey = isKeyHotkey('mod+j');
const POLL_DELAY = 300;
const ENABLE_HIDE_OVERLAY = false;

const delay = ms =>
  new Promise(resolve => {
    window.setTimeout(resolve, ms);
  });

// NOTES(jim):
// + Assigning creator to `null` whenever `pageMode` changes is dangerous.
//   We may want to think of an enumeration to represent that state.
export default class CoreApp extends React.Component {
  _layout;
  _devTimeout;
  _isLockedFromCEFUpdates = true;

  constructor(props) {
    super();

    this.state = props.state;
  }

  async componentDidMount() {
    window.addEventListener('nativeOpenUrl', this._handleNativeOpenUrl);
    window.addEventListener('keydown', this._handleKeyDown);

    const processChannels = async () => {
      const logs = await CEF.getLogs();

      this.setState({ logs: [...this.state.logs, ...logs] });
      this._devTimeout = window.setTimeout(processChannels, POLL_DELAY);
    };

    CEF.setBrowserReady(() => {
      this._handleCEFupdateFrame();
      processChannels();
    });
  }

  componentWillUnmount() {
    window.removeEventListener('nativeOpenUrl', this._handleNativeOpenUrl);
    window.removeEventListener('keydown', this._handleKeyDown);
    window.clearTimeout(this._devTimeout);
  }

  closeCEF = () => {
    if (this._isLockedFromCEFUpdates) {
      console.log('closeCEF: already locked');
      return;
    }

    this._isLockedFromCEFUpdates = true;
    CEF.closeWindowFrame();
  };

  openCEF = url => {
    if (!this._isLockedFromCEFUpdates) {
      console.log('openCEF: is not closed');
      return;
    }

    this._isLockedFromCEFUpdates = false;
    CEF.openWindowFrame(url);
  };

  _handleCEFupdateFrame = () => {
    if (this._isLockedFromCEFUpdates) {
      return;
    }

    const element = this._layout.getMediaContainerRef();
    const rect = element.getBoundingClientRect();
    CEF.updateWindowFrame(rect);
  };

  _handleSetHistory = media => {
    if (!this.props.storage) {
      alert('History is not supported at the moment.');
      return;
    }

    let data = this.props.storage.getItem('history');

    // TODO(jim): Sync this with your profile if you're logged in.
    if (!data) {
      console.log('Setting up your local viewing history.');
      this.props.storage.setItem('history', JSON.stringify({ history: [] }));
    }

    data = this.props.storage.getItem('history');
    if (!data) {
      alert('History is not supported at the moment.');
      return;
    }

    let { history } = JSON.parse(data);
    if (!history) {
      return;
    }

    history = history.filter(h => h.mediaUrl !== media.mediaUrl);

    history.unshift(media);
    this.props.storage.setItem('history', JSON.stringify({ history }));

    if (history.length > 10) {
      history.pop();
    }
  };

  _handleMediaAdd = async data => {
    const response = await Actions.addMedia(data);
    if (!response) {
      return;
    }

    const mediaItems = [...this.state.creator.mediaItems];
    mediaItems.unshift(response);
    const updates = { ...this.state.creator, mediaItems };
    this.setState({
      viewer: { ...updates },
      creator: { ...updates },
      profileMode: 'media',
    });
  };

  _handleMediaRemove = async data => {
    const response = await Actions.removeMedia(data);
    if (!response) {
      return;
    }

    const mediaItems = this.state.creator.mediaItems.filter(
      item => item.mediaId !== response.mediaId
    );
    const updates = { ...this.state.creator, mediaItems };
    this.setState({
      viewer: { ...updates },
      creator: { ...updates },
      profileMode: 'media',
    });
  };

  _handlePlaylistAdd = async data => {
    const response = await Actions.addPlaylist(data);
    if (!response) {
      return;
    }

    const playlists = [...this.state.creator.playlists];
    playlists.unshift(response);
    const updates = { ...this.state.creator, playlists };
    this.setState({
      creator: { ...updates },
      viewer: { ...updates },
      profileMode: 'playlists',
    });
  };

  _handlePlaylistRemove = async data => {
    const response = await Actions.removePlaylist(data);
    if (!response) {
      return;
    }

    const playlists = this.state.creator.playlists.filter(
      item => item.playlistId !== response.playlistId
    );
    const updates = { ...this.state.creator, playlists };
    this.setState({
      creator: { ...updates },
      viewer: { ...updates },
      profileMode: 'playlists',
    });
  };

  setStateWithCEF = (state, callback) => {
    if (this._isLockedFromCEFUpdates) {
      return this.setState({ ...state }, () => {
        if (callback) {
          callback();
        }
      });
    }

    this.setState({ ...state }, () => {
      this._handleCEFupdateFrame();

      if (callback) {
        callback();
      }
    });
  };

  _handleSetViewer = viewer => this.setState({ viewer, pageMode: viewer ? 'browse' : 'sign-in' });

  _handleURLChange = e => this.setState({ [e.target.name]: e.target.value });

  _handleURLSubmit = () => {
    if (Strings.isEmpty(this.state.mediaUrl)) {
      alert('You must provide a URL');
      return;
    }

    if (this.state.mediaUrl.endsWith('.lua')) {
      this.goToLUA(this.state.mediaUrl);
      return;
    }

    this.goToHTML5Media({ mediaUrl: this.state.mediaUrl });
  };

  goToHTML5Media = async media => {
    this.closeCEF();

    const existingMedia = await Actions.getMediaByURL({ mediaUrl });

    this._handleSetHistory(existingMedia ? existingMedia : media);

    this.setStateWithCEF({
      media: existingMedia ? existingMedia : media,
      mediaUrl: media.mediaUrl,
      pageMode: null,
      creator: null,
    });
  };

  goToLUA = async mediaUrl => {
    if (Strings.isEmpty(mediaUrl)) {
      return;
    }

    this.closeCEF();

    this.setState({ media: null });

    // NOTE(jim): Nice way of saying setTimeout.
    await delay(200);

    const media = await Actions.getMediaByURL({ mediaUrl });

    this.openCEF(mediaUrl);
    this._handleSetHistory(media ? media : { mediaUrl });
    this.setStateWithCEF({
      media: media ? media : { mediaUrl },
      mediaUrl,
      pageMode: null,
      creator: null,
    });
  };

  _handleNativeOpenUrl = e => {
    let { params } = e;
    let { url } = params;

    if (Strings.isEmpty(url)) {
      return;
    }

    url = url.replace('castle://', 'https://');
    this.setState({ media: null, mediaUrl: url }, () => {
      this._handleURLSubmit();
    });
  };

  _handleKeyDown = e => {
    if (isOverlayHotkey(e) && ENALBE_HIDE_OVERLAY) {
      return this._handleToggleOverlay();
    }

    if (isDevelopmentLogHotkey(e)) {
      return this._handleToggleDevelopmentLogs();
    }
  };

  _handleSearchSubmit = async () => {
    if (Strings.isEmpty(this.state.searchQuery)) {
      alert('You must provide a search query.');
      return;
    }

    const data = await Actions.search(this.state.searchQuery);
    if (!data) {
      this.setState({
        searchResultsMedia: [],
        searchResultsPlaylist: [],
      });
      return;
    }

    const { mediaItems = [], playlists = [] } = data;
    this.setState({
      searchResultsMedia: mediaItems,
      searchResultsPlaylist: playlists,
    });
  };

  _handleSearchChange = async e => {
    this.setState({
      searchQuery: e.target.value,
    });
  };

  _handleRegisterGame = ({ email, message }) => {
    // TODO(jim): Handle this better
    if (Strings.isEmpty(email)) {
      return;
    }

    // TODO(jim): Handle this better
    if (Strings.isEmpty(message)) {
      return;
    }

    const emailUrl = `<mailto:${email}|${email}>`;
    Slack.sendMessage(`*${emailUrl} who is playing "${this.state.mediaUrl}" said:*\n ${message}`);
  };

  _handleFavoriteMedia = () => window.alert('favorite');

  _handlePlaylistSelect = playlist => {
    if (!this.state.pageMode) {
      this.closeCEF();
    }

    this.setStateWithCEF({
      pageMode: 'playlist',
      creator: null,
      playlist,
      media: null,
    });
  };

  _handleUserSelect = async user => {
    if (!user) {
      return;
    }

    const creator = await Actions.getUser(user);

    if (!creator) {
      return;
    }

    if (!this.state.pageMode) {
      this.closeCEF();
    }

    this.setStateWithCEF({ pageMode: 'profile', creator });
  };

  _handleMediaSelect = media => {
    if (!media) {
      return;
    }

    if (Strings.isEmpty(media.mediaUrl)) {
      console.error('handleMediaSelect: no media url provided on entity');
      return;
    }

    if (media.mediaUrl.endsWith('.lua')) {
      this.goToLUA(media.mediaUrl);
      return;
    }

    this.goToHTML5Media(media);
  };

  _handleSelectRandom = () => {
    // TODO(jim): Oh man.
    if (!this.state.playlist) {
      return;
    }

    if (!this.state.playlist.mediaItems) {
      return;
    }

    if (!this.state.playlist.mediaItems.length) {
      return;
    }

    const max = this.state.playlist.mediaItems.length;
    const min = 1;

    const index = Utilities.getRandomInt(min, max);
    this._handleMediaSelect(this.state.playlist.mediaItems[index]);
  };

  determineNextStateOfCEF = ({ isClosing, isOpening, mediaUrl }) => {
    if (isClosing) {
      this.closeCEF();
      return;
    }

    if (!isOpening) {
      return;
    }

    // NOTE(jim): Restores the dead state.
    if (!Strings.isEmpty(mediaUrl)) {
      if (mediaUrl.endsWith('.lua')) {
        this.openCEF(mediaUrl);
      }
    }
  };

  _handleToggleProfile = () => {
    const updates = {
      pageMode: this.state.pageMode === 'profile' ? null : 'profile',
      creator: this.state.pageMode === 'profile' ? null : { ...this.state.viewer },
    };

    this.determineNextStateOfCEF({
      isClosing: !Strings.isEmpty(updates.pageMode),
      isOpening: Strings.isEmpty(updates.pageMode),
      mediaUrl: this.state.mediaUrl,
    });

    this.setStateWithCEF({ ...updates });
  };

  _handleToggleBrowse = () => {
    const updates = {
      pageMode: this.state.pageMode === 'browse' ? null : 'browse',
      creator: null,
    };

    this.determineNextStateOfCEF({
      isClosing: !Strings.isEmpty(updates.pageMode),
      isOpening: Strings.isEmpty(updates.pageMode),
      mediaUrl: this.state.mediaUrl,
    });

    this.setStateWithCEF({
      ...updates,
    });
  };

  _handleToggleSignIn = () => {
    const updates = {
      pageMode: this.state.pageMode === 'sign-in' ? null : 'sign-in',
      creator: null,
    };

    this.determineNextStateOfCEF({
      isClosing: !Strings.isEmpty(updates.pageMode),
      isOpening: Strings.isEmpty(updates.pageMode),
      mediaUrl: this.state.mediaUrl,
    });

    this.setStateWithCEF({ ...updates });
  };

  _handleToggleCurrentPlaylistDetails = () => {
    const updates = {
      pageMode: this.state.pageMode === 'playlist' ? null : 'playlist',
      creator: null,
    };

    this.determineNextStateOfCEF({
      isClosing: !Strings.isEmpty(updates.pageMode),
      isOpening: Strings.isEmpty(updates.pageMode),
      mediaUrl: this.state.mediaUrl,
    });

    this.setStateWithCEF({
      ...updates,
    });
  };

  _handleToggleCurrentPlaylist = () => {
    const updates = {
      pageMode: null,
      creator: null,
      sidebarMode: this.state.sidebarMode === 'current-playlist' ? null : 'current-playlist',
    };

    this.determineNextStateOfCEF({
      isClosing: false,
      isOpening: !Strings.isEmpty(this.state.pageMode),
      mediaUrl: this.state.mediaUrl,
    });

    this.setStateWithCEF({
      ...updates,
    });
  };

  _handleToggleDashboard = () => {
    const updates = {
      sidebarMode: this.state.sidebarMode === 'dashboard' ? null : 'dashboard',
      pageMode: null,
      creator: null,
    };

    this.determineNextStateOfCEF({
      isClosing: false,
      isOpening: !Strings.isEmpty(this.state.pageMode),
      mediaUrl: this.state.mediaUrl,
    });

    this.setStateWithCEF({
      ...updates,
    });
  };

  _handleToggleDevelopmentLogs = () => {
    const updates = {
      sidebarMode: this.state.sidebarMode === 'development' ? null : 'development',
      pageMode: null,
      creator: null,
    };

    this.determineNextStateOfCEF({
      isClosing: false,
      isOpening: !Strings.isEmpty(this.state.pageMode),
      mediaUrl: this.state.mediaUrl,
    });

    this.setStateWithCEF({
      ...updates,
    });
  };

  _handleToggleMediaInfo = () => {
    const updates = {
      sidebarMode: this.state.sidebarMode === 'media-info' ? null : 'media-info',
      pageMode: null,
      creator: null,
    };

    this.determineNextStateOfCEF({
      isClosing: false,
      isOpening: !Strings.isEmpty(this.state.pageMode),
      mediaUrl: this.state.mediaUrl,
    });

    this.setStateWithCEF({
      ...updates,
    });
  };

  _handleShowProfileMediaList = () => {
    this.setStateWithCEF({
      profileMode: 'media',
    });
  };

  _handleShowProfilePlaylistList = () =>
    this.setStateWithCEF({
      profileMode: 'playlists',
    });

  _handleSignOut = () => {
    const confirm = window.confirm('Are you sure you want to sign out?');

    if (!confirm) {
      return;
    }

    if (!Actions.logout()) {
      return;
    }

    this.determineNextStateOfCEF({
      isClosing: true,
      isOpening: false,
    });

    this.setStateWithCEF({
      viewer: null,
      creator: null,
      pageMode: 'browse',
    });
  };

  _handleDismissSidebar = () => this.setStateWithCEF({ sidebarMode: null });

  _handleHideOverlay = () => {
    const updates = {
      isOverlayActive: false,
      pageMode: null,
    };

    this.determineNextStateOfCEF({
      isClosing: false,
      isOpening: !Strings.isEmpty(this.state.pageMode),
      mediaUrl: this.state.mediaUrl,
    });

    this.setStateWithCEF({ ...updates });
  };

  _handleToggleOverlay = () => {
    const updates = {
      isOverlayActive: !this.state.isOverlayActive,
      pageMode: null,
    };

    this.determineNextStateOfCEF({
      isClosing: false,
      isOpening: !Strings.isEmpty(this.state.pageMode),
      mediaUrl: this.state.mediaUrl,
    });

    this.setStateWithCEF({
      ...updates,
    });
  };

  _handleToggleMediaExpanded = () => {
    const updates = {
      isMediaExpanded: !this.state.isMediaExpanded,
      pageMode: null,
    };

    this.determineNextStateOfCEF({
      isClosing: false,
      isOpening: !Strings.isEmpty(this.state.pageMode),
      mediaUrl: this.state.mediaUrl,
    });

    this.setStateWithCEF({ ...updates });
  };

  _handleGetReference = reference => {
    this._layout = reference;
  };

  renderRootURLInput = () => (
    <CoreRootURLInput
      name="mediaUrl"
      placeholder="Type in a Lua/LÖVE main.lua file URL or HTML URL..."
      value={this.state.mediaUrl}
      viewer={this.state.viewer}
      media={this.state.media}
      expanded={this.state.isMediaExpanded}
      onChange={this._handleURLChange}
      onSubmit={this._handleURLSubmit}
      onToggleMediaExpanded={this._handleToggleMediaExpanded}
      onHideOverlay={this._handleHideOverlay}
      onFavoriteMedia={this._handleFavoriteMedia}
      onToggleDashboard={this._handleToggleDashboard}
    />
  );

  render() {
    const { state } = this;

    let maybeLeftSidebarNode;
    if (state.isOverlayActive) {
      maybeLeftSidebarNode = (
        <CoreRootLeftSidebar
          viewer={state.viewer}
          isBrowsing={state.pageMode === 'browse'}
          isSignIn={state.pageMode === 'sign-in'}
          isViewingProfile={state.pageMode === 'profile'}
          onToggleProfile={this._handleToggleProfile}
          onToggleBrowse={this._handleToggleBrowse}
          onToggleSignIn={this._handleToggleSignIn}
          onSignOut={this._handleSignOut}
        />
      );
    }

    // NOTE(jim): Browse/Search Scene
    if (state.pageMode === 'browse') {
      return (
        <CoreLayout
          ref={this._handleGetReference}
          topNode={
            <CoreBrowseSearchInput
              searchQuery={state.searchQuery}
              onChange={this._handleSearchChange}
              onSubmit={this._handleSearchSubmit}
            />
          }
          rightSidebarNode={
            <CoreBrowsePlaylistResults
              playlists={state.searchResultsPlaylist}
              onPlaylistSelect={this._handlePlaylistSelect}
              onUserSelect={this._handleUserSelect}
              onDismiss={this._handleToggleBrowse}
            />
          }
          bottomNode={this.renderRootURLInput()}
          leftSidebarNode={maybeLeftSidebarNode}>
          <CoreBrowseMediaResults
            mediaItems={state.searchResultsMedia}
            onUserSelect={this._handleUserSelect}
            onMediaSelect={this._handleMediaSelect}
            onSelectRandom={this._handleSelectRandom}
            onToggleCurrentPlaylist={this._handleToggleCurrentPlaylist}
          />
        </CoreLayout>
      );
    }

    // NOTE(jim): Sign in scene
    if (state.pageMode === 'sign-in') {
      return (
        <CoreLayout
          ref={this._handleGetReference}
          bottomNode={this.renderRootURLInput()}
          leftSidebarNode={maybeLeftSidebarNode}>
          <CoreSignIn onSetViewer={this._handleSetViewer} />
        </CoreLayout>
      );
    }

    // NOTE(jim): Playlist Scene
    if (state.pageMode === 'playlist') {
      return (
        <CoreLayout
          ref={reference => {
            this._layout = reference;
          }}
          leftSidebarNode={maybeLeftSidebarNode}>
          <CorePlaylist
            viewer={state.viewer}
            playlist={state.playlist}
            onUserSelect={this._handleUserSelect}
            onMediaSelect={this._handleMediaSelect}
            onMediaRemove={this._handleRemoveMedia}
            onDismiss={this._handleToggleCurrentPlaylistDetails}
          />
        </CoreLayout>
      );
    }

    // NOTE(jim): Profile Scene
    if (state.pageMode === 'profile') {
      return (
        <CoreLayout
          ref={this._handleGetReference}
          leftSidebarNode={maybeLeftSidebarNode}
          rightNode={
            state.viewer && state.creator && state.viewer.userId === state.creator.userId ? (
              <CoreProfileSidebar
                onMediaAdd={this._handleMediaAdd}
                onPlaylistAdd={this._handlePlaylistAdd}
              />
            ) : null
          }>
          <CoreProfile
            viewer={state.viewer}
            creator={state.creator}
            profileMode={state.profileMode}
            onDismiss={this._handleToggleProfile}
            onShowProfileMediaList={this._handleShowProfileMediaList}
            onShowProfilePlaylistList={this._handleShowProfilePlaylistList}
            onPlayCreatorMedia={this._handlePlayCreatorMedia}
            onSubscribeToCreator={this._handleSubscribeToCreator}
            onClickCreatorAvatar={this._handleClickCreatorAvatar}
            onClickCreatorCreations={() => this.setState({ profileMode: 'media' })}
            onClickCreatorPlaylists={() => this.setState({ profileMode: 'playlists' })}
            onMediaSelect={this._handleMediaSelect}
            onMediaRemove={this._handleMediaRemove}
            onPlaylistSelect={this._handlePlaylistSelect}
            onPlaylistRemove={this._handlePlaylistRemove}
            onUserSelect={this._handleUserSelect}
          />
        </CoreLayout>
      );
    }

    let maybeBottomNode;
    if (state.isOverlayActive) {
      maybeBottomNode = this.renderRootURLInput();
    }

    let maybeTopNode;
    if (state.isOverlayActive) {
      maybeTopNode = (
        <CoreRootHeader
          viewer={state.viewer}
          media={state.media}
          playlist={state.playlist}
          onToggleBrowse={this._handleToggleBrowse}
          onSelectRandom={this._handleSelectRandom}
          onToggleDashboard={this._handleToggleDashboard}
          onToggleAuthentication={this._handleToggleAuthentication}
          onToggleMediaInfo={this._handleToggleMediaInfo}
          onToggleCurrentPlaylist={this._handleToggleCurrentPlaylist}
        />
      );
    }

    let maybeRightNode;
    if (state.isOverlayActive && state.sidebarMode === 'media-info') {
      maybeRightNode = (
        <CoreMediaInformation
          media={state.media}
          onDismiss={this._handleDismissSidebar}
          onRegisterMedia={this._handleRegisterGame}
        />
      );
    }

    if (state.isOverlayActive && state.sidebarMode === 'development') {
      maybeRightNode = (
        <CoreDevelopmentLogs logs={state.logs} onDismiss={this._handleDismissSidebar} />
      );
    }

    if (state.isOverlayActive && state.sidebarMode === 'dashboard') {
      maybeRightNode = (
        <CoreRootDashboard
          media={state.media}
          onMediaSelect={this._handleMediaSelect}
          storage={this.props.storage}
          onDismiss={this._handleDismissSidebar}
        />
      );
    }

    if (state.isOverlayActive && state.sidebarMode === 'current-playlist') {
      maybeRightNode = (
        <CoreRootPlaylistSidebar
          media={state.media}
          playlist={state.playlist}
          onMediaSelect={this._handleMediaSelect}
          onUserSelect={this._handleUserSelect}
          onViewCurrentPlaylistDetails={this._handleToggleCurrentPlaylistDetails}
          onDismiss={this._handleDismissSidebar}
        />
      );
    }

    return (
      <CoreLayout
        ref={this._handleGetReference}
        topNode={maybeTopNode}
        bottomNode={maybeBottomNode}
        leftSidebarNode={maybeLeftSidebarNode}
        rightNode={maybeRightNode}>
        {state.media ? (
          <CoreMediaScreen expanded={state.isMediaExpanded} media={state.media} />
        ) : null}
      </CoreLayout>
    );
  }
}
