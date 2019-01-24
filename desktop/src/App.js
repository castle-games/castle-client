import * as React from 'react';
import { css } from 'react-emotion';

import * as Constants from '~/common/constants';
import ContentContainer from '~/components/ContentContainer.js';
import SocialContainer from '~/components/SocialContainer.js';

const STYLES_CONTAINER = css`
  font-family: ${Constants.font.default};
  background: ${Constants.colors.background};
  height: 100vh;
  width: 100%;
  overflow: hidden;
  margin: 0;
  padding: 0;
  display: flex;
`;

export default class App extends React.Component {
  render() {
    const { state, storage } = this.props;
    return (
      <div className={STYLES_CONTAINER}>
        <SocialContainer />
        <ContentContainer
          featuredMedia={state.featuredMedia}
          viewer={state.viewer}
        />
      </div>
    );
  }
};
