import * as React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import MCIcon from 'react-native-vector-icons/MaterialCommunityIcons';

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  textInput: {
    width: '100%',
    flexShrink: 1,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f1f1f1',
    borderRadius: 20,
  },
  submitButton: {
    padding: 8,
    marginLeft: 8,
  },
  replyingToRow: {
    flexDirection: 'row',
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  replyingToLabel: {
    fontSize: 12,
    color: '#888',
  },
  clearReplyButton: {
    marginLeft: 4,
  },
});

export const CommentInput = ({ onAddComment, replyingToComment, clearReplyingToComment }) => {
  const [value, setValue] = React.useState();
  const addComment = React.useCallback(
    (message) => {
      let parentCommentId = null;
      if (replyingToComment) {
        parentCommentId = replyingToComment.commentId;
      }
      onAddComment(message, parentCommentId);
      setValue(undefined);
      clearReplyingToComment();
    },
    [replyingToComment, clearReplyingToComment]
  );
  return (
    <View style={styles.container}>
      {replyingToComment ? (
        <View style={styles.replyingToRow}>
          <Text style={styles.replyingToLabel}>
            Replying to @{replyingToComment.fromUser.username}
          </Text>
          <Pressable
            style={styles.clearReplyButton}
            onPress={clearReplyingToComment}
            hitSlop={{ top: 4, left: 4, right: 4, bottom: 4 }}>
            <MCIcon name="close-circle" color="#888" size={16} />
          </Pressable>
        </View>
      ) : null}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Add a comment..."
          value={value}
          onChangeText={setValue}
          multiline
        />
        <Pressable
          style={styles.submitButton}
          onPress={() => addComment(value)}
          disabled={!value || value.length === 0}>
          <MCIcon name="send" color={value?.length > 0 ? '#000' : '#999'} size={24} />
        </Pressable>
      </View>
    </View>
  );
};
