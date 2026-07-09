/**
 * About Page Component
 * Renders documentation, hardware wiring specifications, and architecture details.
 */
export const AboutPage = {
  mount(container) {
    container.innerHTML = `
      <div class="row g-4">
        <!-- System Description Card -->
        <div class="col-lg-8">
          <div class="glass-card mb-4">
            <h3 class="mb-3 text-info" style="font-family: var(--font-display); font-weight: 700;">
              <i class="bi bi-info-circle-fill me-2"></i>IoT Smart Street Light System
            </h3>
            <p style="color: var(--text-secondary);">
              This system is a production-quality IoT monitoring and adaptive control solution for modern municipal street lighting. 
              By combining embedded sensors, edge logic, a secure cloud database, and a real-time responsive administrator console, 
              the system optimizes power usage, records vehicular traffic, and monitors system health automatically.
            </p>
            <hr style="border-color: var(--border-subtle);">
            
            <h4 class="h5 mb-3" style="font-family: var(--font-display); font-weight: 600;">Key Capabilities</h4>
            <div class="row g-3">
              <div class="col-md-6">
                <div class="p-3 rounded bg-light" style="background-color: rgba(0,0,0,0.02) !important; border: 1px solid var(--border-subtle);">
                  <h5 class="h6 text-primary"><i class="bi bi-cpu-fill me-2"></i>Edge Adaptation</h5>
                  <small class="text-secondary">ESP32 adjusts lighting in real time based on physical LDR sensors, RTC calendar windows, and vehicular presence.</small>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 rounded bg-light" style="background-color: rgba(0,0,0,0.02) !important; border: 1px solid var(--border-subtle);">
                  <h5 class="h6 text-primary"><i class="bi bi-clock-history me-2"></i>Time Synchronization</h5>
                  <small class="text-secondary">Synchronizes time with NTP on boot and writes to physical DS1302/DS3231 RTC module to maintain scheduling schedules during connection outages.</small>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 rounded bg-light" style="background-color: rgba(0,0,0,0.02) !important; border: 1px solid var(--border-subtle);">
                  <h5 class="h6 text-primary"><i class="bi bi-lightning-charge-fill me-2"></i>Zero Latency Control</h5>
                  <small class="text-secondary">Manual overrides from the dashboard synchronize with the ESP32 controller in 1-2 seconds using database pooling state listeners.</small>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 rounded bg-light" style="background-color: rgba(0,0,0,0.02) !important; border: 1px solid var(--border-subtle);">
                  <h5 class="h6 text-primary"><i class="bi bi-bar-chart-fill me-2"></i>Traffic Metrics</h5>
                  <small class="text-secondary">Tracks traffic volumes across bidirectional pathways using distance scanning calculations and exports records to CSV/PDF formats.</small>
                </div>
              </div>
            </div>
          </div>
          
          <!-- System Design and Architecture -->
          <div class="glass-card">
            <h3 class="mb-3" style="font-family: var(--font-display); font-weight: 700;">System Architecture</h3>
            <div class="border rounded p-3 text-center" style="background-color: rgba(0,0,0,0.01); border-color: var(--border-subtle) !important;">
              <pre style="text-align: left; font-family: monospace; font-size: 0.8rem; overflow-x: auto; color: var(--text-secondary); margin-bottom: 0;">
  ┌───────────────────────────────────────────────────────────┐
  │                   ADMIN WEB DASHBOARD                     │
  │  (Vite + Vanilla JS Modules + Bootstrap 5 + Chart.js)    │
  └─────────────┬───────────────────────────────▲─────────────┘
                │ Sends overrides               │ Subscribes to Realtime
                ▼                               │ updates
  ┌─────────────────────────────────────────────┴─────────────┐
  │                     SUPABASE BACKEND                      │
  │     (PostgREST REST API + Realtime Socket + RLS Auth)     │
  └─────────────▲───────────────────────────────┬─────────────┘
                │ Inserts heartbeats            │ Polls settings
                │ & vehicle detections          │ & overrides
  ┌─────────────┴───────────────────────────────▼─────────────┐
  │                      ESP32 CONTROLLER                     │
  │        (RTClib + HTTPClient + HC-SR04 Sensors + LED)      │
  └───────────────────────────────────────────────────────────┘
              </pre>
            </div>
          </div>
        </div>

        <!-- System Specifications Panel -->
        <div class="col-lg-4">
          <div class="glass-card mb-4">
            <h4 class="mb-3" style="font-family: var(--font-display); font-weight: 700;">Tech Stack</h4>
            <ul class="list-group list-group-flush" style="background: transparent;">
              <li class="list-group-item bg-transparent d-flex justify-content-between align-items-center" style="border-color: var(--border-subtle);">
                <span class="text-secondary">Core Frontend</span>
                <span class="badge bg-info rounded-pill">Vanilla JS ES6+</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between align-items-center" style="border-color: var(--border-subtle);">
                <span class="text-secondary">Build Tool</span>
                <span class="badge bg-secondary rounded-pill">Vite</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between align-items-center" style="border-color: var(--border-subtle);">
                <span class="text-secondary">UI CSS</span>
                <span class="badge bg-primary rounded-pill">Bootstrap 5 + CSS3</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between align-items-center" style="border-color: var(--border-subtle);">
                <span class="text-secondary">Database Host</span>
                <span class="badge bg-success rounded-pill">Supabase</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between align-items-center" style="border-color: var(--border-subtle);">
                <span class="text-secondary">MCU Controller</span>
                <span class="badge bg-warning text-dark rounded-pill">ESP32 (Arduino C++)</span>
              </li>
              <li class="list-group-item bg-transparent d-flex justify-content-between align-items-center" style="border-color: var(--border-subtle);">
                <span class="text-secondary">Charts Render</span>
                <span class="badge bg-danger rounded-pill">Chart.js 4</span>
              </li>
            </ul>
          </div>
          
          <div class="glass-card">
            <h4 class="mb-3" style="font-family: var(--font-display); font-weight: 700;">Hardware Pin Reference</h4>
            <div class="table-responsive">
              <table class="table table-sm table-borderless text-secondary" style="font-size: 0.85rem;">
                <tbody>
                  <tr>
                    <td><strong>Ultrasonic 1 Trig</strong></td>
                    <td class="text-end"><span class="badge bg-secondary">GPIO 32</span></td>
                  </tr>
                  <tr>
                    <td><strong>Ultrasonic 1 Echo</strong></td>
                    <td class="text-end"><span class="badge bg-secondary">GPIO 33</span></td>
                  </tr>
                  <tr>
                    <td><strong>Ultrasonic 2 Trig</strong></td>
                    <td class="text-end"><span class="badge bg-secondary">GPIO 26</span></td>
                  </tr>
                  <tr>
                    <td><strong>Ultrasonic 2 Echo</strong></td>
                    <td class="text-end"><span class="badge bg-secondary">GPIO 27</span></td>
                  </tr>
                  <tr>
                    <td><strong>LDR Sensor</strong></td>
                    <td class="text-end"><span class="badge bg-secondary">GPIO 34</span></td>
                  </tr>
                  <tr>
                    <td><strong>LED StreetLight</strong></td>
                    <td class="text-end"><span class="badge bg-secondary">GPIO 14</span></td>
                  </tr>
                  <tr>
                    <td><strong>RTC (SDA/SCL)</strong></td>
                    <td class="text-end"><span class="badge bg-secondary">GPIO 21, 22</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    `;
  },
  unmount() {
    // No cleanup required for this static page
  }
};
