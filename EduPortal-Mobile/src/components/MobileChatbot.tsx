import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, ScrollView, Alert, Dimensions, SafeAreaView } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../services/api';

const { width, height } = Dimensions.get('window');

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  id: string;
}

interface MobileChatbotProps {
  courseId?: string;
}

export default function MobileChatbot({ courseId }: MobileChatbotProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage: Message = {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your AI course assistant. I can help you with questions about course materials that have already been released. For security reasons, I cannot access or discuss upcoming assignments, quizzes, or unreleased content.

How can I help you today?`,
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
  }, []);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Content filtering function to prevent sensitive data leakage
  const filterSensitiveContent = useCallback((content: string): string => {
    // Remove or redact sensitive patterns
    let filtered = content;

    // Remove quiz questions patterns
    filtered = filtered.replace(/quiz\s*question\s*\d*[:\-]?\s*[^.!?]+[.!?]/gi, '[QUIZ CONTENT REDACTED]');
    filtered = filtered.replace(/question\s*\d*[:\-]?\s*what[^.!?]*[.!?]/gi, '[QUESTION REDACTED]');
    filtered = filtered.replace(/multiple\s*choice[:\-]?\s*[^.!?]+[.!?]/gi, '[MULTIPLE CHOICE REDACTED]');

    // Remove assignment content patterns
    filtered = filtered.replace(/assignment\s*\d*[:\-]?\s*[^.!?]+[.!?]/gi, '[ASSIGNMENT CONTENT REDACTED]');
    filtered = filtered.replace(/submit\s*your\s*[^.!?]*solution[^.!?]*[.!?]/gi, '[SUBMISSION INSTRUCTIONS REDACTED]');

    // Remove future content references
    filtered = filtered.replace(/upcoming\s*[^.!?]*assignment[^.!?]*[.!?]/gi, '[FUTURE CONTENT NOT AVAILABLE]');
    filtered = filtered.replace(/next\s*week[^.!?]*quiz[^.!?]*[.!?]/gi, '[FUTURE QUIZ NOT AVAILABLE]');
    filtered = filtered.replace(/due\s*on\s*[^.!?]*[.!?]/gi, '[DUE DATE INFORMATION REDACTED]');

    // Remove specific question patterns
    filtered = filtered.replace(/\b(?:what|how|why|when|where|which)\s+is\s+[^.!?]*\?/gi, '[QUESTION REDACTED]');
    filtered = filtered.replace(/\b(?:explain|describe|define)\s+[^.!?]*[.!?]/gi, '[EXPLANATION REDACTED]');

    return filtered;
  }, []);

  // Validate user input for potential prompt injection
  const validateUserInput = useCallback((input: string): boolean => {
    const lowerInput = input.toLowerCase();

    // Block attempts to access sensitive content
    const blockedPatterns = [
      /show\s*me\s*(?:all\s*)?(?:the\s*)?questions?/,
      /give\s*me\s*(?:all\s*)?(?:the\s*)?answers?/,
      /what\s*are\s*(?:all\s*)?(?:the\s*)?questions?/,
      /reveal\s*(?:all\s*)?(?:the\s*)?content/,
      /access\s*(?:all\s*)?(?:the\s*)?assignments?/,
      /show\s*(?:all\s*)?(?:the\s*)?quizzes?/,
      /list\s*(?:all\s*)?(?:the\s*)?questions?/,
      /display\s*(?:all\s*)?(?:the\s*)?answers?/,
      /tell\s*me\s*(?:everything|all)/,
      /what\s*do\s*you\s*know\s*about/i,
      /system\s*prompt/i,
      /ignore\s*previous\s*instructions/i,
      /bypass\s*restrictions/i,
      /override\s*rules/i
    ];

    return !blockedPatterns.some(pattern => pattern.test(lowerInput));
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    // Validate input for security
    if (!validateUserInput(input.trim())) {
      Alert.alert(
        'Security Notice',
        'For your security and privacy, I cannot assist with requests that attempt to access sensitive or unreleased course content. Please ask about course materials that have already been made available to you.'
      );
      setInput('');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      // Make API call with error handling
      const response = await apiFetch('/chatbot/chat', {
        method: 'POST',
        body: {
          courseId: courseId?.toString(),
          message: input.trim(),
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })), // Last 10 messages for context
          enableWebSearch: false // Disable web search for security
        }
      });

      let assistantContent = (response as any).reply || 'I apologize, but I couldn\'t generate a response at this time.';

      // Apply content filtering
      assistantContent = filterSensitiveContent(assistantContent);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: assistantContent,
        timestamp: (response as any).timestamp || new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (err: any) {
      console.error('Chatbot error:', err);

      let errorMessage = 'I\'m sorry, but I encountered an error. Please try again.';

      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (err.message?.includes('fetch')) {
        errorMessage = 'Unable to connect to the AI service. Please check your connection and try again.';
      } else if (err.message?.includes('401') || err.message?.includes('403')) {
        errorMessage = 'Authentication error. Please log out and log back in.';
      } else if (err.message?.includes('429')) {
        errorMessage = 'Too many requests. Please wait a moment before trying again.';
      }

      const errorMsg: Message = {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorMsg]);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear this conversation?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            const welcomeMessage: Message = {
              id: 'welcome-' + Date.now(),
              role: 'assistant',
              content: 'Chat cleared. How can I help you with your course materials today?',
              timestamp: new Date().toISOString()
            };
            setMessages([welcomeMessage]);
            setError(null);
          }
        }
      ]
    );
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View style={[
      styles.messageWrapper,
      item.role === 'user' ? styles.userMessageWrapper : styles.assistantMessageWrapper
    ]}>
      <View style={[
        styles.messageBubble,
        item.role === 'user' ? styles.userBubble : styles.assistantBubble
      ]}>
        <Text style={[
          styles.messageText,
          item.role === 'user' ? styles.userText : styles.assistantText
        ]}>
          {item.content}
        </Text>
        <Text style={styles.timestamp}>
          {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Messages Area - Takes full space */}
      <FlatList
        ref={messagesEndRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesArea}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
      />

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <View style={styles.loadingBubble}>
            <View style={styles.spinner} />
            <Text style={styles.loadingText}>Thinking...</Text>
          </View>
        </View>
      )}

      {/* Error Display */}
      {error && !loading && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => setError(null)}
          >
            <Text style={styles.retryText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input Area - Fixed at bottom */}
      <View style={styles.inputArea}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            style={styles.messageInput}
            value={input}
            onChangeText={setInput}
            placeholder="Ask about course materials..."
            multiline
            maxLength={500}
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!input.trim() || loading) && styles.disabledSendButton
            ]}
            onPress={sendMessage}
            disabled={!input.trim() || loading}
          >
            <Text style={styles.sendIcon}>➤</Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.clearButton}
            onPress={clearChat}
            disabled={messages.length <= 1}
          >
            <Text style={styles.clearText}>Clear Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => Alert.alert(
              'AI Assistant Help',
              'I can help you with questions about course materials that have been released. For security, I cannot access upcoming assignments, quizzes, or unreleased content.\n\nExamples:\n• Explain a concept from lectures\n• Clarify course readings\n• Help with practice problems\n• Review completed assignments'
            )}
          >
            <Text style={styles.helpText}>?</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  messagesArea: {
    flex: 1,
  },
  messagesContainer: {
    padding: 16,
    paddingBottom: 20,
  },
  messageWrapper: {
    marginBottom: 12,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  assistantMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    position: 'relative',
  },
  userBubble: {
    backgroundColor: '#007bff',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userText: {
    color: 'white',
  },
  assistantText: {
    color: '#212529',
  },
  timestamp: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
    textAlign: 'right',
  },
  loadingContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  spinner: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#007bff',
    borderTopColor: 'transparent',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 12,
    backgroundColor: '#f8d7da',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#f5c6cb',
  },
  errorText: {
    fontSize: 14,
    color: '#721c24',
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#dc3545',
    borderRadius: 4,
  },
  retryText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  inputArea: {
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    padding: 16,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dee2e6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
    marginRight: 12,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#007bff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabledSendButton: {
    backgroundColor: '#6c757d',
  },
  sendIcon: {
    fontSize: 18,
    color: 'white',
    fontWeight: 'bold',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#6c757d',
    borderRadius: 6,
  },
  clearText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  helpButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#17a2b8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});