import * as React from 'react';

/**
 *  DevelopmentContext contains all of the "making game" state of the app.
 *  Only consume this if you need to re-render based on changes in development state.
 */
const DevelopmentContextDefaults = {
  isDeveloping: false,
  isMultiplayerCodeUploadEnabled: false,
  logs: [],
};

/**
 *  DevelopmentSetterContext contains only the setters which affect the value
 *  of DevelopmentContext.
 */
const DevelopmentSetterContextDefaults = {
  setIsDeveloping: (isDeveloping) => {},
  toggleIsDeveloping: () => {},
  setIsMultiplayerCodeUploadEnabled: (isEnabled) => {},
  addLogs: (logs) => {},
  clearLogs: () => {},
};

const DevelopmentContext = React.createContext({
  ...DevelopmentContextDefaults,
  setters: {
    ...DevelopmentSetterContextDefaults,
  },
});
const DevelopmentSetterContext = React.createContext(DevelopmentSetterContextDefaults);

class DevelopmentContextProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ...DevelopmentContextDefaults,
      setters: {
        ...DevelopmentSetterContextDefaults,
        setIsDeveloping: this.setIsDeveloping,
        toggleIsDeveloping: this.toggleIsDeveloping,
        setIsMultiplayerCodeUploadEnabled: this.setIsMultiplayerCodeUploadEnabled,
        addLogs: this.addLogs,
        clearLogs: this.clearLogs,
      },
    };
  }

  setIsDeveloping = (isDeveloping) => {
    if (isDeveloping != this.state.isDeveloping) {
      this.setState({
        isDeveloping,
        isMultiplayerCodeUploadEnabled: false, // always reset this
      });
    }
  };

  toggleIsDeveloping = () => {
    this.setIsDeveloping(!this.state.isDeveloping);
  };

  setIsMultiplayerCodeUploadEnabled = (isMultiplayerCodeUploadEnabled) => {
    if (!this.state.isDeveloping && isMultiplayerCodeUploadEnabled) {
      throw new Error(`Cannot enable multiplayer code upload without enabling developer mode`);
    }
    this.setState({
      isMultiplayerCodeUploadEnabled,
    });
  };

  addLogs = (logs) => {
    this.setState({
      logs: [...this.state.logs, ...logs],
    });
  };

  clearLogs = () => {
    this.setState({
      logs: [],
    });
  };

  render() {
    return (
      <DevelopmentSetterContext.Provider value={this.state.setters}>
        <DevelopmentContext.Provider value={this.state}>
          {this.props.children}
        </DevelopmentContext.Provider>
      </DevelopmentSetterContext.Provider>
    );
  }
}

export { DevelopmentContext, DevelopmentSetterContext, DevelopmentContextProvider };
