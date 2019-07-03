import * as React from 'react';
import * as Constants from '~/common/constants';
import * as SVG from '~/common/svg';

import { css } from 'react-emotion';

const STYLES_USER = css`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  font-size: 12px;
  margin: 8px 0 12px 0;
  padding: 0 16px 0 16px;
  cursor: pointer;
  user-select: none;
  transition: 200ms ease color;

  :hover {
    color: magenta;
  }
`;

const STYLES_NOTIFICATION = css`
  font-family: ${Constants.REFACTOR_FONTS.system};
  font-weight: 600;
  background: rgb(255, 0, 235);
  color: white;
  height: 14px;
  margin-top: 2px;
  padding: 0 6px 0 6px;
  border-radius: 14px;
  font-size: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 0px;
`;

const STYLES_TEXT = css`
  font-family: ${Constants.REFACTOR_FONTS.system};
  min-width: 10%;
  width: 100%;
  padding: 0 8px 0 8px;
`;

const STYLES_NAME = css`
  font-family: ${Constants.REFACTOR_FONTS.system};
  font-size: 12px;
  margin-top: 2px;
`;

const STYLES_STATUS = css`
  font-size: 10px;
`;

const STYLES_INDICATOR = css`
  height: 12px;
  width: 12px;
  border-radius: 16px;
  flex-shrink: 0;
  position: absolute;
  right: -4px;
  bottom: -4px;
  border: 2px solid ${Constants.REFACTOR_COLORS.elements.channels};
`;

const STYLES_AVATAR = css`
  flex-shrink: 0;
  background-size: cover;
  background-position: 50% 50%;
  background-color: magenta;
  height: 20px;
  width: 20px;
  position: relative;
  border-radius: 4px;
`;

export default (props) => {
  const { channel, isSelected, data, onClick, user } = props;
  if (!user) {
    return null;
  }

  let color,
    fontWeight = '400';
  if (isSelected) {
    color = 'magenta';
  }
  if (channel.hasUnreadMessages && !isSelected) {
    fontWeight = '700';
  }

  return (
    <div className={STYLES_USER} onClick={!isSelected ? onClick : null}>
      {data.online ? (
        <figure
          className={STYLES_AVATAR}
          style={{ backgroundImage: user.photo ? `url(${user.photo.url})` : `` }}>
          <span
            className={STYLES_INDICATOR}
            style={{ background: Constants.REFACTOR_COLORS.online }}
          />
        </figure>
      ) : (
        <figure
          className={STYLES_AVATAR}
          style={{ backgroundImage: user.photo ? `url(${user.photo.url})` : `` }}>
          <span className={STYLES_INDICATOR} style={{ background: '#ACACAC' }} />
        </figure>
      )}
      <div className={STYLES_TEXT}>
        <h3 className={STYLES_NAME} style={{ color, fontWeight }}>
          {data.name}
        </h3>
      </div>
      {data.pending ? <span className={STYLES_NOTIFICATION}>{data.pending}</span> : null}
    </div>
  );
};
