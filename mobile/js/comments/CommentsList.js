import * as React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { MessageBody } from '../components/MessageBody';
import { toRecentDate } from '../common/date-utilities';
import { UserAvatar } from '../components/UserAvatar';
import { useActionSheet } from '@expo/react-native-action-sheet';
import { useLazyQuery, gql } from '@apollo/client';
import { useNavigation } from '../ReactNavigation';

import * as Constants from '../Constants';

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  commentContainer: {
    flexDirection: 'row',
  },
  authorAvatar: {
    width: 24,
    height: 24,
    marginRight: 8,
    marginTop: 8,
  },
  commentBubble: {
    backgroundColor: '#f1f1f1',
    borderRadius: 15,
    paddingVertical: 2,
    paddingHorizontal: 12,
  },
  commentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  commentDate: {
    color: '#666',
    fontSize: 12,
  },
  commentBody: {
    paddingBottom: 8,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  authorUsername: {
    fontWeight: 'bold',
    marginRight: 4,
    lineHeight: 32,
  },
  repliesContainer: {
    paddingLeft: 8,
    marginTop: 8,
  },
});

const commentBodyStyles = StyleSheet.create({
  text: {
    color: '#000',
  },
  highlight: {
    color: '#000',
    fontWeight: 'bold',
  },
});

const CommentReplies = ({ replies, ...props }) => {
  return (
    <View style={styles.repliesContainer}>
      {replies.map((reply, ii) => (
        <Comment comment={reply} key={`reply-${ii}`} isReply {...props} />
      ))}
    </View>
  );
};

const Comment = ({ comment, isReply = false, prevComment, navigateToUser, showCommentActions }) => {
  // could use `prevComment` to render groups of comments by the same author.
  return (
    <View style={[styles.commentContainer, { marginBottom: isReply ? 0 : 8 }]}>
      <Pressable onPress={() => navigateToUser(comment.fromUser)}>
        <UserAvatar url={comment.fromUser.photo?.url} style={styles.authorAvatar} />
      </Pressable>
      <View>
        <Pressable style={styles.commentBubble} onPress={() => showCommentActions(comment)}>
          <View style={styles.commentMeta}>
            <Pressable onPress={() => navigateToUser(comment.fromUser)}>
              <Text style={styles.authorUsername}>{comment.fromUser.username}</Text>
            </Pressable>
            <Text style={styles.commentDate}>{toRecentDate(comment.createdTime)}</Text>
          </View>
          <View style={styles.commentBody}>
            <MessageBody
              body={comment.body}
              styles={commentBodyStyles}
              navigateToUser={navigateToUser}
            />
          </View>
        </Pressable>
        {comment.childComments?.length ? (
          <CommentReplies
            replies={comment.childComments}
            navigateToUser={navigateToUser}
            showCommentActions={showCommentActions}
          />
        ) : null}
      </View>
    </View>
  );
};

export const CommentsList = ({ deckId, isOpen }) => {
  const { push } = useNavigation();
  const [comments, setComments] = React.useState(null);
  const { showActionSheetWithOptions } = useActionSheet();

  const [fetchComments, query] = useLazyQuery(
    gql`
      query($deckId: ID!) {
        deck(deckId: $deckId) {
          id
          deckId
          comments {
            ${Constants.COMMENTS_LIST_FRAGMENT}
          }
        }
      }
    `
  );

  React.useEffect(() => {
    if (isOpen) {
      fetchComments({ variables: { deckId } });
    }
  }, [isOpen, deckId]);

  React.useEffect(() => {
    if (query.called && !query.loading) {
      if (query.data) {
        const comments = query.data.deck.comments.comments;
        if (comments) {
          setComments(comments);
        }
      }
    }
  }, [query.called, query.loading, query.error, query.data]);

  const navigateToUser = React.useCallback(
    (user) =>
      push(
        'Profile',
        { userId: user.userId },
        {
          isFullscreen: true,
        }
      ),
    [push]
  );

  const showCommentActions = React.useCallback(
    (comment) =>
      showActionSheetWithOptions(
        {
          title: `@${comment.fromUser.username}'s comment`,
          options: ['Reply', 'Report', 'Cancel'],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          // TODO: reply/report
        }
      ),
    [showActionSheetWithOptions]
  );

  const renderItem = React.useCallback(
    ({ item, index }) => {
      const comment = item;
      const prevComment = index > 0 ? comments[index - 1] : null;
      return (
        <Comment
          comment={comment}
          prevComment={prevComment}
          navigateToUser={navigateToUser}
          showCommentActions={showCommentActions}
        />
      );
    },
    [comments, navigateToUser]
  );

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={comments}
      renderItem={renderItem}
      keyExtractor={(item, index) => item.commentId.toString()}
      inverted
    />
  );
};
