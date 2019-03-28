import * as React from 'react';
import { css } from 'react-emotion';

import * as Constants from '~/common/constants';
import * as Project from '~/common/project';

const STYLES_CONTAINER = css`
  display: flex;
  flex-wrap: wrap;
  padding: 0 8px 0 8px;
`;

const STYLES_TEMPLATE_CONTAINER = css`
  display: inline-block;
  padding: 16px;
  width: 192px;
  cursor: pointer;
`;

const STYLES_GAME_COVER = css`
  background-size: cover;
  background-position: 50% 50%;
  height: 108px;
  width: 100%;
  margin-bottom: 4px;
`;

const STYLES_GAME_TITLE = css`
  display: inline-flex;
  width: 100%;
  font-size: ${Constants.typescale.lvl6};
  line-height: ${Constants.linescale.lvl6};
  align-items: center;
  justify-content: center;
`;

export default class ProjectTemplateChooser extends React.Component {
  static defaultProps = {
    templates: [],
    selectedTemplate: null,
    onSelectTemplate: (template) => {},
  };

  _renderBlankTemplate = () => {
    return (
      <div
        key={Project.BLANK_TEMPLATE_ID}
        className={STYLES_TEMPLATE_CONTAINER}
        onClick={() =>
          this.props.onSelectTemplate({ gameId: Project.BLANK_TEMPLATE_ID, title: 'blank' })
        }>
        <div className={STYLES_GAME_COVER} style={{ backgroundColor: 'black' }} />
        <div className={STYLES_GAME_TITLE}>blank</div>
      </div>
    );
  };

  _renderTemplate = (game) => {
    const coverSrc = game.coverImage ? game.coverImage.imgixUrl : null;
    let styles =
      this.props.selectedTemplate && game.gameId == this.props.selectedTemplate.gameId
        ? { backgroundColor: Constants.colors.background4 }
        : null;
    return (
      <div
        key={game.gameId}
        className={STYLES_TEMPLATE_CONTAINER}
        style={styles}
        onClick={() => this.props.onSelectTemplate(game)}>
        <div
          className={STYLES_GAME_COVER}
          style={{ backgroundImage: coverSrc ? `url(${coverSrc})` : null }}
        />
        <div className={STYLES_GAME_TITLE}>{game.title}</div>
      </div>
    );
  };

  render() {
    return (
      <div className={STYLES_CONTAINER}>
        {this._renderBlankTemplate()}
        {this.props.templates.slice(0, 8).map((game) => this._renderTemplate(game))}
      </div>
    );
  }
}
