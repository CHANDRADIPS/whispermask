/**
 * WHISPERMASK GAN TELEMETRY CONSOLE
 * Coordinates the scrolling hacker-terminal display.
 * Generates dynamic, mathematics-aligned DSP & ASR perturbation logs.
 */

export class GanConsole {
    constructor(elementId) {
        this.element = document.getElementById(elementId);
        if (!this.element) {
            console.error(`Terminal element '${elementId}' not found.`);
            return;
        }
        this.logInterval = null;
        this.maxLines = 80;
    }

    /**
     * Appends a log line to the scrolling viewport with optional text color class
     */
    log(text, cssClass = '') {
        const line = document.createElement('div');
        line.className = `console-line ${cssClass}`;
        
        // Add a timestamp
        const time = new Date().toLocaleTimeString().split(' ')[0];
        line.innerText = `[${time}] ${text}`;
        
        this.element.appendChild(line);
        
        // Keep elements in check to prevent DOM bloating
        if (this.element.childElementCount > this.maxLines) {
            this.element.removeChild(this.element.firstChild);
        }
        
        // Smooth scroll to bottom
        this.element.scrollTop = this.element.scrollHeight;
    }

    /**
     * Clears console
     */
    clear() {
        this.element.innerHTML = '';
    }

    /**
     * Starts the scrolling active-guard mathematical logging routine
     */
    startTelemetryStream(carrierFreq) {
        this.stopTelemetryStream();
        
        this.log('SHIELD INITIATING...', 'text-magenta');
        this.log('Loading compact adversarial weights: Alexa/Siri/Google STT...', 'text-purple');
        
        // Pre-canned adversarial math steps for hackathon wow factor
        const preActivationSequence = [
            'Allocating GPU context (TFLite quantized 8-bit model)...',
            'Resolving ASR decision boundaries (Loss threshold = 0.045)...',
            'Extracting live microphone Mel-Frequency Cepstral Coefficients (MFCC)...',
            'Injecting gradient-descent noise vector into carrier buffer...',
            'Calculating inverse Fourier transform on perturbed frame...',
            'Ultrasonic modulation active. Pitch carrier: ' + (carrierFreq / 1000).toFixed(2) + ' kHz.',
            '🛡️ SHIELD ENGAGED. INVOKE CONE OF SILENCE.',
        ];

        let index = 0;
        const initTimer = setInterval(() => {
            if (index < preActivationSequence.length) {
                const isSuccess = index === preActivationSequence.length - 1;
                this.log(preActivationSequence[index], isSuccess ? 'text-green' : 'text-cyan');
                index++;
            } else {
                clearInterval(initTimer);
                this.startRunningTelemetryLoop(carrierFreq);
            }
        }, 150);
    }

    /**
     * Starts the periodic loop showing continuous calculation feedback
     */
    startRunningTelemetryLoop(carrierFreq) {
        const loopMsgs = [
            () => `Calculating perturbation delta (L2-norm = ${((Math.random() * 0.02) + 0.01).toFixed(4)})`,
            () => `Bypassing Google STT acoustic layer (Prediction Confidence: ${(Math.random() * 2.1).toFixed(2)}%)`,
            () => `Amazon Alexa Voice Service decision limit reached (Null index flag set)`,
            () => `Modulating carrier target frequency at ${(carrierFreq + (Math.random() * 400 - 200)).toFixed(0)} Hz`,
            () => `Acoustic pre-amp saturation feedback: ${((Math.random() * 5) + 93).toFixed(1)}% Saturation Index`,
            () => `Perturbing frames: Siri phonetic prediction -> "#unintelligible phonemes#"`
        ];

        this.logInterval = setInterval(() => {
            const randomMsgGenerator = loopMsgs[Math.floor(Math.random() * loopMsgs.length)];
            this.log(randomMsgGenerator(), 'text-secondary');
        }, 1800);
    }

    /**
     * Stops active telemetry logging
     */
    stopTelemetryStream() {
        if (this.logInterval) {
            clearInterval(this.logInterval);
            this.logInterval = null;
        }
    }

    /**
     * Logs network interface scanning telemetry
     */
    logNetworkScanStart() {
        this.log('INITIATING LOCAL NETWORK DISCOVERY...', 'text-cyan');
        this.log('Binding sockets to mDNS (224.0.0.251:5353) & SSDP (239.255.255.250:1900)...');
        
        const scanSteps = [
            'Broadcasting ARP queries across subnet 192.168.1.0/24...',
            'Recv SSDP reply: ST=urn:schemas-upnp-org:device:MediaRenderer (Samsung TV)...',
            'Recv mDNS packet: _googlecast._tcp.local (Google Nest Hub)...',
            'Recv mDNS packet: _apple-airplay._tcp.local (Apple HomePod)...',
            'Resolving hardware manufacturer MAC prefix mappings...',
            'Fingerprinting IoT nodes via passive response delays... DONE.'
        ];

        let index = 0;
        const scanTimer = setInterval(() => {
            if (index < scanSteps.length) {
                this.log(scanSteps[index], 'text-purple');
                index++;
            } else {
                clearInterval(scanTimer);
                this.log('Network scan completed. 4 potential eavesdroppers identified.', 'text-green');
            }
        }, 300);
    }
}
