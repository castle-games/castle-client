import * as React from 'react';
import * as Actions from '~/common/actions';
import * as Constants from '~/common/constants';
import * as Strings from '~/common/strings';

import Plain from 'slate-plain-serializer';
import { css } from 'react-emotion';

import UIAvatar from '~/core-components/reusable/UIAvatar';
import UIInputSecondary from '~/core-components/reusable/UIInputSecondary';
import UISubmitButton from '~/core-components/reusable/UISubmitButton';
import UITextArea from '~/core-components/reusable/UITextArea';

const STYLES_CONTAINER = css`
  background ${Constants.colors.background};
  color: ${Constants.colors.white};
  border-top: 16px solid ${Constants.colors.foreground};
`;

const STYLES_SECTION = css`
  border-bottom: 1px solid ${Constants.colors.border};
  padding: 16px 32px 16px 32px;

  :last-child {
    border-bottom: 0;
  }
`;

const STYLES_HEADING = css`
  font-weight: 600;
  font-size: 14px;
  letter-spacing: 0.2px;
  overflow-wrap: break-word;
  word-wrap: break-word;
  margin-bottom: 12px;
`;

const STYLES_SECTION_CONTENT = css`
  display: flex;
`;

const STYLES_COLUMN = css`
  display: flex;
  flex-direction: column;
`;

const STYLES_FILE_INPUT = css`
  display: inline-flex;
`;

export default class CoreEditProfile extends React.Component {
  state = {
    isExistingAvatarRemoved: false, // TODO: flag this once avatar removal is supported.
    isAvatarUploading: false,
    uploadedAvatarFile: null,
    about: Plain.deserialize(''),
    name: null,
    websiteUrl: null,
    isAnyFieldEdited: false,
  };

  componentDidMount() {
    this._resetForm(this.props.user);
  }

  componentWillReceiveProps(nextProps) {
    const existingUserId = (this.props.user && this.props.user.userId) ?
          this.props.user.userId :
          null;
    const nextUserId = (nextProps.user && nextProps.user.userId) ?
          nextProps.user.userId :
          null
    if (existingUserId == null || nextUserId != existingUserId ||
        (
          nextUserId == existingUserId &&
          nextProps.user.updatedTime !== this.props.user.updatedTime
        )
       ) {
      // we're rendering a new user, reset state.
      this._resetForm(nextProps.user);
    }
  }

  _resetForm = (user) => {
    const richAboutObject = (user && user.about && user.about.rich)
        ? Strings.loadEditor(user.about.rich)
        : Plain.deserialize('');
    this.setState({
      isExistingAvatarRemoved: false,
      isAvatarUploading: false,
      uploadedAvatarFile: null,
      about: richAboutObject,
      name: user.name,
      websiteUrl: user.websiteUrl,
      isAnyFieldEdited: false,
    });
  };

  _doesFormContainChanges = () => {
    const state = this.state;
    return (
      state.isExistingAvatarRemoved !== false ||
      state.uploadedAvatarFile !== null ||
      state.isAnyFieldEdited !== false
    );
  }
  
  _onAvatarFileInputChangeAsync = async (e) => {
    let files = e.target.files;
    if (files && files.length) {
      await this.setState({ isAvatarUploading: true });
      const result = await Actions.uploadImageAsync({
        file: files[0],
      });
      if (result) {
        this.setState({ uploadedAvatarFile: result, isAvatarUploading: false });
      } else {
        this.setState({ isAvatarUploading: false });
      }
    }
  };

  _onAboutChangeAsync = async ({ value }) => {
    this.setState({ about: value });
  };

  _onFieldChange = e => {
    this.setState({ [e.target.name]: e.target.value });
  };

  _onFieldFocus = (_) => {
    this.setState({ isAnyFieldEdited: true });
  };

  _onSubmitEditProfileAsync = async () => {
    let didSucceed = true;
    if (this.state.uploadedAvatarFile) {
      const result = await Actions.setUserPhotoAsync({
        userId: this.props.user.userId,
        fileId: this.state.uploadedAvatarFile.fileId,
      });
      if (!result) {
        didSucceed = false;
      }
    }
    if (this.state.isAnyFieldEdited) {
      const result = await Actions.updateUserAsync({
        userId: this.props.user.userId,
        about: this.state.about,
        name: this.state.name,
        websiteUrl: this.state.websiteUrl,
      });
      if (!result) {
        didSucceed = false;
      }
    }
    if (didSucceed) {
      if (this.props.onAfterSave) {
        this.props.onAfterSave();
      }
    }
  };

  _renderAvatarControl = () => {
    let avatarSrc;
    if (this.state.isExistingAvatarRemoved) {
      // display pending avatar removal.
      avatarSrc = null;
    } else if (this.state.uploadedAvatarFile) {
      // display pending avatar change.
      avatarSrc = this.state.uploadedAvatarFile.imgixUrl;
    } else {
      // display existing creator avatar.
      avatarSrc = (this.props.user && this.props.user.photo)
        ? this.props.user.photo.imgixUrl
        : null;
    }
    
    let avatarLoadingElement;
    let isAvatarUploadEnabled = true;
    if (this.state.isAvatarUploading) {
      avatarLoadingElement = (<p>Uploading...</p>);
      isAvatarUploadEnabled = false;
    }

    return (
      <div className={STYLES_SECTION_CONTENT}>
        <UIAvatar
          src={avatarSrc}
          style={{ width: 128, height: 128, marginRight: 16 }}
          />
        <div className={STYLES_COLUMN}>
          {avatarLoadingElement}
          <input
            type="file"
            id="avatar"
            name="avatar"
            className={STYLES_FILE_INPUT}
            style={(isAvatarUploadEnabled) ? {} : { display: 'none' }}
            onChange={this._onAvatarFileInputChangeAsync}
          />
        </div>
      </div>
    )
  };

  _renderNameField = () => {
    const value = this.state.name;
    return (
      <div className={STYLES_SECTION_CONTENT}>
        <UIInputSecondary
          name="name"
          value={value}
          label="Name"
          onChange={this._onFieldChange}
          onFocus={this._onFieldFocus}
          placeholder="Name shown below your username (optional)"
          style={{ width: 480, marginBottom: 16 }}
          />
      </div>
    )
  };

  _renderWebsiteField = () => {
    const value = this.state.websiteUrl;
    return (
      <div className={STYLES_SECTION_CONTENT}>
        <UIInputSecondary
          name="websiteUrl"
          value={value}
          label="Website"
          onChange={this._onFieldChange}
          onFocus={this._onFieldFocus}
          placeholder="URL shown on your profile (optional)"
          style={{ width: 480, marginBottom: 16 }}
          />
      </div>
    )
  };

  _renderAboutField = () => {
    const value = this.state.about;
    return (
      <div className={STYLES_SECTION_CONTENT}>
        <UITextArea
          value={value}
          label="About"
          onChange={this._onAboutChangeAsync}
          onFocus={this._onFieldFocus}
          placeholder="Write something about yourself..."
          style={{ width: 480, marginBottom: 16 }}
          />
      </div>
    )
  };
  
  render() {
    const isSubmitEnabled = this._doesFormContainChanges();
    return (
      <div className={STYLES_CONTAINER}>
        <div className={STYLES_SECTION}>
          <div className={STYLES_HEADING}>Avatar</div>
          {this._renderAvatarControl()}
        </div>
        <div className={STYLES_SECTION}>
          <div className={STYLES_HEADING}>Profile Info</div>
          {this._renderNameField()}
          {this._renderWebsiteField()}
          {this._renderAboutField()}
        </div>
        <div className={STYLES_SECTION}>
          <UISubmitButton
            disabled={!isSubmitEnabled}
            onClick={this._onSubmitEditProfileAsync}>
            Save Changes
          </UISubmitButton>
        </div>
      </div>
    );
  }
}
