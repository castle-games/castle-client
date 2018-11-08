import * as React from 'react';
import * as Constants from '~/common/constants';

import Plain from 'slate-plain-serializer';
import { Value } from 'slate';
import { css } from 'react-emotion';

import UIEmptyState from '~/core-components/reusable/UIEmptyState';
import UIButtonSecondary from '~/core-components/reusable/UIButtonSecondary';
import UIInputSecondary from '~/core-components/reusable/UIInputSecondary';
import UITextArea from '~/core-components/reusable/UITextArea';
import UISubmitButton from '~/core-components/reusable/UISubmitButton';

import ContentEditor from '~/editor/ContentEditor';
import DefaultState from '~/editor/default.json';

const STYLES_CONTAINER = css`
  background ${Constants.colors.background};
  color: ${Constants.colors.white};
`;

const STYLES_SECTION = css`
  margin-top: 32px;
  padding: 16px 16px 24px 16px;
  border-bottom: 1px solid ${Constants.colors.border};

  :last-child {
    border-bottom: 0;
  }
`;

export default class CoreProfileAddMedia extends React.Component {
  state = {
    media: {
      name: '',
      url: '',
      description: Plain.deserialize(''),
    },
  };

  _handleChangeMedia = e => {
    this.setState({ media: { ...this.state.media, [e.target.name]: e.target.value } });
  };

  _handleChangeMediaDescription = ({ value }) => {
    this.setState({ media: { ...this.state.media, description: value } });
  };

  _handleAddMedia = async () => {
    await this.props.onMediaAdd({ ...this.state.media });

    this.setState({
      media: {
        name: '',
        url: '',
        description: Plain.deserialize(''),
      },
    });
  };

  render() {
    return (
      <div className={STYLES_CONTAINER}>
        <div className={STYLES_SECTION}>
          <UIEmptyState
            style={{ padding: `0 0 24px 0`, color: Constants.colors.white }}
            title="Add your media">
            Add something you've created to your profile! When people view your profile they can
            find the games you've made.
          </UIEmptyState>
          <UIInputSecondary
            value={this.state.media.name}
            name="name"
            label="Media name"
            onChange={this._handleChangeMedia}
            style={{ marginBottom: 8 }}
          />
          <UIInputSecondary
            value={this.state.media.url}
            name="url"
            label="Media URL"
            onChange={this._handleChangeMedia}
            style={{ marginBottom: 8 }}
          />
          <UITextArea
            label="Media description"
            value={this.state.media.description}
            onChange={this._handleChangeMediaDescription}
            placeholder="Type a description..."
            style={{ marginBottom: 16 }}
          />
          <UISubmitButton onClick={this._handleAddMedia}>Add Media</UISubmitButton>
        </div>
      </div>
    );
  }
}
