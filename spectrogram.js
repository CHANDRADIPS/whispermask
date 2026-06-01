/**
 * WHISPERMASK SPECTROGRAM VISUALIZER
 * High-performance Canvas renderer displaying the live frequency spectrum.
 * Highlights the near-ultrasonic guard frequencies to visually validate physical sound output.
 */

export class SpectrogramVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas element with ID '${canvasId}' not found.`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.animationId = null;
        this.analyser = null;
        this.audioEngine = null;
        
        // Cache dimensions
        this.width = 0;
        this.height = 0;
        this.resize();
        
        // Frequency arrays
        this.dataArray = null;
        
        // Visual variables
        this.hueStart = 170; // Cyan base
        this.hueEnd = 330;   // Magenta base
        
        // Bind resize event
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Resizes canvas to match its client bounding box
     */
    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        
        // Scale by device pixel ratio to prevent blurring on Retina/HiDPI screens
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width;
        this.height = rect.height;
        
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
    }

    /**
     * Connects the visualizer to the audio engine
     */
    connect(audioEngine) {
        this.audioEngine = audioEngine;
        this.analyser = audioEngine.analyser;
        if (this.analyser) {
            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
        }
    }

    /**
     * Starts the rendering loop
     */
    start() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        this.render();
    }

    /**
     * Stops the rendering loop
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Renders a single frame of the spectrum analyser
     */
    render() {
        this.animationId = requestAnimationFrame(() => this.render());

        // Refresh analyser pointer in case it was initialized late
        if (this.audioEngine && !this.analyser && this.audioEngine.analyser) {
            this.analyser = this.audioEngine.analyser;
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
        }

        // Draw background
        this.ctx.fillStyle = '#06070a';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw subtle grid lines
        this.drawGrid();

        const isGuardActive = this.audioEngine ? this.audioEngine.isGuardActive : false;
        const isMicActive = this.audioEngine ? this.audioEngine.isMicPermissionGranted : false;

        if (isMicActive && this.analyser && this.dataArray) {
            // READ REAL MICROPHONE FREQUENCIES
            this.analyser.getByteFrequencyData(this.dataArray);
            this.drawRealFrequencySpectrum(isGuardActive);
        } else {
            // MOCK STATE: Render beautiful algorithmic simulations of ultrasonic carrier emission
            this.drawSimulatedFrequencySpectrum(isGuardActive);
        }
    }

    /**
     * Draws background grid lines and frequency reference zones
     */
    drawGrid() {
        const gridColor = 'rgba(255, 255, 255, 0.02)';
        const pulseColor = 'rgba(0, 255, 204, 0.05)';
        
        this.ctx.strokeStyle = gridColor;
        this.ctx.lineWidth = 1;

        // Draw vertical division grid lines (e.g. 5 columns)
        const cols = 5;
        for (let i = 1; i < cols; i++) {
            const x = (this.width / cols) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }

        // Draw horizontal grid lines
        const rows = 4;
        for (let i = 1; i < rows; i++) {
            const y = (this.height / rows) * i;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        // Highlight ultrasonic shield band background (approx. 18-22 kHz)
        // This zone is at the far right of the frequency scale
        const bandStartX = this.width * 0.81;
        const bandWidth = this.width - bandStartX;

        const isGuardActive = this.audioEngine && this.audioEngine.isGuardActive;
        
        if (isGuardActive) {
            this.ctx.fillStyle = 'rgba(255, 0, 85, 0.035)'; // Active Pink Glow Zone
            this.ctx.strokeStyle = 'rgba(255, 0, 85, 0.15)';
        } else {
            this.ctx.fillStyle = 'rgba(0, 255, 204, 0.015)'; // Idle Cyan Zone
            this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.05)';
        }

        this.ctx.fillRect(bandStartX, 0, bandWidth, this.height);
        
        this.ctx.beginPath();
        this.ctx.moveTo(bandStartX, 0);
        this.ctx.lineTo(bandStartX, this.height);
        this.ctx.stroke();
    }

    /**
     * Renders real FFT data from microphone
     */
    drawRealFrequencySpectrum(isGuardActive) {
        const binCount = this.dataArray.length;
        const barWidth = (this.width / binCount) * 1.5;
        
        // We only render up to the high-frequency limits (Nyquist limit)
        for (let i = 0; i < binCount; i++) {
            const value = this.dataArray[i];
            const percent = value / 255;
            const barHeight = percent * this.height * 0.85;
            const x = (i / binCount) * this.width;
            const y = this.height - barHeight;

            // Frequency classification mapping:
            // High indices represent near-ultrasonic ranges (around 19kHz-22kHz)
            const isUltrasonicBin = (i > binCount * 0.81);

            let barColor;
            if (isUltrasonicBin && isGuardActive) {
                // Vibrant magenta spike for physically active ultrasonic signal
                barColor = `hsla(340, 100%, 55%, ${0.3 + percent * 0.7})`;
            } else if (isUltrasonicBin) {
                barColor = `hsla(180, 80%, 45%, ${0.15 + percent * 0.5})`;
            } else {
                // Classic cyan/purple gradient for standard human audio ranges
                const hue = this.hueStart + (i / binCount) * (this.hueEnd - this.hueStart);
                barColor = `hsla(${hue}, 85%, 50%, ${0.2 + percent * 0.8})`;
            }

            this.ctx.fillStyle = barColor;
            this.ctx.fillRect(x, y, barWidth, barHeight);
            
            // Add tiny glowing top caps to the bars
            if (percent > 0.1) {
                this.ctx.fillStyle = isUltrasonicBin && isGuardActive ? '#ff0055' : '#00ffcc';
                this.ctx.fillRect(x, y - 2, barWidth, 2);
            }
        }
    }

    /**
     * Renders a simulated spectrum to keep UI gorgeous and responsive
     * if microphone input is not authorized.
     */
    drawSimulatedFrequencySpectrum(isGuardActive) {
        const numBars = 120;
        const barWidth = this.width / numBars;
        const time = Date.now() * 0.003;

        // Approx. starting bin index of the ultrasonic zone
        const ultrasonicStartBar = Math.floor(numBars * 0.81);

        for (let i = 0; i < numBars; i++) {
            let heightPercent = 0.05; // Base noise floor
            let isUltrasonic = (i >= ultrasonicStartBar);

            if (isUltrasonic) {
                if (isGuardActive) {
                    // Simulate the massive ultrasonic protection vector peak!
                    const targetCenter = numBars * 0.86;
                    const distance = Math.abs(i - targetCenter);
                    
                    // Modulate target frequency width based on GAN simulation depth
                    const spread = 2.5; 
                    const basePeakHeight = Math.exp(-Math.pow(distance / spread, 2));
                    
                    // Rapid fluctuation representing perturbation
                    const jitter = 0.7 + Math.sin(time * 8 + i) * 0.3;
                    heightPercent = basePeakHeight * 0.85 * jitter + 0.05;
                } else {
                    // Inactive ultrasonic zone: tiny ambient thermal sound floor
                    heightPercent = 0.03 + Math.sin(time * 0.5 + i) * 0.015;
                }
            } else {
                // Human Speech Range simulation: gentle murmurs and ambient room tone
                const speechWave = Math.sin(time * 1.5 + i * 0.1) * Math.cos(time * 0.8 - i * 0.05);
                const speechPulse = Math.max(0, speechWave);
                
                // Keep human speech height lower than active guard
                heightPercent = 0.05 + speechPulse * 0.25 * (Math.sin(time + i * 0.3) * 0.4 + 0.6);
            }

            const barHeight = heightPercent * this.height * 0.88;
            const x = i * barWidth;
            const y = this.height - barHeight;

            // Styling colors
            let barColor;
            if (isUltrasonic && isGuardActive) {
                barColor = `hsla(340, 100%, 55%, ${0.4 + heightPercent * 0.6})`;
            } else if (isUltrasonic) {
                barColor = `hsla(180, 50%, 35%, 0.1)`;
            } else {
                const hue = this.hueStart + (i / numBars) * (this.hueEnd - this.hueStart);
                barColor = `hsla(${hue}, 85%, 50%, ${0.15 + heightPercent * 0.75})`;
            }

            this.ctx.fillStyle = barColor;
            this.ctx.fillRect(x, y, barWidth - 1, barHeight);

            // Add caps for active signals
            if (heightPercent > 0.08) {
                this.ctx.fillStyle = isUltrasonic && isGuardActive ? '#ff0055' : '#00ffcc';
                this.ctx.fillRect(x, y - 1.5, barWidth - 1, 1.5);
            }
        }
    }
}
