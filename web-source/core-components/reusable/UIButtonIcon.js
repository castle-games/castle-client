import * as React from 'react';
import * as Constants from '~/common/constants';

import { css } from 'react-emotion';

import UIControl from '~/core-components/reusable/UIControl';

const STYLES_CONTROL = css`
  display: inline-flex;
  padding: 8px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: ${Constants.colors.white};
  margin-bottom: 16px;
  opacity: 1;
  transition: 200ms ease opacity;
  cursor: pointer;

  :hover {
    opacity: 0.8;
  }
`;

const STYLES_ICON = css`
  height: 48px;
  width: 48px;
  background: ${Constants.colors.black};
  margin-bottom: 8px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.07);
  background-position: 50% 50%;
  background-size: cover;
`;

const STYLES_TEXT = css`
  text-transform: uppercase;
  font-family: ${Constants.font.default};
  font-size: 10px;
  letter-spacing: 0.2px;
  font-weight: 400;
  display: inline-flex;
  align-items: center;
`;

export default class UIButtonIcon extends React.Component {
  render() {
    return (
      <span className={STYLES_CONTROL} onClick={this.props.onClick}>
        <div
          className={STYLES_ICON}
          style={{
            backgroundImage: `url('${this.props.src}')`,
            boxShadow: this.props.active ? `0 0 0 3px ${Constants.colors.white}` : null,
          }}>
          {!this.props.src ? this.props.icon : null}
        </div>
        <div className={STYLES_TEXT}>{this.props.children}</div>
      </span>
    );
  }
}
