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

const STYLES_NAME = css`
  font-family: ${Constants.REFACTOR_FONTS.system};
  min-width: 10%;
  width: 100%;
  padding: 1px 8px 0 8px;
`;

const STYLES_INDICATOR = css`
  margin-top: 2px;
  height: 12px;
  width: 12px;
  border-radius: 16px;
  flex-shrink: 0;
`;

export default ({ data }) => {
  return (
    <div className={STYLES_USER}>
      {data.online ? (
        <span
          className={STYLES_INDICATOR}
          style={{ background: Constants.REFACTOR_COLORS.online }}
        />
      ) : (
        <span
          className={STYLES_INDICATOR}
          style={{ background: Constants.REFACTOR_COLORS.elements.servers }}
        />
      )}
      <span
        className={STYLES_NAME}
        style={{ color: data.online ? null : Constants.REFACTOR_COLORS.subdued }}>
        {data.name}
      </span>
      {data.pending ? <span className={STYLES_NOTIFICATION}>{data.pending}</span> : null}
    </div>
  );
};
