'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

interface UseSpeechRecognitionProps {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition({ onResult, onError }: UseSpeechRecognitionProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);
  const onErrorRef = useRef(onError);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    setIsSupported(true);
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        onResultRef.current(finalTranscript);
        setIsListening(false);
        recognition.stop();
      }
    };

    recognition.onerror = (event: any) => {
      setIsListening(false);
      if (onErrorRef.current) onErrorRef.current(event.error);
    };

    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
  }, []);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setIsListening(true);
      try { recognitionRef.current.start(); } catch (e) { setIsListening(false); }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      try { recognitionRef.current.stop(); } catch (e) {}
      setIsListening(false);
    }
  }, [isListening]);

  return { isListening, isSupported, startListening, stopListening };
}