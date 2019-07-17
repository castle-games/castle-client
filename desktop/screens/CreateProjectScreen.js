import * as React from 'react';
import * as Constants from '~/common/constants';
import * as ExecNode from '~/common/execnode';
import * as NativeUtil from '~/native/nativeutil';
import * as Strings from '~/common/strings';
import * as Project from '~/common/project';
import * as Utilities from '~/common/utilities';
import * as SVG from '~/common/svg';

import { css } from 'react-emotion';
import { CurrentUserContext } from '~/contexts/CurrentUserContext';
import { NavigatorContext } from '~/contexts/NavigationContext';

import CreateHomeScreen from '~/screens/CreateHomeScreen';
import CreateProjectProgressIndicator from '~/components/create/CreateProjectProgressIndicator';
import Logs from '~/common/logs';
import ProjectConfigureForm from '~/components/create/ProjectConfigureForm';
import ProjectTemplatePreview from '~/components/create/ProjectTemplatePreview';
import UIButton from '~/components/reusable/UIButton';

const path = Utilities.path();

const STYLES_CONTAINER = css`
  background: ${Constants.colors.background};
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow-y: scroll;
  padding: 24px;

  ::-webkit-scrollbar {
    display: none;
    width: 1px;
  }
`;

const STYLES_BOLD = css`
  font-weight: 600;
`;

const STYLES_PARAGRAPH = css`
  color: ${Constants.colors.black};
  font-size: ${Constants.typescale.base};
  line-height: ${Constants.linescale.base};
  font-family: ${Constants.font.system};
  margin-top: 16px;
  margin-bottom: 12px;
`;

const STYLES_ACTIONS = css`
  display: flex;
  width: 100%;
  justify-content: space-between;
`;

const STYLES_BACK = css`
  display: inline-flex;
  height: 48px;
  align-items: center;
  justify-content: center;
  text-decoration: underline;
  font-size: ${Constants.typescale.lvl6};
  color: ${Constants.colors.text};
  cursor: pointer;
`;

const STYLES_SECTION_TITLE = css`
  font-family: ${Constants.font.heading};
  font-size: ${Constants.typescale.lvl4};
  font-weight: 400;
  margin-bottom: 12px;
`;

class CreateProjectScreen extends React.Component {
  static defaultProps = {
    templates: [],
    onCancel: null,
  };

  state = {
    step: 'choose-template',
    selectedTemplate: null,
    selectedProjectName: null,
    selectedProjectParentDirectoryPath: null,
    selectedProjectDirectoryName: null,
    isProjectValidToCreate: true,
    createdProjectUrl: null,
  };

  componentDidMount() {
    this._setDefaultProjectDirectory();
  }

  _setDefaultProjectDirectory = async () => {
    const defaultName = 'My Castle Project';
    const directory = await Project.getDefaultUserProjectsPathAsync();
    this.setState({
      selectedProjectParentDirectoryPath: directory,
      selectedProjectName: defaultName,
      selectedProjectDirectoryName: Strings.toDirectoryName(defaultName),
    });
  };

  _handleBackToTemplate = () => {
    this.setState({
      step: 'choose-template',
      selectedTemplate: null,
    });
  };

  _handleSelectTemplate = (game) => {
    this.setState({
      step: 'configure-project',
      selectedTemplate: game,
    });
  };

  _handleChangeProjectName = (e) => {
    const projectName = e.target.value;
    const selectedProjectDirectoryName = Strings.toDirectoryName(projectName);
    const isProjectValidToCreate = this._isProjectPathValid(
      this.state.selectedProjectParentDirectoryPath,
      selectedProjectDirectoryName
    );
    this.setState({
      selectedProjectName: projectName,
      selectedProjectDirectoryName,
      isProjectValidToCreate,
    });
  };

  _handleSelectDirectory = (directory) => {
    const isProjectValidToCreate = this._isProjectPathValid(
      directory,
      this.state.selectedProjectDirectoryName
    );
    this.setState({
      selectedProjectParentDirectoryPath: directory,
      isProjectValidToCreate,
    });
  };

  _handleCreateProject = async () => {
    if (this.state.selectedTemplate.gameId === Project.BLANK_TEMPLATE_ID) {
      // if blank, use embedded blank template, then set status finished
      let createdProjectUrl;
      try {
        const projectPath = this._getFinalProjectPath();
        await ExecNode.createDirectoryAsync(projectPath);
        createdProjectUrl = await NativeUtil.createProjectAtPathAsync(projectPath);
        createdProjectUrl = await this._handleConfigureProjectAtPath(projectPath);
      } catch (_) {}
      this._handleProjectFinishedCreating(createdProjectUrl);
    } else {
      this.setState({
        step: 'create-project',
      });
    }
  };

  _handleProjectFinishedCreating = (createdProjectUrl) => {
    this.setState({
      step: 'finished',
      createdProjectUrl,
    });
  };

  // called if the user presses 'cancel' during the download/extract/configure phase.
  // CreateProjectProgressIndicator will clean up partial state when unmounted.
  _handleCancelCreatingProject = () => {
    this.setState({
      step: 'configure-project',
      createdProjectUrl: null,
    });
  };

  _handleNavigateToProject = async (projectUrl) => {
    await this.props.navigateToGameUrl(projectUrl, { launchSource: 'create-project' });
    Logs.system('Welcome to Castle!');
    Logs.system(`We created your project at ${projectUrl}.`);
    Logs.system(`Open that file in your favorite text editor to get started.`);
    Logs.system(`Need help? Check out ${Constants.WEB_HOST}/documentation`);
  };

  _handleConfigureProjectAtPath = async (projectPath) => {
    let projectName = this.state.selectedProjectName;
    let projectFilename = `${Strings.toDirectoryName(projectName)}.castle`;
    await Project.rewriteCastleFileAsync({
      containingFolder: projectPath,
      newFilename: projectFilename,
      newOwner: this.props.projectOwner ? this.props.projectOwner.username : null,
      newTitle: projectName ? projectName : 'my-new-project',
    });
    const createdProjectUrl = `file://${path.join(projectPath, projectFilename)}`;
    return createdProjectUrl;
  };

  _renderCreateHome = () => {
    return (
      <CreateHomeScreen
        templates={this.props.templates}
        selectedTemplate={this.state.selectedTemplate}
        onSelectTemplate={this._handleSelectTemplate}
      />
    );
  };

  _renderConfigureProject = () => {
    let projectParentDirectoryPath = this.state.selectedProjectParentDirectoryPath;
    let projectName = this.state.selectedProjectName;
    let projectDirectoryName = this.state.selectedProjectDirectoryName;
    return (
      <React.Fragment>
        <div className={STYLES_SECTION_TITLE}>Name your project</div>
        <ProjectConfigureForm
          selectedProjectName={projectName}
          selectedParentDirectoryPath={projectParentDirectoryPath}
          selectedDirectoryName={projectDirectoryName}
          onChangeProjectName={this._handleChangeProjectName}
          onSelectDirectory={this._handleSelectDirectory}
        />
        <ProjectTemplatePreview template={this.state.selectedTemplate} />
        <div className={STYLES_ACTIONS}>
          <div className={STYLES_BACK} onClick={this._handleBackToTemplate}>
            Choose a different template
          </div>
          <UIButton
            disabled={!this.state.isProjectValidToCreate}
            onClick={this._handleCreateProject}>
            Create Project
          </UIButton>
        </div>
      </React.Fragment>
    );
  };

  _isProjectPathValid = (parentDirectoryPath, directoryName) => {
    return (
      parentDirectoryPath && directoryName && parentDirectoryPath.length && directoryName.length
    );
  };

  _getFinalProjectPath = () => {
    return path.join(
      this.state.selectedProjectParentDirectoryPath,
      this.state.selectedProjectDirectoryName
    );
  };

  _renderCreatingProject = () => {
    return (
      <React.Fragment>
        <div className={STYLES_SECTION_TITLE}>Creating your project...</div>
        <CreateProjectProgressIndicator
          projectName={this.state.selectedProjectName}
          fromTemplate={this.state.selectedTemplate}
          toDirectory={this._getFinalProjectPath()}
          configureProject={this._handleConfigureProjectAtPath}
          onFinished={this._handleProjectFinishedCreating}
          onCancel={this._handleCancelCreatingProject}
        />
      </React.Fragment>
    );
  };

  _renderFinished = () => {
    return (
      <React.Fragment>
        <div className={STYLES_SECTION_TITLE}>All done!</div>
        <div className={STYLES_PARAGRAPH}>
          Castle finished creating your project files at{' '}
          <span className={STYLES_BOLD}>{this._getFinalProjectPath()}</span>.
        </div>
        <div className={STYLES_PARAGRAPH}>
          You're ready to start making{' '}
          <span className={STYLES_BOLD}>{this.state.selectedProjectName}</span>.
        </div>
        <div className={STYLES_ACTIONS}>
          <UIButton
            className={STYLES_BACK}
            onClick={() => this._handleNavigateToProject(this.state.createdProjectUrl)}>
            Open Project
          </UIButton>
        </div>
      </React.Fragment>
    );
  };

  render() {
    let content;
    if (this.state.step === 'choose-template') {
      content = this._renderCreateHome();
    } else if (this.state.step === 'configure-project') {
      content = this._renderConfigureProject();
    } else if (this.state.step === 'create-project') {
      content = this._renderCreatingProject();
    } else if (this.state.step === 'finished') {
      content = this._renderFinished();
    }
    return <div className={STYLES_CONTAINER}>{content}</div>;
  }
}

export default class CreateProjectScreenWithContext extends React.Component {
  render() {
    return (
      <NavigatorContext.Consumer>
        {(navigator) => (
          <CurrentUserContext.Consumer>
            {(currentUser) => (
              <CreateProjectScreen
                navigateToHome={navigator.navigateToHome}
                navigateToGameUrl={navigator.navigateToGameUrl}
                projectOwner={currentUser.user}
                {...this.props}
              />
            )}
          </CurrentUserContext.Consumer>
        )}
      </NavigatorContext.Consumer>
    );
  }
}
