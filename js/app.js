/**
 * WHISPERMASK MAIN CONTROL APPLICATION
 * Orchestrates all application modules, hooks up UI event listeners,
 * and maintains reactive visual telemetry state.
 */

import { AudioEngine } from './audio-engine.js';
import { SpectrogramVisualizer } from './spectrogram.js';
import { IoTThreatRadar } from './radar.js';
import { GanConsole } from './console.js';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Instantiation
    const audio = new AudioEngine();
    const spectrogram = new SpectrogramVisualizer('spectrogram-canvas');
    const terminal = new GanConsole('console-terminal');
    
    // Instantiate Radar and hook its discovery callback to the console terminal
    const radar = new IoTThreatRadar('radar-canvas', 'radar-device-card', (action, data) => {
        if (action === 'discover') {
            terminal.log(`DEVICE DISCOVERED: ${data.name} (IP: ${data.ip})`, 'text-magenta');
        } else if (action === 'select') {
            terminal.log(`TARGET DEVICE SELECTED: ${data.name}. Ready to deploy targeted ultrasonic vector.`, 'text-cyan');
            
            // If shield is active on device change, instantly start jamming the newly selected device
            if (audio.isGuardActive) {
                radar.updateJamProgress(92 + Math.floor(Math.random() * 7));
            }
        }
    });

    // Connect visualizer to audio engine
    spectrogram.connect(audio);
    spectrogram.start();

    // 2. UI Selector Cache
    const shieldToggleBtn = document.getElementById('shield-toggle');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    
    const freqSlider = document.getElementById('freq-slider');
    const freqValLabel = document.getElementById('freq-val');
    
    const perturbSlider = document.getElementById('perturb-slider');
    const perturbValLabel = document.getElementById('perturb-val');
    
    const noiseTypeSelect = document.getElementById('noise-type');
    
    const scanBtn = document.getElementById('radar-scan-btn');
    const micPermissionBtn = document.getElementById('mic-permission-btn');
    const micStatusIndicator = document.getElementById('mic-status-indicator');
    
    const dbOutputLabel = document.getElementById('diag-db-output');
    const jamEffectLabel = document.getElementById('diag-jam-effect');
    const latencyLabel = document.getElementById('telemetry-latency');
    const batteryLabel = document.getElementById('telemetry-battery');
    
    let diagInterval = null;

    // 3. EVENT LISTENERS

    // 3.1 Shield Activation Toggle
    shieldToggleBtn.addEventListener('click', () => {
        // First gesture, initialize AudioContext context safety
        audio.initAudioContext();

        if (!audio.isGuardActive) {
            // ACTIVATE SHIELD
            audio.startUltrasonicGuard();
            document.body.classList.add('shield-active');
            
            // UI Visual updates
            statusDot.className = 'status-pulse-dot active';
            statusText.innerText = 'SHIELD ENGAGED // CONE OF SILENCE';
            
            // Enable dashboard controls that affect active shield
            freqSlider.disabled = false;
            perturbSlider.disabled = false;
            noiseTypeSelect.disabled = false;

            // Trigger Console stream
            terminal.startTelemetryStream(audio.carrierFreq);

            // If a device is selected on radar, trigger its defense neutralization
            if (radar.selectedDevice) {
                const targetPercentage = 92 + Math.floor(Math.random() * 7); // 92% to 98%
                radar.updateJamProgress(targetPercentage);
            }

            // Start hardware diagnostics polling
            startDiagnosticsPolling();
        } else {
            // DEACTIVATE SHIELD
            audio.stopUltrasonicGuard();
            document.body.classList.remove('shield-active');
            
            // UI Visual updates
            statusDot.className = 'status-pulse-dot';
            statusText.innerText = 'SHIELD DEACTIVATED';
            
            // Disable sliders
            freqSlider.disabled = true;
            perturbSlider.disabled = true;
            noiseTypeSelect.disabled = true;

            // Log deactivation
            terminal.stopTelemetryStream();
            terminal.log('🛑 SHIELD SHUTDOWN COMPLETE. Standby.', 'text-magenta');

            // Reset radar jamming progress bars to 0%
            if (radar.selectedDevice) {
                radar.devices.forEach(d => {
                    if (d.threat === 'NEUTRALIZED') {
                        d.threat = d.id === 'device-4' ? 'MEDIUM' : 'HIGH';
                        d.color = d.id === 'device-4' ? '#ffcc00' : '#ff0055';
                    }
                });
                radar.updateJamProgress(0);
            }

            // Stop diagnostics polling
            stopDiagnosticsPolling();
        }
    });

    // 3.2 Carrier Frequency Slider
    freqSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        freqValLabel.innerText = `${(val / 1000).toFixed(2)} kHz`;
        audio.updateFrequency(val);
    });

    // 3.3 Perturbation Depth Slider
    perturbSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        perturbValLabel.innerText = `${val}%`;
        audio.updatePerturbationDepth(val);
    });

    // 3.4 Modulated Noise Type Select
    noiseTypeSelect.addEventListener('change', (e) => {
        const val = e.target.value;
        audio.updateNoiseType(val);
        terminal.log(`Perturbation profile updated: ${val.toUpperCase()}`, 'text-purple');
    });

    // 3.5 IoT Radar Scan Network Trigger
    scanBtn.addEventListener('click', () => {
        if (radar.isScanning) {
            radar.stopScanning();
            scanBtn.innerText = 'SCAN NETWORK';
            scanBtn.classList.remove('scanning');
            if (!audio.isGuardActive) {
                statusDot.className = 'status-pulse-dot';
                statusText.innerText = 'SHIELD DEACTIVATED';
            }
        } else {
            radar.startScanning();
            scanBtn.innerText = 'STOP SCAN';
            scanBtn.classList.add('scanning');
            statusDot.className = 'status-pulse-dot scanning';
            statusText.innerText = 'SCANNING LOCAL NETWORK...';
            terminal.logNetworkScanStart();
        }
    });

    // 3.6 Microphone Live Spectrum Link
    micPermissionBtn.addEventListener('click', async () => {
        try {
            micPermissionBtn.innerText = 'AUTHORIZING...';
            const granted = await audio.requestMicrophoneAccess();
            
            if (granted) {
                micPermissionBtn.innerText = 'MIC ON';
                micPermissionBtn.disabled = true;
                micStatusIndicator.className = 'small-btn-indicator granted';
                terminal.log('🎙️ Live microphone feedback successfully authorized. FFT spectrogram operational.', 'text-green');
            }
        } catch (err) {
            micPermissionBtn.innerText = 'DENIED';
            micStatusIndicator.className = 'small-btn-indicator';
            terminal.log('❌ Microphone authorization rejected. Rendering simulated baseline.', 'text-magenta');
        }
    });

    // 4. TELEMETRY & DIAGNOSTICS POLLING

    function startDiagnosticsPolling() {
        if (diagInterval) clearInterval(diagInterval);
        
        diagInterval = setInterval(() => {
            const telemetry = audio.getOutputTelemetry();
            
            // Decibel output
            dbOutputLabel.innerText = `${telemetry.db} dBA`;
            
            // Jamming percentage: scales with depth slider + slight noise jitter
            let jamValue = 0;
            if (audio.isGuardActive) {
                const baseVal = 70 + (audio.perturbDepth * 0.25); // Range ~70% to 95%
                const jitter = Math.sin(Date.now() / 200) * 1.5;
                jamValue = Math.min(100, Math.max(0, baseVal + jitter));
            }
            jamEffectLabel.innerText = `${jamValue.toFixed(1)}%`;

            // Latency jitter: simulate lightning fast dsp processing
            const latency = (0.2 + Math.random() * 0.15).toFixed(2);
            latencyLabel.innerText = `${latency}ms`;
        }, 400);
    }

    function stopDiagnosticsPolling() {
        if (diagInterval) {
            clearInterval(diagInterval);
            diagInterval = null;
        }
        dbOutputLabel.innerText = '0.0 dBA';
        jamEffectLabel.innerText = '0.0%';
        latencyLabel.innerText = '0.0ms';
    }

    // 5. BATTERY TELEMETRY MOCKUP (Using Navigator if available)
    if (navigator.getBattery) {
        navigator.getBattery().then(bat => {
            const updateBat = () => {
                batteryLabel.innerText = `${Math.round(bat.level * 100)}%`;
            };
            updateBat();
            bat.addEventListener('levelchange', updateBat);
        });
    } else {
        // Fallback realistic battery meter
        let batLevel = 84;
        batteryLabel.innerText = `${batLevel}%`;
        setInterval(() => {
            if (Math.random() > 0.95 && batLevel > 1) {
                batLevel--;
                batteryLabel.innerText = `${batLevel}%`;
            }
        }, 10000);
    }
});
