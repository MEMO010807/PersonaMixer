import { useState, useEffect, useCallback, useRef } from 'react';

export function useSpeech(
    onRecognized: (text: string) => void,
    onFinalize?: () => void
) {
    const [isListening, setIsListening] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [interimText, setInterimText] = useState("");
    const recognitionRef = useRef<any>(null);
    // We use a ref for the state to access inside event listeners without re-binding everything
    const stateRef = useRef(isListening);

    useEffect(() => {
        stateRef.current = isListening;
    }, [isListening]);

    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) && navigator.onLine) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            const rec = recognitionRef.current;

            rec.continuous = true;
            rec.interimResults = true;
            rec.lang = 'en-US';

            rec.onstart = () => {
                console.log('Speech recognition started');
            };

            rec.onresult = (event: any) => {
                let currentTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }

                // Chrome sometimes never fires isFinal if there's no pause. 
                // By dispatching every continuous change, we ensure nothing is lost.
                setInterimText(currentTranscript);

                // If it IS marked final, send it out immediately and clear interim
                if (event.results[event.results.length - 1].isFinal) {
                    onRecognized(currentTranscript);
                    setInterimText("");
                }
            };

            rec.onerror = (event: any) => {
                console.warn('SpeechRecognition error:', event.error);
                if (event.error === 'not-allowed') {
                    setError("Microphone permission denied.");
                    setIsListening(false);
                } else if (event.error === 'network') {
                    console.warn('Speech recognition warning: Network error. Retrying is allowed.');
                    setIsListening(false);
                } else if (event.error === 'no-speech') {
                    // Ignore no-speech, let onend handle the auto-restart
                }
            };

            rec.onend = () => {
                console.log('Speech recognition ended. isListening state:', stateRef.current);

                // If Chrome drops the mic due to silence, let's flush any interim text we had
                // Since stateRef allows access to current state, we need to pass the interim out
                // We'll rely on the normal typing bar to hold the state.
                setInterimText("");

                // Handle Android Chrome edge cases: restart if it unexpectedly stops while state says listening
                if (stateRef.current) {
                    try {
                        rec.start();
                    } catch (e) {
                        console.error('Failed to auto-restart recognition:', e);
                        setIsListening(false);
                    }
                } else {
                    if (onFinalize) onFinalize();
                }
            };
        } else {
            // setError("Speech recognition offline or unavailable in this browser.");
        }

        // handle offline online switches
        const onOffline = () => { /* Suppress permanent offline block */ };
        const onOnline = () => setError(null);
        window.addEventListener('offline', onOffline);
        window.addEventListener('online', onOnline);

        return () => {
            window.removeEventListener('offline', onOffline);
            window.removeEventListener('online', onOnline);
            if (recognitionRef.current) {
                try { recognitionRef.current.abort(); } catch (e) { }
            }
        };
    }, [onRecognized, onFinalize]);

    const toggleListening = useCallback(() => {
        if (isListening) {
            setIsListening(false);
            setInterimText("");
            try { recognitionRef.current?.stop(); } catch (e) { }
        } else {
            try {
                setInterimText("");
                recognitionRef.current?.start();
                setIsListening(true);
                setError(null);
            } catch (err: any) {
                if (err.name !== 'InvalidStateError') {
                    console.error("Failed to start speech recognition:", err);
                    setError("Failed to start speech recognition.");
                    setIsListening(false);
                }
            }
        }
    }, [isListening, error]);

    return { isListening, toggleListening, error, interimText };
}
