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

          <!-- ═══════════════════════════════════════════════════════ -->
          <!-- PRESENTATION SLIDES CONTENT                            -->
          <!-- ═══════════════════════════════════════════════════════ -->

          <!-- Slide 1 – Title / Project Overview -->
          <div class="glass-card mt-4" style="border-left: 4px solid var(--accent-primary);">
            <div class="d-flex align-items-center mb-3">
              <span class="badge rounded-pill me-2" style="background: var(--accent-primary); font-size: 0.75rem;">SLIDE 1</span>
              <h3 class="mb-0" style="font-family: var(--font-display); font-weight: 700;">
                <i class="bi bi-stars me-2 text-warning"></i>Project Title &amp; Overview
              </h3>
            </div>
            <div class="row g-3">
              <div class="col-12">
                <div class="p-3 rounded" style="background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.08)); border: 1px solid rgba(99,102,241,0.25);">
                  <h4 class="text-center mb-1" style="font-family: var(--font-display); font-size: 1.3rem; font-weight: 800; background: linear-gradient(90deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                    IoT-Based Smart Street Light Monitoring &amp; Control System
                  </h4>
                  <p class="text-center mb-0" style="color: var(--text-secondary); font-size: 0.9rem;">
                    A capstone project combining <strong>embedded systems</strong>, <strong>cloud database technology</strong>, and a <strong>real-time web dashboard</strong> to automate and monitor street lighting infrastructure.
                  </p>
                </div>
              </div>
              <div class="col-md-4">
                <div class="p-3 rounded text-center" style="background-color: rgba(0,0,0,0.03); border: 1px solid var(--border-subtle);">
                  <i class="bi bi-cpu-fill fs-3 text-info mb-2 d-block"></i>
                  <strong style="font-size: 0.85rem;">Hardware Layer</strong>
                  <p class="mb-0 text-secondary" style="font-size: 0.78rem;">ESP32 + Sensors + LED</p>
                </div>
              </div>
              <div class="col-md-4">
                <div class="p-3 rounded text-center" style="background-color: rgba(0,0,0,0.03); border: 1px solid var(--border-subtle);">
                  <i class="bi bi-cloud-fill fs-3 text-success mb-2 d-block"></i>
                  <strong style="font-size: 0.85rem;">Cloud Layer</strong>
                  <p class="mb-0 text-secondary" style="font-size: 0.78rem;">Supabase (PostgreSQL + Realtime)</p>
                </div>
              </div>
              <div class="col-md-4">
                <div class="p-3 rounded text-center" style="background-color: rgba(0,0,0,0.03); border: 1px solid var(--border-subtle);">
                  <i class="bi bi-display-fill fs-3 text-warning mb-2 d-block"></i>
                  <strong style="font-size: 0.85rem;">Web Layer</strong>
                  <p class="mb-0 text-secondary" style="font-size: 0.78rem;">Vite + Vanilla JS Dashboard</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Slide 2 – Problem Statement -->
          <div class="glass-card mt-4" style="border-left: 4px solid #ef4444;">
            <div class="d-flex align-items-center mb-3">
              <span class="badge rounded-pill me-2" style="background: #ef4444; font-size: 0.75rem;">SLIDE 2</span>
              <h3 class="mb-0" style="font-family: var(--font-display); font-weight: 700;">
                <i class="bi bi-exclamation-triangle-fill me-2 text-danger"></i>Problem Statement
              </h3>
            </div>
            <p style="color: var(--text-secondary);">
              Traditional street lighting systems operate on fixed timers and manual switches, leading to significant inefficiencies:
            </p>
            <div class="row g-3">
              <div class="col-md-6">
                <ul class="list-unstyled mb-0">
                  <li class="mb-2"><i class="bi bi-x-circle-fill text-danger me-2"></i><span style="color: var(--text-secondary); font-size: 0.9rem;">Lights remain ON even in broad daylight, wasting energy</span></li>
                  <li class="mb-2"><i class="bi bi-x-circle-fill text-danger me-2"></i><span style="color: var(--text-secondary); font-size: 0.9rem;">No real-time visibility into system status or faults</span></li>
                  <li class="mb-2"><i class="bi bi-x-circle-fill text-danger me-2"></i><span style="color: var(--text-secondary); font-size: 0.9rem;">Manual monitoring is costly and time-consuming</span></li>
                </ul>
              </div>
              <div class="col-md-6">
                <ul class="list-unstyled mb-0">
                  <li class="mb-2"><i class="bi bi-x-circle-fill text-danger me-2"></i><span style="color: var(--text-secondary); font-size: 0.9rem;">No traffic data collection for urban planning</span></li>
                  <li class="mb-2"><i class="bi bi-x-circle-fill text-danger me-2"></i><span style="color: var(--text-secondary); font-size: 0.9rem;">Inability to remotely override or schedule lights</span></li>
                  <li class="mb-2"><i class="bi bi-x-circle-fill text-danger me-2"></i><span style="color: var(--text-secondary); font-size: 0.9rem;">High energy consumption with no adaptive dimming</span></li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Slide 3 – Objectives -->
          <div class="glass-card mt-4" style="border-left: 4px solid #10b981;">
            <div class="d-flex align-items-center mb-3">
              <span class="badge rounded-pill me-2" style="background: #10b981; font-size: 0.75rem;">SLIDE 3</span>
              <h3 class="mb-0" style="font-family: var(--font-display); font-weight: 700;">
                <i class="bi bi-bullseye me-2 text-success"></i>Project Objectives
              </h3>
            </div>
            <div class="row g-3">
              <div class="col-md-6">
                <div class="p-3 rounded h-100" style="background-color: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.2);">
                  <h5 class="h6 text-success"><i class="bi bi-1-circle-fill me-2"></i>General Objective</h5>
                  <p class="mb-0 text-secondary" style="font-size: 0.88rem;">To design and implement an IoT-based smart street light system that automates lighting control, monitors system status in real time, and records vehicular traffic data through a cloud-connected web dashboard.</p>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 rounded h-100" style="background-color: rgba(0,0,0,0.02); border: 1px solid var(--border-subtle);">
                  <h5 class="h6 text-info"><i class="bi bi-list-check me-2"></i>Specific Objectives</h5>
                  <ul class="mb-0 ps-3" style="font-size: 0.85rem; color: var(--text-secondary);">
                    <li>Automate lighting using LDR light-sensing and RTC scheduling</li>
                    <li>Detect and count passing vehicles with ultrasonic sensors</li>
                    <li>Enable remote manual override from the web dashboard</li>
                    <li>Stream real-time data to Supabase cloud database</li>
                    <li>Display live analytics, logs, and alerts on the dashboard</li>
                    <li>Export traffic reports in CSV and PDF formats</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <!-- Slide 4 – System Components -->
          <div class="glass-card mt-4" style="border-left: 4px solid #f59e0b;">
            <div class="d-flex align-items-center mb-3">
              <span class="badge rounded-pill me-2" style="background: #f59e0b; font-size: 0.75rem;">SLIDE 4</span>
              <h3 class="mb-0" style="font-family: var(--font-display); font-weight: 700;">
                <i class="bi bi-diagram-3-fill me-2 text-warning"></i>System Components
              </h3>
            </div>
            <div class="row g-3">
              <div class="col-md-6">
                <h5 class="h6 mb-2" style="color: var(--text-secondary);">🔧 Hardware Components</h5>
                <table class="table table-sm table-borderless" style="font-size: 0.85rem; color: var(--text-secondary);">
                  <tbody>
                    <tr><td><i class="bi bi-check2-circle text-success me-1"></i><strong>ESP32 Dev Board</strong></td><td>Microcontroller / Wi-Fi edge node</td></tr>
                    <tr><td><i class="bi bi-check2-circle text-success me-1"></i><strong>HC-SR04 (×2)</strong></td><td>Ultrasonic vehicle detection sensors</td></tr>
                    <tr><td><i class="bi bi-check2-circle text-success me-1"></i><strong>LDR Module</strong></td><td>Ambient light level detection</td></tr>
                    <tr><td><i class="bi bi-check2-circle text-success me-1"></i><strong>DS3231 RTC</strong></td><td>Real-time clock for scheduling</td></tr>
                    <tr><td><i class="bi bi-check2-circle text-success me-1"></i><strong>LED (GPIO 14)</strong></td><td>Street light simulation output</td></tr>
                  </tbody>
                </table>
              </div>
              <div class="col-md-6">
                <h5 class="h6 mb-2" style="color: var(--text-secondary);">💻 Software Components</h5>
                <table class="table table-sm table-borderless" style="font-size: 0.85rem; color: var(--text-secondary);">
                  <tbody>
                    <tr><td><i class="bi bi-check2-circle text-info me-1"></i><strong>Arduino C++ (ESP32)</strong></td><td>Embedded firmware</td></tr>
                    <tr><td><i class="bi bi-check2-circle text-info me-1"></i><strong>Supabase</strong></td><td>PostgreSQL + Realtime cloud DB</td></tr>
                    <tr><td><i class="bi bi-check2-circle text-info me-1"></i><strong>Vite + Vanilla JS</strong></td><td>Web dashboard framework</td></tr>
                    <tr><td><i class="bi bi-check2-circle text-info me-1"></i><strong>Bootstrap 5</strong></td><td>Responsive UI framework</td></tr>
                    <tr><td><i class="bi bi-check2-circle text-info me-1"></i><strong>Chart.js 4</strong></td><td>Real-time analytics charts</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <!-- Slide 5 – Methodology / How It Works -->
          <div class="glass-card mt-4" style="border-left: 4px solid #6366f1;">
            <div class="d-flex align-items-center mb-3">
              <span class="badge rounded-pill me-2" style="background: #6366f1; font-size: 0.75rem;">SLIDE 5</span>
              <h3 class="mb-0" style="font-family: var(--font-display); font-weight: 700;">
                <i class="bi bi-gear-wide-connected me-2 text-primary"></i>Methodology / How It Works
              </h3>
            </div>
            <div class="row g-3">
              <div class="col-md-3 text-center">
                <div class="p-3 rounded h-100" style="background-color: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.2);">
                  <i class="bi bi-1-circle-fill text-primary fs-4 mb-2 d-block"></i>
                  <strong style="font-size: 0.85rem;">Sense</strong>
                  <p class="mb-0 text-secondary" style="font-size: 0.78rem;">LDR reads ambient light; HC-SR04 detects vehicle passing distance &lt;100 cm</p>
                </div>
              </div>
              <div class="col-md-3 text-center">
                <div class="p-3 rounded h-100" style="background-color: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.2);">
                  <i class="bi bi-2-circle-fill text-primary fs-4 mb-2 d-block"></i>
                  <strong style="font-size: 0.85rem;">Decide</strong>
                  <p class="mb-0 text-secondary" style="font-size: 0.78rem;">ESP32 applies logic: auto/manual mode, RTC time window, LDR threshold</p>
                </div>
              </div>
              <div class="col-md-3 text-center">
                <div class="p-3 rounded h-100" style="background-color: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.2);">
                  <i class="bi bi-3-circle-fill text-primary fs-4 mb-2 d-block"></i>
                  <strong style="font-size: 0.85rem;">Upload</strong>
                  <p class="mb-0 text-secondary" style="font-size: 0.78rem;">Sends heartbeat, sensor readings &amp; vehicle counts to Supabase every 3–5 s</p>
                </div>
              </div>
              <div class="col-md-3 text-center">
                <div class="p-3 rounded h-100" style="background-color: rgba(99,102,241,0.07); border: 1px solid rgba(99,102,241,0.2);">
                  <i class="bi bi-4-circle-fill text-primary fs-4 mb-2 d-block"></i>
                  <strong style="font-size: 0.85rem;">Display</strong>
                  <p class="mb-0 text-secondary" style="font-size: 0.78rem;">Dashboard subscribes to Realtime channel &amp; renders live charts, alerts &amp; logs</p>
                </div>
              </div>
            </div>
            <div class="mt-3 p-3 rounded" style="background-color: rgba(0,0,0,0.03); border: 1px solid var(--border-subtle);">
              <p class="mb-0 text-secondary" style="font-size: 0.85rem;">
                <i class="bi bi-arrow-repeat text-info me-2"></i>
                <strong>Control Loop:</strong> Dashboard admin → writes override to <code>system_settings</code> table → ESP32 polls that table every 3 s → applies new state immediately → heartbeat confirms change within 1–2 seconds.
              </p>
            </div>
          </div>

          <!-- Slide 6 – Key Features -->
          <div class="glass-card mt-4" style="border-left: 4px solid #8b5cf6;">
            <div class="d-flex align-items-center mb-3">
              <span class="badge rounded-pill me-2" style="background: #8b5cf6; font-size: 0.75rem;">SLIDE 6</span>
              <h3 class="mb-0" style="font-family: var(--font-display); font-weight: 700;">
                <i class="bi bi-star-fill me-2" style="color:#8b5cf6;"></i>Key Features of the Dashboard
              </h3>
            </div>
            <div class="row g-3">
              <div class="col-md-4">
                <div class="p-3 rounded" style="background-color: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.2);">
                  <h6><i class="bi bi-speedometer2 text-primary me-2"></i>Live Dashboard</h6>
                  <small class="text-secondary">Real-time KPI cards showing light status, LDR reading, vehicle count, and ESP32 online/offline status with animated indicators.</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="p-3 rounded" style="background-color: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.2);">
                  <h6><i class="bi bi-sliders2 text-info me-2"></i>Remote Control</h6>
                  <small class="text-secondary">Toggle light ON/OFF, switch between Auto and Manual modes, and configure schedule windows — all reflected on the ESP32 within seconds.</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="p-3 rounded" style="background-color: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.2);">
                  <h6><i class="bi bi-bar-chart-line text-success me-2"></i>Analytics &amp; Charts</h6>
                  <small class="text-secondary">Hourly and daily traffic trend charts with Chart.js, filter by date range, and export data to CSV or PDF for offline reporting.</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="p-3 rounded" style="background-color: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.2);">
                  <h6><i class="bi bi-journal-text text-warning me-2"></i>System Logs</h6>
                  <small class="text-secondary">Paginated audit trail of all ESP32 heartbeats and status changes, searchable and filterable for troubleshooting and compliance.</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="p-3 rounded" style="background-color: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.2);">
                  <h6><i class="bi bi-car-front-fill text-danger me-2"></i>Vehicle Tracking</h6>
                  <small class="text-secondary">Bidirectional vehicle detection with directional counts, session-based logging, and visual traffic volume heatmap by hour.</small>
                </div>
              </div>
              <div class="col-md-4">
                <div class="p-3 rounded" style="background-color: rgba(139,92,246,0.06); border: 1px solid rgba(139,92,246,0.2);">
                  <h6><i class="bi bi-shield-lock-fill me-2" style="color:#8b5cf6;"></i>Secure Access</h6>
                  <small class="text-secondary">Supabase Row-Level Security (RLS) with email/password authentication ensures only authorized admins can control the system.</small>
                </div>
              </div>
            </div>
          </div>

          <!-- Slide 7 – Results & Benefits -->
          <div class="glass-card mt-4" style="border-left: 4px solid #10b981;">
            <div class="d-flex align-items-center mb-3">
              <span class="badge rounded-pill me-2" style="background: #10b981; font-size: 0.75rem;">SLIDE 7</span>
              <h3 class="mb-0" style="font-family: var(--font-display); font-weight: 700;">
                <i class="bi bi-graph-up-arrow me-2 text-success"></i>Results &amp; Expected Benefits
              </h3>
            </div>
            <div class="row g-3 align-items-center">
              <div class="col-md-8">
                <table class="table table-sm table-borderless mb-0" style="font-size: 0.88rem; color: var(--text-secondary);">
                  <thead>
                    <tr>
                      <th style="color: var(--text-primary); font-weight: 600;">Outcome</th>
                      <th style="color: var(--text-primary); font-weight: 600;">Traditional System</th>
                      <th style="color: var(--text-primary); font-weight: 600;">This System</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Light Control</td>
                      <td><span class="badge bg-secondary">Manual / Fixed Timer</span></td>
                      <td><span class="badge bg-success">Adaptive (LDR + RTC + Override)</span></td>
                    </tr>
                    <tr>
                      <td>System Monitoring</td>
                      <td><span class="badge bg-secondary">On-site inspection</span></td>
                      <td><span class="badge bg-success">Real-time online dashboard</span></td>
                    </tr>
                    <tr>
                      <td>Traffic Data</td>
                      <td><span class="badge bg-secondary">None</span></td>
                      <td><span class="badge bg-success">Automated bidirectional count</span></td>
                    </tr>
                    <tr>
                      <td>Response Time</td>
                      <td><span class="badge bg-secondary">Hours / Days (manual)</span></td>
                      <td><span class="badge bg-success">1–2 seconds (cloud polling)</span></td>
                    </tr>
                    <tr>
                      <td>Energy Efficiency</td>
                      <td><span class="badge bg-secondary">Fixed — always full power</span></td>
                      <td><span class="badge bg-success">Adaptive — off in daylight</span></td>
                    </tr>
                    <tr>
                      <td>Data Reporting</td>
                      <td><span class="badge bg-secondary">Manual paper logs</span></td>
                      <td><span class="badge bg-success">Auto CSV / PDF export</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="col-md-4">
                <div class="p-3 rounded text-center" style="background: linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.08)); border: 1px solid rgba(16,185,129,0.25);">
                  <i class="bi bi-lightbulb-fill text-warning fs-1 mb-2 d-block"></i>
                  <strong style="font-size: 0.9rem;">Smart Automation</strong>
                  <p class="text-secondary mb-0" style="font-size: 0.8rem;">The system eliminates manual intervention, reduces energy waste, and provides city administrators with actionable data.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Slide 8 – Conclusion -->
          <div class="glass-card mt-4 mb-2" style="border-left: 4px solid #f59e0b;">
            <div class="d-flex align-items-center mb-3">
              <span class="badge rounded-pill me-2" style="background: #f59e0b; font-size: 0.75rem;">SLIDE 8</span>
              <h3 class="mb-0" style="font-family: var(--font-display); font-weight: 700;">
                <i class="bi bi-flag-fill me-2 text-warning"></i>Conclusion &amp; Recommendations
              </h3>
            </div>
            <div class="row g-3">
              <div class="col-md-6">
                <div class="p-3 rounded h-100" style="background-color: rgba(0,0,0,0.02); border: 1px solid var(--border-subtle);">
                  <h5 class="h6 text-info"><i class="bi bi-check2-all me-2"></i>Conclusion</h5>
                  <p class="mb-0 text-secondary" style="font-size: 0.88rem;">
                    The IoT Smart Street Light System successfully demonstrates how affordable embedded hardware (ESP32) combined with a cloud platform (Supabase) and a responsive web dashboard can solve real-world infrastructure challenges. The system delivers automated lighting, live monitoring, vehicle traffic analytics, and remote control — all in a single integrated solution.
                  </p>
                </div>
              </div>
              <div class="col-md-6">
                <div class="p-3 rounded h-100" style="background-color: rgba(0,0,0,0.02); border: 1px solid var(--border-subtle);">
                  <h5 class="h6 text-warning"><i class="bi bi-arrow-up-right-circle me-2"></i>Future Recommendations</h5>
                  <ul class="mb-0 ps-3 text-secondary" style="font-size: 0.85rem;">
                    <li>Scale to multiple ESP32 nodes per street zone</li>
                    <li>Add solar power integration with battery monitoring</li>
                    <li>Implement AI/ML for predictive traffic pattern analysis</li>
                    <li>Integrate SMS/email alert notifications for faults</li>
                    <li>Deploy mobile app for on-the-go admin access</li>
                    <li>Add camera module for visual vehicle classification</li>
                  </ul>
                </div>
              </div>
            </div>
            <div class="mt-3 p-3 rounded text-center" style="background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.05)); border: 1px solid rgba(99,102,241,0.2);">
              <p class="mb-0" style="color: var(--text-secondary); font-size: 0.9rem;">
                <i class="bi bi-heart-fill text-danger me-2"></i>
                <strong>Thank you!</strong> — This project showcases the practical application of IoT, cloud computing, and web technologies in solving modern smart city challenges.
              </p>
            </div>
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
