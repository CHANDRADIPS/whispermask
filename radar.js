/**
 * WHISPERMASK IOT THREAT RADAR
 * Interactive circular radar display that maps smart speakers in the local environment.
 * Incorporates brand fingerprinting, signal levels, and adaptive jamming verification.
 */

export class IoTThreatRadar {
    constructor(canvasId, deviceCardId, onDeviceSelectCallback) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            console.error(`Canvas '${canvasId}' not found.`);
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.deviceCard = document.getElementById(deviceCardId);
        this.onDeviceSelect = onDeviceSelectCallback;

        this.width = 0;
        this.height = 0;
        this.centerX = 0;
        this.centerY = 0;
        this.radius = 0;
        this.resize();

        // Animation state
        this.sweepAngle = 0;
        this.isScanning = false;
        this.animationId = null;
        
        // Mock smart device registry
        this.devices = [
            {
                id: 'device-1',
                name: 'AMAZON ECHO DOT',
                brand: 'Amazon',
                threat: 'HIGH',
                ip: '192.168.1.42',
                mac: 'FC:A6:67:8C:11:0A',
                rssi: -58,
                proto: 'mDNS (Bonjour)',
                angle: 45, // Degrees from top
                distance: 0.65, // Percentage of radar radius
                color: '#ff0055',
                glowing: true,
                discovered: false
            },
            {
                id: 'device-2',
                name: 'GOOGLE NEST HUB',
                brand: 'Google',
                threat: 'HIGH',
                ip: '192.168.1.109',
                mac: 'D8:F8:83:A2:BC:6D',
                rssi: -71,
                proto: 'SSDP (UPnP)',
                angle: 160,
                distance: 0.45,
                color: '#ff0055',
                glowing: true,
                discovered: false
            },
            {
                id: 'device-3',
                name: 'APPLE HOMEPOD MINI',
                brand: 'Apple',
                threat: 'HIGH',
                ip: '192.168.1.18',
                mac: 'A4:D1:8C:7E:24:99',
                rssi: -45,
                proto: 'mDNS (AirPlay)',
                angle: 280,
                distance: 0.8,
                color: '#ff0055',
                glowing: true,
                discovered: false
            },
            {
                id: 'device-4',
                name: 'SAMSUNG SMART TV',
                brand: 'Samsung',
                threat: 'MEDIUM',
                ip: '192.168.1.205',
                mac: '48:D0:5A:F3:11:C4',
                rssi: -82,
                proto: 'SSDP (DLNA)',
                angle: 220,
                distance: 0.35,
                color: '#ffcc00',
                glowing: false,
                discovered: false
            }
        ];

        this.selectedDevice = null;
        
        // Listeners
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    }

    /**
     * Resizes canvas to maintain aspect ratio and dimensions
     */
    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.width = rect.width;
        this.height = rect.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        // Keep inside boundaries
        this.radius = Math.min(this.width, this.height) / 2 - 10;

        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        this.ctx.scale(dpr, dpr);
    }

    /**
     * Triggers the local network threat scanner
     */
    startScanning() {
        if (this.isScanning) return;
        this.isScanning = true;
        this.sweepAngle = 0;
        
        // Reset discovered status
        this.devices.forEach(d => d.discovered = false);
        
        this.animate();
    }

    /**
     * Cancels active network scan
     */
    stopScanning() {
        this.isScanning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }

    /**
     * Main animation loop for the radar sweeps
     */
    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());
        this.render();
    }

    /**
     * Renders a single frame of the radar viewport
     */
    render() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.width, this.height);

        // 1. Draw circular radar grid lines
        this.ctx.strokeStyle = 'rgba(0, 255, 204, 0.1)';
        this.ctx.lineWidth = 1;
        
        // Outer boundary
        this.ctx.beginPath();
        this.ctx.arc(this.centerX, this.centerY, this.radius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Concentric division rings
        const divisionRings = [0.25, 0.5, 0.75];
        divisionRings.forEach(d => {
            this.ctx.beginPath();
            this.ctx.arc(this.centerX, this.centerY, this.radius * d, 0, Math.PI * 2);
            this.ctx.stroke();
        });

        // Crosshairs
        this.ctx.beginPath();
        this.ctx.moveTo(this.centerX - this.radius, this.centerY);
        this.ctx.lineTo(this.centerX + this.radius, this.centerY);
        this.ctx.moveTo(this.centerX, this.centerY - this.radius);
        this.ctx.lineTo(this.centerX, this.centerY + this.radius);
        this.ctx.stroke();

        // 2. Draw sweeping radar line and trails
        if (this.isScanning) {
            this.sweepAngle = (this.sweepAngle + 2) % 360;
            const radAngle = (this.sweepAngle * Math.PI) / 180;
            
            // Draw sweeping line gradient
            const sweepEndX = this.centerX + this.radius * Math.cos(radAngle);
            const sweepEndY = this.centerY + this.radius * Math.sin(radAngle);

            const gradient = this.ctx.createRadialGradient(
                this.centerX, this.centerY, 0,
                this.centerX, this.centerY, this.radius
            );
            gradient.addColorStop(0, 'rgba(0, 255, 204, 0.15)');
            gradient.addColorStop(1, 'rgba(0, 255, 204, 0)');

            // Sweep visual cone
            this.ctx.fillStyle = 'rgba(0, 255, 204, 0.05)';
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.arc(
                this.centerX, this.centerY, this.radius, 
                radAngle - (30 * Math.PI / 180), radAngle
            );
            this.ctx.closePath();
            this.ctx.fill();

            // Core sweep line
            this.ctx.strokeStyle = '#00ffcc';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.moveTo(this.centerX, this.centerY);
            this.ctx.lineTo(sweepEndX, sweepEndY);
            this.ctx.stroke();

            // 3. Discover devices when sweep line intercepts them
            this.devices.forEach(d => {
                if (!d.discovered) {
                    const diff = Math.abs(this.sweepAngle - d.angle);
                    // Check close overlap
                    if (diff < 3 || diff > 357) {
                        d.discovered = true;
                        
                        // Callback to trigger logging in the terminal
                        if (this.onDeviceSelect) {
                            this.onDeviceSelect('discover', d);
                        }
                    }
                }
            });
        }

        // 4. Draw discovered devices on the map
        this.devices.forEach(d => {
            if (!d.discovered && this.isScanning) return; // Hide undiscovered during active first scan

            const angleRad = (d.angle * Math.PI) / 180;
            const x = this.centerX + this.radius * d.distance * Math.cos(angleRad);
            const y = this.centerY + this.radius * d.distance * Math.sin(angleRad);

            // Pulse glowing ring on selected device
            if (this.selectedDevice && this.selectedDevice.id === d.id) {
                const pulse = 10 + Math.sin(Date.now() / 150) * 4;
                this.ctx.fillStyle = 'rgba(0, 255, 204, 0.15)';
                this.ctx.beginPath();
                this.ctx.arc(x, y, pulse, 0, Math.PI * 2);
                this.ctx.fill();
                
                this.ctx.strokeStyle = '#00ffcc';
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                this.ctx.arc(x, y, pulse + 3, 0, Math.PI * 2);
                this.ctx.stroke();
            }

            // Draw blip core
            this.ctx.fillStyle = d.color;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, Math.PI * 2);
            this.ctx.fill();

            // Glow border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 1.5;
            this.ctx.beginPath();
            this.ctx.arc(x, y, 6, 0, Math.PI * 2);
            this.ctx.stroke();

            // Draw threat labels or index identifier
            this.ctx.fillStyle = 'rgba(255,255,255,0.7)';
            this.ctx.font = 'bold 9px Share Tech Mono, monospace';
            this.ctx.fillText(d.brand.toUpperCase(), x + 10, y + 3);
        });
    }

    /**
     * Detect click events inside the canvas map to select smart devices
     */
    handleCanvasClick(event) {
        const rect = this.canvas.getBoundingClientRect();
        // Calculate relative coordinates in CSS pixels
        const clickX = event.clientX - rect.left;
        const clickY = event.clientY - rect.top;

        let closestDevice = null;
        let minDistance = 15; // Hit tolerance radius (in pixels)

        this.devices.forEach(d => {
            if (!d.discovered && this.isScanning) return;

            const angleRad = (d.angle * Math.PI) / 180;
            const x = this.centerX + this.radius * d.distance * Math.cos(angleRad);
            const y = this.centerY + this.radius * d.distance * Math.sin(angleRad);

            const dist = Math.hypot(clickX - x, clickY - y);
            if (dist < minDistance) {
                minDistance = dist;
                closestDevice = d;
            }
        });

        if (closestDevice) {
            this.selectDevice(closestDevice);
        }
    }

    /**
     * Selects a device and updates the side UI details card
     */
    selectDevice(device) {
        this.selectedDevice = device;
        
        // Trigger callback
        if (this.onDeviceSelect) {
            this.onDeviceSelect('select', device);
        }

        // Render card content
        const emptyState = this.deviceCard.querySelector('.card-empty-state');
        const content = this.deviceCard.querySelector('#device-card-content');
        
        emptyState.classList.add('hidden');
        content.classList.remove('hidden');

        document.getElementById('device-card-name').innerText = device.name;
        document.getElementById('device-card-ip').innerText = device.ip;
        document.getElementById('device-card-mac').innerText = device.mac;
        document.getElementById('device-card-rssi').innerText = `${device.rssi} dBm`;
        document.getElementById('device-card-proto').innerText = device.proto;

        this.updateJamProgress(0); // Start at 0 on select
    }

    /**
     * Smoothly updates threat level or jam progress statistics
     */
    updateJamProgress(targetPct) {
        const bar = document.getElementById('device-card-jam-bar');
        const pctText = document.getElementById('device-card-jam-pct');
        const threatBadge = document.getElementById('device-card-threat');

        if (!bar || !pctText) return;

        let current = 0;
        const duration = 800; // ms
        const steps = 20;
        const increment = targetPct / steps;
        const intervalTime = duration / steps;

        const timer = setInterval(() => {
            current += increment;
            if (current >= targetPct) {
                current = targetPct;
                clearInterval(timer);
            }
            
            const roundedVal = Math.round(current);
            bar.style.width = `${roundedVal}%`;
            pctText.innerText = `${roundedVal}%`;

            // Dynamic badges based on jamming percentage
            if (roundedVal >= 90) {
                threatBadge.innerText = 'NEUTRALIZED';
                threatBadge.className = 'badge threat-neutralized';
                
                // Update target device properties inside registry
                if (this.selectedDevice) {
                    this.selectedDevice.threat = 'NEUTRALIZED';
                    this.selectedDevice.color = '#00ff66';
                }
            } else if (roundedVal > 0) {
                threatBadge.innerText = 'JAMMING...';
                threatBadge.className = 'badge threat-med';
            } else {
                threatBadge.innerText = this.selectedDevice ? this.selectedDevice.threat : 'HIGH';
                threatBadge.className = this.selectedDevice && this.selectedDevice.threat === 'MEDIUM' ? 'badge threat-med' : 'badge threat-high';
            }
        }, intervalTime);
    }
}
