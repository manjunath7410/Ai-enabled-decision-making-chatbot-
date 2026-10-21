/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import {
  ArrowUp,
  Square,
  Mic,
  MicOff,
  Globe,
  AlertCircle,
  X,
  Check,
  Paperclip,
  FileText,
} from 'lucide-react';

export type SupportedLanguage = 'en' | 'hi' | 'kn';

export interface AttachedFile {
  name: string;
  size: number;
  type: string;
  content: string;
}

interface ChatComposerProps {
  onSendMessage: (content: string, language?: SupportedLanguage) => void;
  isLoading: boolean;
  onCancelRequest?: () => void;
  placeholder?: string;
  initialValue?: string;
}

export const ChatComposer: React.FC<ChatComposerProps> = ({
  onSendMessage,
  isLoading,
  onCancelRequest,
  placeholder = "Describe your dilemma (e.g., 'Should I take a 20% pay cut for a remote job with better work-life balance?')",
  initialValue = '',
}) => {
  const [text, setText] = useState(initialValue);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSubmittingRef = useRef<boolean>(false);

  useEffect(() => {
    if (initialValue) {
      setText(initialValue);
      adjustTextareaHeight();
      textareaRef.current?.focus();
    }
  }, [initialValue]);

  // Clean up any ongoing recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = 'auto';
    const nextHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${Math.max(nextHeight, 52)}px`;
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    adjustTextareaHeight();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Enforce 5MB limit
    if (file.size > 5 * 1024 * 1024) {
      setFileError('File exceeds 5MB size limit. Please upload a smaller document.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    if (file.type.startsWith('image/')) {
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          size: file.size,
          type: file.type,
          content: reader.result as string,
        });
      };
      reader.readAsDataURL(file);
    } else {
      reader.onload = () => {
        setAttachedFile({
          name: file.name,
          size: file.size,
          type: file.type || 'text/plain',
          content: (reader.result as string).slice(0, 4000),
        });
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isLoading || isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setTimeout(() => {
      isSubmittingRef.current = false;
    }, 600);

    // If a document or image was attached, include the extracted text context
    let finalContent = trimmed;
    if (attachedFile) {
      const docHeader = `[Attached Document: "${attachedFile.name}"]:\n${attachedFile.content.slice(0, 3000)}\n\n[User Decision Question]:\n`;
      finalContent = docHeader + finalContent;
      setAttachedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }

    // If Hindi or Kannada is selected, tag the message with the language context
    if (selectedLanguage === 'hi' && !trimmed.toLowerCase().includes('hindi') && !trimmed.includes('हिंदी')) {
      finalContent = `[Please respond in Hindi / कृपया हिंदी में उत्तर दें]:\n${finalContent}`;
    } else if (selectedLanguage === 'kn' && !trimmed.toLowerCase().includes('kannada') && !trimmed.includes('ಕನ್ನಡ')) {
      finalContent = `[Please respond in Kannada / ದಯವಿಟ್ಟು ಕನ್ನಡದಲ್ಲಿ ಉತ್ತರಿಸಿ]:\n${finalContent}`;
    }

    onSendMessage(finalContent, selectedLanguage);
    setText('');
    setInterimTranscript('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '52px';
    }
  };

  // Voice Input: Web Speech API Integration
  const startRecording = () => {
    setVoiceError(null);
    setInterimTranscript('');

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        'Speech recognition is not supported in this browser. Try Chrome, Edge, or Safari.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      // Match recognition language to selected preference
      if (selectedLanguage === 'hi') {
        recognition.lang = 'hi-IN';
      } else if (selectedLanguage === 'kn') {
        recognition.lang = 'kn-IN';
      } else {
        recognition.lang = 'en-US';
      }

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalStr += transcriptChunk;
          } else {
            interimStr += transcriptChunk;
          }
        }

        if (finalStr) {
          setText((prev) => {
            const separator = prev.length > 0 && !prev.endsWith(' ') ? ' ' : '';
            return prev + separator + finalStr;
          });
          setInterimTranscript('');
          setTimeout(adjustTextareaHeight, 10);
        } else {
          setInterimTranscript(interimStr);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setVoiceError('Microphone permission was denied. Please allow microphone access in your browser.');
        } else if (event.error === 'no-speech') {
          setVoiceError('No speech was detected. Please try speaking again.');
        } else {
          setVoiceError(`Voice input error: ${event.error || 'Unable to recognize audio'}.`);
        }
        stopRecording();
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (e: any) {
      console.warn('Failed to start speech recognition:', e);
      setVoiceError('Could not initialize microphone. Please check permissions.');
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript('');
  };

  const cancelRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript('');
  };

  const canSubmit = text.trim().length > 0 && !isLoading;

  const languages: Array<{ code: SupportedLanguage; label: string; native: string }> = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-4 sm:pb-6">
      {/* Voice Recording Active Notice */}
      {isRecording && (
        <div
          role="status"
          aria-live="polite"
          className="mb-2 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between text-xs sm:text-sm text-red-950 shadow-xs animate-fade-in"
        >
          <div className="flex items-center gap-2.5">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-600" />
            </span>
            <div>
              <span className="font-semibold text-red-900">Listening... </span>
              <span className="text-red-700">
                {interimTranscript ? `"${interimTranscript}"` : 'Speak your dilemma clearly.'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={stopRecording}
              className="px-2.5 py-1 rounded-md bg-stone-900 text-white text-xs font-medium hover:bg-stone-800 transition-colors shadow-2xs"
            >
              Done
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="px-2.5 py-1 rounded-md bg-white border border-stone-200 text-stone-700 text-xs font-medium hover:bg-stone-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Voice Error Notice */}
      {voiceError && (
        <div
          role="alert"
          className="mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{voiceError}</span>
          </div>
          <button
            type="button"
            onClick={() => setVoiceError(null)}
            className="p-1 text-amber-700 hover:text-amber-950 rounded hover:bg-amber-100 transition-colors"
            aria-label="Dismiss voice error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* File Error Notice */}
      {fileError && (
        <div
          role="alert"
          className="mb-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between text-xs text-amber-900 animate-fade-in"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{fileError}</span>
          </div>
          <button
            type="button"
            onClick={() => setFileError(null)}
            className="p-1 text-amber-700 hover:text-amber-950 rounded hover:bg-amber-100 transition-colors"
            aria-label="Dismiss file error"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="relative bg-white rounded-2xl border border-stone-300 shadow-sm focus-within:border-stone-500 focus-within:ring-2 focus-within:ring-stone-400/20 transition-all p-2 sm:p-2.5"
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="image/png,image/jpeg,image/webp,text/plain,application/pdf,text/csv,text/markdown"
          tabIndex={-1}
        />

        {/* Attached Document Pill */}
        {attachedFile && (
          <div className="mb-2 px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-between text-xs text-indigo-950 animate-fade-in">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
              <span className="font-semibold truncate">{attachedFile.name}</span>
              <span className="text-indigo-600/70 text-[10px]">
                ({Math.round(attachedFile.size / 1024)} KB)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setAttachedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
              className="p-1 text-indigo-700 hover:text-red-600 rounded transition-colors"
              title="Remove attachment"
              aria-label="Remove attachment"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Main Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading}
            className="w-full resize-none bg-transparent px-2.5 py-1.5 text-stone-900 placeholder:text-stone-400 text-sm sm:text-base leading-relaxed focus:outline-hidden max-h-[200px] overflow-y-auto disabled:opacity-60"
            aria-label="Your decision question or response"
          />

          {/* Action buttons (File Upload, Language, Voice Mic, Send / Stop) */}
          <div className="flex items-center gap-1 shrink-0 pb-0.5">
            {/* Document / Image Upload Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              className={`h-9 w-9 rounded-xl flex items-center justify-center transition-colors border ${
                attachedFile
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                  : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100 hover:text-stone-900'
              }`}
              title="Attach document or image for decision analysis (PDF, text, images up to 5MB)"
              aria-label="Attach document or image"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Language Selector Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                className={`h-9 px-2 rounded-xl flex items-center gap-1 text-xs font-medium border transition-colors ${
                  selectedLanguage !== 'en'
                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                    : 'bg-stone-50 text-stone-600 border-stone-200 hover:bg-stone-100'
                }`}
                title="Select decision language (English, Hindi, Kannada)"
                aria-label={`Current language: ${selectedLanguage}. Click to change language.`}
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="uppercase font-semibold text-[11px]">{selectedLanguage}</span>
              </button>

              {isLanguageMenuOpen && (
                <div className="absolute bottom-11 right-0 w-36 bg-white border border-stone-200 rounded-xl shadow-lg p-1 z-30 animate-fade-in text-xs">
                  <div className="px-2 py-1 text-[10px] font-semibold uppercase text-stone-400">
                    Language
                  </div>
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      type="button"
                      onClick={() => {
                        setSelectedLanguage(lang.code);
                        setIsLanguageMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors ${
                        selectedLanguage === lang.code
                          ? 'bg-stone-900 text-white font-medium'
                          : 'text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      <span>{lang.native}</span>
                      {selectedLanguage === lang.code && <Check className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Voice Input Microphone Button */}
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isLoading}
              className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                isRecording
                  ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse shadow-xs'
                  : 'bg-stone-100 text-stone-700 hover:bg-stone-200 active:scale-95'
              }`}
              title={isRecording ? 'Stop recording voice' : 'Click to speak your dilemma (voice input)'}
              aria-label={isRecording ? 'Stop recording voice' : 'Speak your question'}
            >
              {isRecording ? (
                <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
              ) : (
                <Mic className="w-4 h-4 sm:w-5 sm:h-5 text-stone-600" />
              )}
            </button>

            {/* Send / Stop Request Button */}
            {isLoading ? (
              <button
                type="button"
                onClick={onCancelRequest}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-100 text-amber-800 hover:bg-amber-200 flex items-center justify-center transition-colors focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                title="Stop response"
                aria-label="Stop response"
              >
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all ${
                  canSubmit
                    ? 'bg-stone-900 text-white hover:bg-stone-800 active:scale-95 shadow-xs focus:ring-2 focus:ring-stone-500'
                    : 'bg-stone-100 text-stone-300 cursor-not-allowed'
                }`}
                title={canSubmit ? 'Send message (Enter)' : 'Type or speak a question to send'}
                aria-label="Send message"
              >
                <ArrowUp className="w-5 h-5 stroke-[2.5]" />
              </button>
            )}
          </div>
        </div>

        {/* Accessibility & Keyboard Hints */}
        <div className="flex items-center justify-between px-2 pt-1.5 text-[11px] text-stone-400">
          <span>
            <kbd className="font-mono bg-stone-100 text-stone-600 px-1 py-0.5 rounded text-[10px] border border-stone-200">
              Enter
            </kbd>{' '}
            to send,{' '}
            <kbd className="font-mono bg-stone-100 text-stone-600 px-1 py-0.5 rounded text-[10px] border border-stone-200">
              Shift+Enter
            </kbd>{' '}
            for new line
          </span>
          <span className="hidden sm:inline">
            {selectedLanguage === 'hi'
              ? 'हिंदी समर्थित • Gemini 3.8 Flash'
              : selectedLanguage === 'kn'
              ? 'ಕನ್ನಡ ಬೆಂಬಲಿತ • Gemini 3.8 Flash'
              : 'Voice & Multilingual • Gemini 3.8 Flash'}
          </span>
        </div>
      </form>
    </div>
  );
};
