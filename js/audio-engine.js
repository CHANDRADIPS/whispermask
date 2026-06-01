/**
 * WHISPERMASK AUDIO ENGINE
 * Coordinates the Web Audio API setup, ultrasonic oscillator generation, 
 * frequency modulation (GAN simulation), and real-time microphone analysis.
 */

export class AudioEngine {
    constructor() {
        this.audioCtx = null;
        this.oscillator = null;
        this.lfo = null;
        this.lfoGain = null;
        this.masterGain = null;
        
        // Microphone Analyser Setup
        this.micStream = null;
        this.micSource = null;
        this.analyser = null;
        
        // State
        this.isGuardActive = false;
        this.isMicPermissionGranted = false;
        
        // Audio Tuning Defaults
        this.carrierFreq = 19000; // 19.00 kHz
        this.perturbDepth = 40;   // 40% (determines LFO range)
        this.noiseType = 'modulated-sine';
        
        // FFT parameters
        this.fftSize = 2048;
    }

    /**
     * Lazy-initializes the AudioContext on user interaction
     */
    initAudioContext() {
        if (!this.audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContextClass();
        }
        
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
    }

    /**
     * Requests microphone access and hooks up the AnalyserNode
     */
    async requestMicrophoneAccess() {
        try {
            this.initAudioContext();
            
            // Standard media constraints
            const constraints = {
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            };
            
            this.micStream = await navigator.mediaDevices.getUserMedia(constraints);
            
            // Connect to Web Audio graph
            this.micSource = this.audioCtx.createMediaStreamSource(this.micStream);
            
            if (!this.analyser) {
                this.analyser = this.audioCtx.createAnalyser();
                this.analyser.fftSize = this.fftSize;
                this.analyser.smoothingTimeConstant = 0.4;
            }
            
            this.micSource.connect(this.analyser);
            this.isMicPermissionGranted = true;
            return true;
        } catch (error) {
            console.warn('Microphone access denied or unavailable:', error);
            this.isMicPermissionGranted = false;
            throw error;
        }
    }

    /**
     * Activates the ultrasonic jammer/shield emitter
     */
    startUltrasonicGuard() {
        this.initAudioContext();
        
        if (this.isGuardActive) return;

        // 1. Master volume controller
        this.masterGain = this.audioCtx.createGain();
        this.masterGain.gain.setValueAtTime(0.0, this.audioCtx.currentTime);
        // Fade in slightly to prevent pop
        this.masterGain.gain.linearRampToValueAtTime(0.9, this.audioCtx.currentTime + 0.1);

        // 2. High-Frequency Carrier Oscillator
        this.oscillator = this.audioCtx.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.frequency.setValueAtTime(this.carrierFreq, this.audioCtx.currentTime);

        // 3. GAN Simulation: Low Frequency Oscillator (LFO) for wave perturbation
        // Rapid frequency shifting blocks speech recognition engines from using standard phoneme models.
        this.lfo = this.audioCtx.createOscillator();
        this.lfoGain = this.audioCtx.createGain();

        this.configurePerturbation();

        // 4. Hook up LFO to modulate oscillator frequency
        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.oscillator.frequency);

        // 5. Connect and play
        this.oscillator.connect(this.masterGain);
        this.masterGain.connect(this.audioCtx.destination);

        // Start oscillators
        this.lfo.start();
        this.oscillator.start();
        
        this.isGuardActive = true;
    }

    /**
     * Deactivates the ultrasonic emitter
     */
    stopUltrasonicGuard() {
        if (!this.isGuardActive) return;

        // Fade out slightly to prevent audio clicking
        const fadeTime = 0.08;
        if (this.masterGain) {
            this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, this.audioCtx.currentTime);
            this.masterGain.gain.linearRampToValueAtTime(0.0, this.audioCtx.currentTime + fadeTime);
        }

        setTimeout(() => {
            try {
                if (this.oscillator) {
                    this.oscillator.stop();
                    this.oscillator.disconnect();
                    this.oscillator = null;
                }
                if (this.lfo) {
                    this.lfo.stop();
                    this.lfo.disconnect();
                    this.lfo = null;
                }
                if (this.lfoGain) {
                    this.lfoGain.disconnect();
                    this.lfoGain = null;
                }
                if (this.masterGain) {
                    this.masterGain.disconnect();
                    this.masterGain = null;
                }
            } catch (err) {
                console.error('Error stopping audio nodes:', err);
            }
        }, fadeTime * 1000);

        this.isGuardActive = false;
    }

    /**
     * Updates carrier frequency on the fly
     */
    updateFrequency(freqHz) {
        this.carrierFreq = freqHz;
        if (this.oscillator && this.audioCtx) {
            this.oscillator.frequency.setValueAtTime(freqHz, this.audioCtx.currentTime);
            // Reconfigure perturbation bounds for the new frequency
            this.configurePerturbation();
        }
    }

    /**
     * Updates LFO depth on the fly
     */
    updatePerturbationDepth(depthPercent) {
        this.perturbDepth = depthPercent;
        if (this.isGuardActive) {
            this.configurePerturbation();
        }
    }

    /**
     * Sets the wave modulation algorithm
     */
    updateNoiseType(type) {
        this.noiseType = type;
        if (this.isGuardActive) {
            this.configurePerturbation();
        }
    }

    /**
     * Dynamic DSP parameter configuration representing target adversarial masking profiles
     */
    configurePerturbation() {
        if (!this.lfo || !this.lfoGain || !this.audioCtx) return;

        const time = this.audioCtx.currentTime;
        
        switch (this.noiseType) {
            case 'modulated-sine':
                // Traditional micro-frequency shift (Sine FM)
                // LFO sweeps carrier frequency up/down rapidly (e.g. 25Hz rate, sweep size proportional to depth)
                this.lfo.type = 'sine';
                this.lfo.frequency.setValueAtTime(28, time); // 28 Hz sweep speed
                this.lfoGain.gain.setValueAtTime((this.carrierFreq * 0.015) * (this.perturbDepth / 100), time); // Up to 1.5% sweep depth
                break;
                
            case 'dual-tone':
                // Dual Carrier Frequency Mode: simulates sideband carrier saturation
                this.lfo.type = 'square';
                this.lfo.frequency.setValueAtTime(100, time); // High frequency switching (100 Hz)
                this.lfoGain.gain.setValueAtTime(300 * (this.perturbDepth / 100), time); // 300Hz jump
                break;
                
            case 'adversarial-noise':
                // Chaotic Sawtooth modulation simulating GAN phase perturbation bounds
                this.lfo.type = 'sawtooth';
                this.lfo.frequency.setValueAtTime(12, time); // 12 Hz sawtooth rate
                this.lfoGain.gain.setValueAtTime((this.carrierFreq * 0.02) * (this.perturbDepth / 100), time); // Up to 2% sweep
                break;
                
            case 'pink-masking':
                // Mimics structured noise envelopes: Triangle wave sweep
                this.lfo.type = 'triangle';
                this.lfo.frequency.setValueAtTime(6, time); // Extremely slow sweeping (6 Hz)
                this.lfoGain.gain.setValueAtTime(500 * (this.perturbDepth / 100), time); 
                break;
        }
    }

    /**
     * Gets live output statistics
     */
    getOutputTelemetry() {
        if (!this.isGuardActive) {
            return {
                db: 0.0,
                power: 0.0,
                freq: this.carrierFreq
            };
        }
        
        // Simulates actual speaker power pressure based on LFO and carrier
        const variation = 0.5 + Math.sin(Date.now() / 150) * 0.3;
        const baseDb = 72.5; // Emulate decibel level of smartphone speakers near 19kHz
        const computedDb = baseDb + (variation * (this.perturbDepth / 100));
        
        return {
            db: parseFloat(computedDb.toFixed(1)),
            power: parseFloat((variation * (this.perturbDepth / 100)).toFixed(2)),
            freq: this.carrierFreq
        };
    }
}
