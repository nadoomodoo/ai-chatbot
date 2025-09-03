'use client';

import { EditorView } from '@codemirror/view';
import { EditorState, Transaction } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';
import { basicSetup } from 'codemirror';
import React, { memo, useEffect, useRef, useState } from 'react';
import type { Suggestion } from '@/lib/db/schema';

type HtmlEditorProps = {
  content: string;
  onSaveContent: (updatedContent: string, debounce: boolean) => void;
  status: 'streaming' | 'idle';
  isCurrentVersion: boolean;
  currentVersionIndex: number;
  suggestions: Array<Suggestion>;
};

function PureHtmlEditor({ content, onSaveContent, status }: HtmlEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<EditorView | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  useEffect(() => {
    if (containerRef.current && !editorRef.current && activeTab === 'code') {
      const startState = EditorState.create({
        doc: content,
        extensions: [basicSetup, python(), oneDark],
      });

      editorRef.current = new EditorView({
        state: startState,
        parent: containerRef.current,
      });
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.destroy();
        editorRef.current = null;
      }
    };
    // NOTE: we only want to run this effect once
    // eslint-disable-next-line
  }, [activeTab]);

  useEffect(() => {
    if (editorRef.current && activeTab === 'code') {
      const updateListener = EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          const transaction = update.transactions.find(
            (tr) => !tr.annotation(Transaction.remote),
          );

          if (transaction) {
            const newContent = update.state.doc.toString();
            onSaveContent(newContent, true);
          }
        }
      });

      const currentSelection = editorRef.current.state.selection;

      const newState = EditorState.create({
        doc: editorRef.current.state.doc,
        extensions: [basicSetup, python(), oneDark, updateListener],
        selection: currentSelection,
      });

      editorRef.current.setState(newState);
    }
  }, [onSaveContent, activeTab]);

  useEffect(() => {
    if (editorRef.current && content && activeTab === 'code') {
      const currentContent = editorRef.current.state.doc.toString();

      if (status === 'streaming' || currentContent !== content) {
        const transaction = editorRef.current.state.update({
          changes: {
            from: 0,
            to: currentContent.length,
            insert: content,
          },
          annotations: [Transaction.remote.of(true)],
        });

        editorRef.current.dispatch(transaction);
      }
    }
  }, [content, status, activeTab]);

  return (
    <div className="relative not-prose w-full px-2">
      {/* Content */}
      {activeTab === 'preview' ? (
        <iframe
          className="w-full h-full min-h-[60dvh] border rounded-lg bg-white dark:bg-gray-900"
          srcDoc={content}
          title="HTML Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div
          className="relative not-prose w-full pb-[calc(80dvh)] text-sm"
          ref={containerRef}
        />
      )}
    </div>
  );
}

function areEqual(prevProps: HtmlEditorProps, nextProps: HtmlEditorProps) {
  if (prevProps.suggestions !== nextProps.suggestions) return false;
  if (prevProps.currentVersionIndex !== nextProps.currentVersionIndex)
    return false;
  if (prevProps.isCurrentVersion !== nextProps.isCurrentVersion) return false;
  if (prevProps.status === 'streaming' && nextProps.status === 'streaming')
    return false;
  if (prevProps.content !== nextProps.content) return false;

  return true;
}

export const HtmlEditor = memo(PureHtmlEditor, areEqual);
