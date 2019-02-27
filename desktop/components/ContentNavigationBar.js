import * as React from 'react';
import * as Constants from '~/common/constants';
import * as Urls from '~/common/urls';

import { css } from 'react-emotion';
import { NavigationContext, NavigatorContext } from '~/contexts/NavigationContext';

import SearchInput from '~/components/SearchInput';
import Viewer from '~/components/Viewer';

const ENABLE_NOTIF_SCREEN = false; // feature flag notification item

const STYLES_CONTAINER = css`
  background: #171717;
  height: 48px;
  flex-shrink: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const STYLES_SEARCH_SECTION = css`
  width: 100%;
  min-width: 25%;
`;

const STYLES_NAV_ITEMS = css`
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  padding-left: 128px;

  @media (max-width: 960px) {
    padding-left: 0px;
  }
`;

const STYLES_NAV_ITEM = css`
  display: inline-flex;
  color: ${Constants.colors.white};
  cursor: pointer;
  font-size: ${Constants.typescale.lvl6};
  font-weight: 600;
  text-decoration: none;
  margin: 0 24px 0 0;
`;

class ContentNavigationBar extends React.Component {
  _renderTopNavigationItems = () => {
    let { game, navigator } = this.props;
    let maybePlayingItem, maybeNotifItem;
    if (game) {
      maybePlayingItem = (
        <div className={STYLES_NAV_ITEM} onClick={navigator.navigateToCurrentGame}>
          Playing
        </div>
      );
    }
    if (ENABLE_NOTIF_SCREEN) {
      maybeNotifItem = (
        <div className={STYLES_NAV_ITEM} onClick={navigator.navigateToNotifications}>
          Notifications
        </div>
      );
    }
    return (
      <div className={STYLES_NAV_ITEMS}>
        {maybePlayingItem}
        {maybeNotifItem}
        <div className={STYLES_NAV_ITEM} onClick={navigator.navigateToHome}>
          Home
        </div>
      </div>
    );
  };

  render() {
    return (
      <div className={STYLES_CONTAINER}>
        <div className={STYLES_SEARCH_SECTION}>
          <SearchInput
            query={this.props.searchQuery}
            onSearchReset={this.props.onSearchReset}
            onChange={this.props.onSearchChange}
            onSubmit={this.props.onSearchSubmit}
          />
        </div>
        {this._renderTopNavigationItems()}
        <Viewer />
      </div>
    );
  }
}

export default class ContentNavigationBarWithContext extends React.Component {
  render() {
    return (
      <NavigationContext.Consumer>
        {(navigation) => (
          <NavigatorContext.Consumer>
            {(navigator) => (
              <ContentNavigationBar game={navigation.game} navigator={navigator} {...this.props} />
            )}
          </NavigatorContext.Consumer>
        )}
      </NavigationContext.Consumer>
    );
  }
}
