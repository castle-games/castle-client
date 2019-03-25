import * as React from 'react';
import * as Constants from '~/common/constants';
import * as Utilities from '~/common/utilities';
import * as Strings from '~/common/strings';
import * as Urls from '~/common/urls';
import * as NativeUtil from '~/native/nativeutil';

import { css } from 'react-emotion';

import UIAvatar from '~/components/reusable/UIAvatar';
import UICharacterCard from '~/components/reusable/UICharacterCard';
import UIBoundary from '~/components/reusable/UIBoundary';
import UINavigationLink from '~/components/reusable/UINavigationLink';
import UIPlayTextCTA from '~/components/reusable/UIPlayTextCTA';

const STYLES_CONTAINER = css`
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
`;

//  box-shadow: inset 0 0 0 1px red;
const STYLES_GAME = css`
  display: inline-block;
  padding: 24px 24px 24px 24px;
  position: relative;

  :hover {
    section {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0px);
    }
  }
`;

const STYLES_GAME_ITEM = css`
  background: ${Constants.colors.white};
  border-radius: 4px;
  padding: 8px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.4);
  position: relative;
`;

const STYLES_GAME_SCREENSHOT = css`
  width: 188px;
  height: 106px;
  flex-shrink: 0;
  transition: 200ms ease all;
  cursor: pointer;
  background-size: cover;
  background-position: 50% 50%;
  background-color: rgba(0, 0, 0, 0.1);
`;

const STYLES_TITLE = css`
  text-align: right;
  margin-top: 8px;
  font-family: ${Constants.font.game};
  font-size: 18px;
  width: 188px;
  height: 56px;
`;

const STYLES_AVATAR = css`
  background-size: cover;
  background-position: 50% 50%;
  height: 24px;
  width: 24px;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0px 1px 4px rgba(0, 0, 0, 0.1);
`;

const STYLES_AVATAR_CREATOR = css`
  font-family: ${Constants.font.system};
  font-weight: 700;
  color: ${Constants.colors.black};
`;

const STYLES_BYLINE = css`
  margin-top: 8px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  cursor: pointer;
`;

const STYLES_URL = css`
  margin-top: 8px;
  font-size: 12px;
  font-weight: 600;
  font-family: ${Constants.font.system};
  overflow-wrap: break-word;
  max-width: 204px;
  width: 100%;
`;

const STYLES_TAG = css`
  position: absolute;
  top: 4px;
  left: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: ${Constants.colors.text};
  border-radius: 4px;
  padding: 0 8px 0 8px;
  height: 24px;
  font-family: ${Constants.font.monobold};
  color: white;
  font-size: 10px;
`;

const STYLES_GAME_POPOVER = css`
  position: absolute;
  top: 8px;
  left: 8px;
  width: 256px;
  z-index: 4;
  pointer-events: none;
  opacity: 0;
  transform: translateY(-8px);
  transition: 200ms ease all;
  transition-property: transform, opacity;
`;

const STYLES_POPOVER = css`
  padding: 16px;
  border-radius: 4px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
`;

const STYLES_POPOVER_INFO = css`
  display: flex;
  margin-top: 16px;
  align-items: flex-start;
  justify-content: space-between;
  overflow-wrap: break-word;
`;

const STYLES_POPOVER_TITLE = css`
  font-family: ${Constants.font.game};
  font-size: 18px;
  cursor: pointer;
`;

const STYLES_POPOVER_P = css`
  text-align: left;
  padding: 0 0 0 16px;
  font-family: ${Constants.font.system};
  font-size: 14px;
  width: 100%;
  min-width: 25%;
  line-height: 18px;
`;

const STYLES_POPOVER_GAME_URL = css`
  font-family: ${Constants.font.mono};
  font-size: 10px;
  margin-top: 4px;
  width: 100%;
  overflow-wrap: break-word;
`;

const STYLES_POPOVER_ACTIONS = css`
  display: flex;
  margin-top: 16px;
  align-items: center;
  justify-content: space-between;
`;

const STYLES_POPOVER_ACTIONS_LEFT = css`
  flex-shrink: 0;
`;

const STYLES_POPOVER_ACTIONS_RIGHT = css`
  min-width: 25%;
  width: 100%;
  padding-left: 24px;
  display: inline-flex;
  justify-content: flex-end;
`;

const Tag = (props) => {
  return <span className={STYLES_TAG}>{props.children}</span>;
};

class UIGameCell extends React.Component {
  state = {
    visible: false,
  };

  _handleToggleVisibility = () => {
    this.setState({ visible: !this.state.visible });
  };

  _handleDismiss = () => {
    this.setState({ visible: false });
  };

  _handleViewSource = (gameEntryPoint) => {
    NativeUtil.openExternalURL(Urls.githubUserContentToRepoUrl(gameEntryPoint));
  };

  render() {
    let { game } = this.props;
    let title = game.title ? game.title : 'Untitled';

    const backgroundColor =
      game.metadata && game.metadata.primaryColor ? `#${game.metadata.primaryColor}` : '#3d3d3d';
    const textColor = Utilities.adjustTextColor(backgroundColor);

    let description;
    let gameDescription = !Strings.isEmpty(game.description) ? game.description : null;
    let isPrivate = Urls.isPrivateUrl(game.url);

    if (isPrivate || !game.owner || !game.owner.name) {
      description = <div className={STYLES_URL}>{game.url}</div>;
    }

    if (!this.props.renderCartridgeOnly && game.owner) {
      description = (
        <div className={STYLES_BYLINE}>
          <div
            className={STYLES_AVATAR}
            style={{
              backgroundImage:
                game.owner.photo && game.owner.photo.url ? `url(${game.owner.photo.url})` : null,
            }}
          />
          <div
            className={STYLES_AVATAR_CREATOR}
            onClick={() => this.props.onUserSelect(game.owner)}>
            {game.owner.name}
          </div>
        </div>
      );
    }

    const onGameClick = isPrivate
      ? () => this.props.onGameSelect(game)
      : this._handleToggleVisibility;

    const luaEntryPoint = Utilities.getLuaEntryPoint(game);

    const popoverBackgroundColor = Utilities.shadeHex(backgroundColor, -0.1);

    const options = [];
    if (this.props.onGameUpdate) {
      options.push(
        <UINavigationLink
          key="actions-game-update"
          onClick={() => this.props.onGameUpdate(game)}
          style={{ marginRight: 24, color: textColor }}>
          Sync data
        </UINavigationLink>
      );
    }

    if (Urls.isOpenSource(luaEntryPoint)) {
      options.push(
        <UINavigationLink
          style={{ color: textColor }}
          onClick={() => this._handleViewSource(luaEntryPoint)}>
          View source
        </UINavigationLink>
      );
    }

    return (
      <div className={STYLES_GAME}>
        <div className={STYLES_GAME_ITEM} style={{ color: textColor, backgroundColor }}>
          <div
            className={STYLES_GAME_SCREENSHOT}
            onClick={onGameClick}
            style={{ backgroundImage: this.props.src ? `url(${this.props.src})` : null }}
          />
          <div className={STYLES_TITLE} onClick={onGameClick}>
            {title} {isPrivate ? <Tag>Local</Tag> : null}
          </div>
        </div>
        {description}

        <section className={STYLES_GAME_POPOVER}>
          <div
            className={STYLES_POPOVER}
            style={{ color: textColor, backgroundColor: popoverBackgroundColor }}>
            <div className={STYLES_POPOVER_TITLE} onClick={() => this.props.onGameSelect(game)}>
              {title}
            </div>
            <div className={STYLES_POPOVER_GAME_URL}>{game.url}</div>
            {gameDescription ? (
              <div className={STYLES_POPOVER_INFO}>
                <div
                  className={STYLES_AVATAR}
                  style={{
                    cursor: 'pointer',
                    height: 40,
                    width: 40,
                    marginRight: 0,
                    backgroundImage:
                      game.owner.photo && game.owner.photo.url
                        ? `url(${game.owner.photo.url})`
                        : null,
                  }}
                  onClick={() => this.props.onUserSelect(game.owner)}
                />
                <p className={STYLES_POPOVER_P}>{gameDescription}</p>
              </div>
            ) : null}

            <UIPlayTextCTA
              background={backgroundColor}
              style={{ marginTop: 40 }}
              onClick={() => this.props.onGameSelect(game)}>
              Play
            </UIPlayTextCTA>

            {options.length ? (
              <div className={STYLES_POPOVER_ACTIONS}>
                <div className={STYLES_POPOVER_ACTIONS_LEFT}>{options}</div>
                <div className={STYLES_POPOVER_ACTIONS_RIGHT} />
              </div>
            ) : null}
          </div>
        </section>
      </div>
    );
  }
}

export default class UIGameGrid extends React.Component {
  render() {
    const { gameItems } = this.props;
    return (
      <div className={STYLES_CONTAINER}>
        {gameItems.map((m) => {
          const key = m.key ? m.key : m.gameId ? m.gameId : m.url;
          return (
            <UIGameCell
              key={key}
              renderCartridgeOnly={this.props.renderCartridgeOnly}
              onGameSelect={this.props.onGameSelect}
              onGameUpdate={this.props.onGameUpdate}
              onUserSelect={this.props.onUserSelect}
              src={m.coverImage && m.coverImage.imgixUrl}
              game={m}
            />
          );
        })}
      </div>
    );
  }
}
