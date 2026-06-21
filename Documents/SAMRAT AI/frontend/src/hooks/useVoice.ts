'use client';

import { useState, useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';

const langToCode: Record<string, string> = {
  'English': 'en-US',
  'Hindi': 'hi-IN',
  'Telugu': 'te-IN',
  'Marathi': 'mr-IN',
  'Tamil': 'ta-IN',
  'Kannada': 'kn-IN',
  'Malayalam': 'ml-IN',
  'Bengali': 'bn-IN',
  'Gujarati': 'gu-IN',
  'Punjabi': 'pa-IN'
};

const accentToCode: Record<string, string> = {
  'American': 'en-US',
  'British': 'en-GB',
  'Indian': 'en-IN',
  'Australian': 'en-AU'
};

interface UseVoiceOptions {
  onTranscript: (text: string) => void;
  onResponseEnd?: () => void;
  onError?: (error: string) => void;
  onWakeWordDetected?: (trailingCommand: string) => void;
}

export const useVoice = (options: UseVoiceOptions) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  
  const [assistantState, setAssistantState] = useState<'passive' | 'active'>('passive');
  const assistantStateRef = useRef<'passive' | 'active'>('passive');
  const manualStopRef = useRef(false);

  const { languageSettings, voiceSettings } = useChatStore();
  const voiceSettingsRef = useRef(voiceSettings);
  
  useEffect(() => {
    voiceSettingsRef.current = voiceSettings;
  }, [voiceSettings]);
  
  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const isSpeakingRef = useRef(false);

  // Maintain latest callback references
  const onTranscriptRef = useRef(options.onTranscript);
  const onResponseEndRef = useRef(options.onResponseEnd);
  const onErrorRef = useRef(options.onError);
  const onWakeWordDetectedRef = useRef(options.onWakeWordDetected);

  useEffect(() => {
    onTranscriptRef.current = options.onTranscript;
    onResponseEndRef.current = options.onResponseEnd;
    onErrorRef.current = options.onError;
    onWakeWordDetectedRef.current = options.onWakeWordDetected;
  }, [options.onTranscript, options.onResponseEnd, options.onError, options.onWakeWordDetected]);

  const setAssistantStateWrapper = (state: 'passive' | 'active') => {
    assistantStateRef.current = state;
    setAssistantState(state);
  };

  const silenceTimerRef = useRef<any>(null);

  const resetSilenceTimer = () => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    if (assistantStateRef.current === 'active') {
      silenceTimerRef.current = setTimeout(() => {
        setAssistantStateWrapper('passive');
      }, 120000); // Extended from 15s to 2 mins
    }
  };

  const speakRef = useRef<any>(null);

  useEffect(() => {
    // Check Speech Recognition & Synthesis availability
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        // Force continuous to true if we are in passive mode to keep it always on
        recognition.continuous = assistantStateRef.current === 'passive' ? true : voiceSettingsRef.current.continuousMode;
        recognition.interimResults = false;
        
        // Use configured text language for recognition
        recognition.lang = langToCode[languageSettings.textLanguage] || 'en-US';

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onend = () => {
          setIsListening(false);
          
          if (manualStopRef.current) {
            manualStopRef.current = false;
            // If stopped manually, fall back to passive mode (wake word) if enabled
            setAssistantStateWrapper('passive');
            return;
          }

          // Robust restart if in passive mode, or if active and continuous mode is enabled
          const shouldRestart = (!isSpeakingRef.current) && (
            assistantStateRef.current === 'passive' || 
            (assistantStateRef.current === 'active' && voiceSettingsRef.current.continuousMode)
          );
          
          if (shouldRestart) {
            try {
              recognition.start();
            } catch (e) {
              // ignore already started errors
            }
          }
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[event.results.length - 1][0].transcript.trim();
          if (transcript) {
            // INTERRUPTION LOGIC: if user speaks while assistant is speaking, stop TTS
            if (isSpeakingRef.current) {
              if (synthesisRef.current) {
                synthesisRef.current.cancel();
              }
              setIsSpeaking(false);
              isSpeakingRef.current = false;
            }

            if (assistantStateRef.current === 'passive') {
              const wakeWords = ['samrat', 'echo', 'friday'];
              const customWakeWord = voiceSettingsRef.current.wakeWord;
              if (customWakeWord && !wakeWords.includes(customWakeWord.toLowerCase())) {
                 wakeWords.push(customWakeWord.toLowerCase());
              }
              
              const tLower = transcript.toLowerCase();
              let matchedWakeWord = '';
              const isWakeWord = wakeWords.some(w => {
                if (tLower.includes(w)) {
                  matchedWakeWord = w;
                  return true;
                }
                return false;
              });
              
              if (isWakeWord) {
                setAssistantStateWrapper('active');
                
                // Try to extract the command if they spoke it in the same breath
                const wakeIndex = tLower.indexOf(matchedWakeWord);
                const afterWake = transcript.substring(wakeIndex + matchedWakeWord.length).trim();
                
                // Ignore small noise like punctuation
                const isJustNoise = afterWake.replace(/[^a-zA-Z0-9]/g, '').length < 2;

                if (!isJustNoise) {
                  // Process immediately
                  if (onWakeWordDetectedRef.current) {
                    onWakeWordDetectedRef.current(afterWake);
                  }
                  resetSilenceTimer();
                  onTranscriptRef.current(afterWake);
                } else {
                  // Only wake word detected
                  if (onWakeWordDetectedRef.current) {
                    onWakeWordDetectedRef.current('');
                  }
                  resetSilenceTimer();
                  if (speakRef.current) {
                    if (voiceSettingsRef.current.activationSoundEnabled !== false) {
                      speakRef.current("Yes? I'm listening.");
                    } else {
                      if (voiceSettingsRef.current.continuousMode) {
                        setTimeout(() => {
                          try { recognitionRef.current.start(); } catch(e) { }
                        }, 500);
                      }
                    }
                  }
                }
              } else {
                // Wake word is optional, process the transcript directly
                setAssistantStateWrapper('active');
                resetSilenceTimer();
                onTranscriptRef.current(transcript);
              }
            } else {
              // Active mode
              resetSilenceTimer();
              onTranscriptRef.current(transcript);
            }
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setIsListening(false);
          
          // Ignore normal user stop/abort actions
          if (event.error === 'aborted') {
            return;
          }

          if (onErrorRef.current) {
            let msg = event.error;
            if (event.error === 'not-allowed') {
              msg = 'Microphone permission blocked. Please enable mic access in your browser settings.';
            } else if (event.error === 'network') {
              msg = 'Speech network error. Please verify connection.';
            } else if (event.error === 'no-speech') {
              // Ignore no-speech error gracefully without showing ugly alerts
              // Just let it retry continuously
              return; 
            }
            onErrorRef.current(msg);
          }
        };

        recognitionRef.current = recognition;
        setTimeout(() => setSpeechSupported(true), 0);
      }
      
      synthesisRef.current = window.speechSynthesis;
    }
  }, []); // Run only on mount


  const startListening = async () => {
    if (!speechSupported || !recognitionRef.current) {
      alert('Speech recognition is not supported in this browser. Please try Google Chrome.');
      return;
    }
    // Stop speaking if active
    stopSpeaking();

    // Request permission explicitly on phone/desktop browsers to trigger user prompt
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Release stream tracks immediately after permission check
        stream.getTracks().forEach(track => track.stop());
      }
    } catch (e: any) {
      console.warn('Microphone permission request rejected:', e);
      if (onErrorRef.current) {
        onErrorRef.current('Microphone permission denied. Please allow mic access in your site settings.');
      }
      return;
    }

    try {
      setAssistantStateWrapper('active');
      resetSilenceTimer();
      recognitionRef.current.continuous = voiceSettingsRef.current.continuousMode;
      recognitionRef.current.start();
    } catch (e: any) {
      console.warn(e);
      // If recognition is already starting or active, ignore and sync state
      if (e.name === 'InvalidStateError' || (e.message && e.message.includes('already started'))) {
        setAssistantStateWrapper('active');
        setIsListening(true);
        return;
      }
      if (onErrorRef.current) {
        onErrorRef.current(e.message || 'Failed to initialize microphone interface');
      }
    }
  };

  const startPassiveListening = async () => {
    if (!speechSupported || !recognitionRef.current) return;
    try {
      setAssistantStateWrapper('passive');
      recognitionRef.current.continuous = true; // Always on in passive mode
      recognitionRef.current.start();
    } catch (e: any) {
      if (e.name === 'InvalidStateError' || (e.message && e.message.includes('already started'))) {
        setAssistantStateWrapper('passive');
        setIsListening(true);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        manualStopRef.current = true;
        recognitionRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }
  };

  const speak = (text: string) => {
    if (!synthesisRef.current) return;
    
    // Do NOT stop listening if continuous mode is enabled, to allow interruptions.
    if (!voiceSettings.continuousMode) {
      stopListening();
    } else {
      // If continuous mode, ensure recognition is running to catch interruptions
      try {
        recognitionRef.current?.start();
      } catch (e) { /* already running */ }
    }
    
    // Cancel ongoing speech
    synthesisRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    // Apply pitch and speed
    utterance.pitch = voiceSettings.pitch || 1;
    utterance.rate = voiceSettings.speed || 1;
    
    const voices = synthesisRef.current.getVoices();
    let targetLang = langToCode[languageSettings.voiceLanguage] || 'en-US';
    
    // Apply accent for English
    if (languageSettings.voiceLanguage === 'English' && voiceSettings.accent) {
      targetLang = accentToCode[voiceSettings.accent] || 'en-US';
    }
    
    const langVoices = voices.filter(v => v.lang.startsWith(targetLang.split('-')[0]));
    
    let chosenVoice;
    
    // Personality heuristic filtering
    const isMale = voiceSettings.personality === 'Male';
    const isFemale = voiceSettings.personality === 'Female' || voiceSettings.personality === 'Friendly';
    
    if (isMale) {
      chosenVoice = langVoices.find(v => v.name.toLowerCase().includes('male') || v.name.toLowerCase().includes('guy'));
    } else if (isFemale) {
      const femaleVoiceNames = ['jenny', 'aria', 'samantha', 'zira', 'female', 'tessa', 'susan', 'karen'];
      chosenVoice = langVoices.find(v => femaleVoiceNames.some(f => v.name.toLowerCase().includes(f)));
    }
    
    if (!chosenVoice && langVoices.length > 0) {
      // Prioritize Google / Natural voices if available
      chosenVoice = langVoices.find(v => v.name.includes('Natural') || v.name.includes('Google')) || langVoices[0];
    }
    
    if (!chosenVoice) {
      chosenVoice = voices[0];
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      isSpeakingRef.current = false;
      if (onResponseEndRef.current) {
        onResponseEndRef.current();
      }
      
      // Auto-restart listening if continuous mode is enabled
      if (voiceSettings.continuousMode && speechSupported && recognitionRef.current) {
        setTimeout(() => {
          try {
            recognitionRef.current.start();
          } catch(e) { /* ignore */ }
        }, 500);
      }
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
    };

    synthesisRef.current.speak(utterance);
  };

  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
      isSpeakingRef.current = false;
    }
  };

  // Bind speak to the ref so onresult can use it safely
  useEffect(() => {
    speakRef.current = speak;
  }, [speak]);

  // Expose manual state switch if needed, but for now we manage it mostly internally
  return {
    isListening,
    isSpeaking,
    speechSupported,
    assistantState,
    setAssistantState: setAssistantStateWrapper,
    startListening,
    startPassiveListening,
    stopListening,
    speak,
    stopSpeaking
  };
};
