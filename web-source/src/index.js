import ReactDOM from 'react-dom';

import * as React from 'react';
import * as Constants from '~/common/constants';

import App from './App';

import { injectGlobal } from 'react-emotion';

const injectGlobalStyles = () => injectGlobal`
  @font-face {
    font-family: 'heading';
    src: url('/static/RGO-SemiBold.woff');
  }

  @font-face {
    font-family: 'sub-heading';
    src: url('/static/RGO-Regular.woff');
  }

  @font-face {
    font-family: 'silkscreen-regular';
    src: url('/static/Mono-Regular.woff');
  }

  html, body, div, span, applet, object, iframe,
  h1, h2, h3, h4, h5, h6, p, blockquote, pre,
  a, abbr, acronym, address, big, cite, code,
  del, dfn, em, img, ins, kbd, q, s, samp,
  small, strike, strong, sub, sup, tt, var,
  b, u, i, center,
  dl, dt, dd, ol, ul, li,
  fieldset, form, label, legend,
  table, caption, tbody, tfoot, thead, tr, th, td,
  article, aside, canvas, details, embed,
  figure, figcaption, footer, header, hgroup,
  menu, nav, output, ruby, section, summary,
  time, mark, audio, video {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
    border: 0;
    vertical-align: baseline;
  }

  article, aside, details, figcaption, figure,
  footer, header, hgroup, menu, nav, section {
    display: block;
  }

  html, body {
    font-family: ${Constants.font.default};
    font-size: 16px;

    @media (max-width: 728px) {
      font-size: 14px;
    }
  }
`;

injectGlobalStyles();

ReactDOM.render(<App />, document.getElementById('root'));
