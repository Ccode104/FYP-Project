import React, { useState, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Dimensions } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { apiFetch } from '../services/api';

const { width, height } = Dimensions.get('window');

interface MobileCodeEditorProps {
  assignmentId: number;
  assignmentTitle: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function MobileCodeEditor({
  assignmentId,
  assignmentTitle,
  onClose,
  onSuccess
}: MobileCodeEditorProps) {
  const { theme } = useTheme();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('javascript');
  const codeInputRef = useRef<TextInput>(null);

  const languages = [
    { id: 'javascript', label: 'JavaScript', extension: 'js' },
    { id: 'python', label: 'Python', extension: 'py' },
    { id: 'java', label: 'Java', extension: 'java' },
    { id: 'cpp', label: 'C++', extension: 'cpp' },
    { id: 'c', label: 'C', extension: 'c' },
    { id: 'csharp', label: 'C#', extension: 'cs' },
    { id: 'php', label: 'PHP', extension: 'php' },
    { id: 'ruby', label: 'Ruby', extension: 'rb' },
    { id: 'go', label: 'Go', extension: 'go' },
    { id: 'rust', label: 'Rust', extension: 'rs' },
  ];

  const getLanguageFromExtension = (ext: string) => {
    const lang = languages.find(l => l.extension === ext);
    return lang ? lang.id : 'javascript';
  };

  const handleSubmit = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Please write some code before submitting');
      return;
    }

    Alert.alert(
      'Confirm Submission',
      `Are you sure you want to submit your ${languages.find(l => l.id === selectedLanguage)?.label} code?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              // Create a simple code submission
              const submissionData = {
                assignment_id: assignmentId,
                code: code.trim(),
                language: selectedLanguage,
                filename: `solution.${languages.find(l => l.id === selectedLanguage)?.extension}`
              };

              await apiFetch('/submissions/submit/code', {
                method: 'POST',
                body: submissionData
              });

              Alert.alert('Success', 'Code submitted successfully!', [
                {
                  text: 'OK',
                  onPress: () => {
                    onSuccess?.();
                    onClose();
                  }
                }
              ]);
            } catch (err: any) {
              console.error('Code submission failed:', err);
              const errorMessage = err?.message || 'Submission failed. Please try again.';
              Alert.alert('Submission Failed', errorMessage);
            } finally {
              setSubmitting(false);
            }
          }
        }
      ]
    );
  };

  const insertTemplate = (template: string) => {
    const currentCode = code;
    // For React Native, we'll just append to the end since selectionStart is not available
    const newCode = currentCode + (currentCode ? '\n\n' : '') + template;
    setCode(newCode);

    // Focus back to input after a short delay
    setTimeout(() => {
      codeInputRef.current?.focus();
    }, 100);
  };

  const getLanguageTemplate = () => {
    switch (selectedLanguage) {
      case 'javascript':
        return `// ${assignmentTitle}
// Write your JavaScript solution here

function solution() {
    // Your code here
    console.log("Hello, World!");
}

solution();`;
      case 'python':
        return `# ${assignmentTitle}
# Write your Python solution here

def solution():
    # Your code here
    print("Hello, World!")

if __name__ == "__main__":
    solution()`;
      case 'java':
        return `// ${assignmentTitle}
// Write your Java solution here

public class Solution {
    public static void main(String[] args) {
        // Your code here
        System.out.println("Hello, World!");
    }
}`;
      case 'cpp':
        return `// ${assignmentTitle}
// Write your C++ solution here

#include <iostream>

int main() {
    // Your code here
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`;
      case 'c':
        return `// ${assignmentTitle}
// Write your C solution here

#include <stdio.h>

int main() {
    // Your code here
    printf("Hello, World!\\n");
    return 0;
}`;
      case 'csharp':
        return `// ${assignmentTitle}
// Write your C# solution here

using System;

class Solution {
    static void Main() {
        // Your code here
        Console.WriteLine("Hello, World!");
    }
}`;
      case 'php':
        return `<?php
// ${assignmentTitle}
// Write your PHP solution here

function solution() {
    // Your code here
    echo "Hello, World!\\n";
}

solution();
?>`;
      case 'ruby':
        return `# ${assignmentTitle}
# Write your Ruby solution here

def solution
  # Your code here
  puts "Hello, World!"
end

solution`;
      case 'go':
        return `// ${assignmentTitle}
// Write your Go solution here

package main

import "fmt"

func main() {
    // Your code here
    fmt.Println("Hello, World!")
}`;
      case 'rust':
        return `// ${assignmentTitle}
// Write your Rust solution here

fn main() {
    // Your code here
    println!("Hello, World!");
}`;
      default:
        return `// ${assignmentTitle}
// Write your solution here`;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={[styles.closeText, { color: theme.primary }]}>← Back</Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          Code Editor
        </Text>
        <View style={{ width: 60 }} />
      </View>

      {/* Language Selector */}
      <View style={[styles.languageBar, { backgroundColor: theme['bg-secondary'] }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.languageScroll}>
          {languages.map((lang) => (
            <TouchableOpacity
              key={lang.id}
              style={[
                styles.languageButton,
                selectedLanguage === lang.id && { backgroundColor: theme.primary }
              ]}
              onPress={() => setSelectedLanguage(lang.id)}
            >
              <Text style={[
                styles.languageText,
                { color: selectedLanguage === lang.id ? theme.bg : theme.text }
              ]}>
                {lang.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Code Editor */}
      <View style={styles.editorContainer}>
        <TextInput
          ref={codeInputRef}
          style={[styles.codeInput, {
            backgroundColor: theme.surface,
            color: theme.text,
            borderColor: theme.border,
            fontFamily: 'monospace',
            fontSize: 14,
            lineHeight: 20
          }]}
          value={code}
          onChangeText={setCode}
          placeholder={`Write your ${languages.find(l => l.id === selectedLanguage)?.label} code here...`}
          placeholderTextColor={theme['text-secondary']}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
        />

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: theme['bg-secondary'] }]}
            onPress={() => insertTemplate(getLanguageTemplate())}
          >
            <Text style={[styles.quickText, { color: theme.text }]}>Template</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickButton, { backgroundColor: theme['bg-secondary'] }]}
            onPress={() => setCode('')}
          >
            <Text style={[styles.quickText, { color: theme.text }]}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Submit Button */}
      <View style={[styles.footer, { backgroundColor: theme.surface, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[
            styles.submitButton,
            {
              backgroundColor: code.trim() && !submitting ? theme.primary : theme['text-secondary']
            }
          ]}
          onPress={handleSubmit}
          disabled={!code.trim() || submitting}
        >
          <Text style={[styles.submitText, { color: theme.bg }]}>
            {submitting ? 'Submitting...' : 'Submit Code'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  languageBar: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  languageScroll: {
    paddingHorizontal: 16,
  },
  languageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  languageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  editorContainer: {
    flex: 1,
    padding: 16,
  },
  codeInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'monospace',
    textAlignVertical: 'top',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  quickButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  quickText: {
    fontSize: 14,
    fontWeight: '500',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
  },
  submitButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
  },
});