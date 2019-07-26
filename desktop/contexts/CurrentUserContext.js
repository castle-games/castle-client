import * as React from 'react';
import * as Actions from '~/common/actions';
import * as Utilities from '~/common/utilities';

const EMPTY_CURRENT_USER = {
  user: null,
  settings: {
    notifications: null,
  },
  timeLastLoaded: 0,
  userStatusHistory: [],
  content: {
    posts: null,
  },
};

const CurrentUserContextDefaults = {
  ...EMPTY_CURRENT_USER,
  setCurrentUser: async (user) => {},
  clearCurrentUser: async () => {},
  refreshCurrentUser: async () => {},
  reloadPosts: () => {},
  loadMorePosts: () => {},
};

const CurrentUserContext = React.createContext(CurrentUserContextDefaults);

class CurrentUserContextProvider extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ...CurrentUserContextDefaults,
      ...props.value,
      setCurrentUser: this.setCurrentUser,
      clearCurrentUser: this.clearCurrentUser,
      refreshCurrentUser: this.refreshCurrentUser,
      reloadPosts: this.reloadPosts,
      loadMorePosts: this.loadMorePosts,
    };

    if (props.value && props.value.user) {
      this.state.timeLastLoaded = Date.now();
    }
  }

  setCurrentUser = async (user) => {
    await this.setState({
      user,
      timeLastLoaded: Date.now(),
    });
    if (
      !this.state.userStatusHistory ||
      !this.state.userStatusHistory.length ||
      !this.state.settings
    ) {
      this.refreshCurrentUser();
    }
  };

  clearCurrentUser = async () => {
    await Actions.logout();
    this.setState({
      ...EMPTY_CURRENT_USER,
    });
  };

  refreshCurrentUser = async () => {
    try {
      const result = await Actions.getCurrentUser();
      if (result.error || result.errors || !result.user) {
        throw new Error(`Unable to fetch current user: ${JSON.stringify(result, null, 2)}`);
      }
      const { user, settings, userStatusHistory } = result;
      this.setState({
        user,
        settings,
        userStatusHistory,
        timeLastLoaded: Date.now(),
      });
    } catch (e) {
      // TODO: failure case
      console.warn(e);
    }
  };

  _loadPosts = async ({ pageAfterPostId } = {}) => {
    if (!this._loadingPosts) {
      this._loadingPosts = true;
      try {
        let posts = await Actions.allPostsAsync({ pageAfterPostId });
        // shuffle posts per page to make things interesting
        posts = Utilities.shuffle(posts);
        await this.setState((state) => {
          if (pageAfterPostId !== null && pageAfterPostId !== undefined) {
            let existingPosts = state.content.posts || [];
            posts = existingPosts.concat(posts);
          }
          return {
            ...state,
            content: {
              ...state.content,
              posts,
            },
          };
        });
      } finally {
        this._loadingPosts = false;
      }
    }
  };

  reloadPosts = () => {
    this._loadPosts();
  };

  loadMorePosts = () => {
    let lastPostId;
    const { posts } = this.state.content;
    if (posts && posts.length > 0) {
      lastPostId = posts[posts.length - 1].postId;
    }
    this._loadPosts({ pageAfterPostId: lastPostId });
  };

  render() {
    return (
      <CurrentUserContext.Provider value={this.state}>
        {this.props.children}
      </CurrentUserContext.Provider>
    );
  }
}

export { CurrentUserContext, CurrentUserContextProvider };
