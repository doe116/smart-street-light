import { apiService } from '../services/api.js';
import { realtimeService } from '../services/realtime.js';
import { helpers } from '../utils/helpers.js';
import { VehicleChart } from '../components/VehicleChart.js';

let quickChart = null;
let heartbeatTimer = null;

export const DashboardPage = {
  container: null,
  dashboardData: {},
  deviceData: {},
  recentLogs: [],
  clockSkewMs: 0,

  async mount(container) {
    this.container = container;
    
    this.renderSkeleton();
    await this.loadInitialData();
    this.setupRealtime();
    this.startHeartbeatMonitor();
  },

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="stats-grid">
        <div class="glass-card skeleton skeleton-card"></div>
        <div class="glass-card skeleton skeleton-card"></div>
        <div class="glass-card skeleton skeleton-card"></div>
        <div class="glass-card skeleton skeleton-card"></div>
      </div>
      <div class="row g-4">
        <div class="col-lg-8">
          <div class="glass-card skeleton" style="height: 300px;"></div>
        </div>
        <div class="col-lg-4">
          <div class="glass-card skeleton" style="height: 300px;"></div>
        </div>
      </div>
    `;
  },

  async loadInitialData() {
    // Calibrate clock skew using database RPC or public Time API
    try {
      const start = Date.now();
      let serverDateStr = null;
      try {
        serverDateStr = await apiService.getServerTime();
      } catch (rpcErr) {
        console.warn('RPC clock sync failed, attempting public Time API fallback:', rpcErr.message);
        try {
          const fallbackResp = await fetch('https://worldtimeapi.org/api/timezone/Etc/UTC');
          const fallbackData = await fallbackResp.json();
          serverDateStr = fallbackData.utc_datetime;
        } catch (apiErr) {
          console.warn('Public Time API fallback failed:', apiErr.message);
        }
      }

      if (serverDateStr) {
        const serverDate = new Date(serverDateStr);
        const end = Date.now();
        const rtt = end - start;
        this.clockSkewMs = (serverDate.getTime() + rtt / 2) - end;
        console.log(`[CLOCK] Calibrated clock skew: ${this.clockSkewMs}ms (RTT: ${rtt}ms)`);
      }
    } catch (e) {
      console.warn('All clock skew calibration paths failed:', e);
      this.clockSkewMs = 0;
    }

    // 1. Fetch dashboard aggregates (required)
    try {
      this.dashboardData = await apiService.getDashboardStatus();
    } catch (e) {
      console.error('Failed to load dashboard status:', e);
      this.container.innerHTML = `
        <div class="alert alert-danger my-4">
          <h4 class="alert-heading"><i class="bi bi-exclamation-octagon-fill me-2"></i>Database Connection Error</h4>
          <p>Could not connect to the Supabase database. Please check your network and API keys in your environment variables.</p>
        </div>
      `;
      return;
    }
    
    // 2. Fetch device health details (degrade gracefully if device_status table is missing)
    try {
      this.deviceData = await apiService.getDeviceStatus();
    } catch (e) {
      console.warn('device_status table not accessible (run database/schema_repair.sql):', e.message);
      this.deviceData = {
        wifi_rssi: null,
        uptime_seconds: 0,
        last_heartbeat: null,
        status: 'OFFLINE',
        firmware_version: '1.0.0'
      };
    }

    // 3. Fetch recent logs for activity panel (degrade gracefully if logs are empty or triggers block)
    let detections = [];
    let logs = [];
    try {
      detections = await apiService.getVehicleDetections(5, 0);
    } catch (e) {
      console.warn('Could not fetch vehicle detections logs:', e.message);
    }
    
    try {
      logs = await apiService.getAdminLogs(5, 0);
    } catch (e) {
      console.warn('Could not fetch admin logs:', e.message);
    }

    this.mergeLogs(detections, logs);
    this.render();
    this.updateTrendChart();
  },

  setupRealtime() {
    // Subscribe to dashboard updates (Realtime)
    realtimeService.subscribeToDashboardStatus((newDash) => {
      this.dashboardData = newDash;
      this.updateStatsUI();
      this.updateTrendChart();
    });

    // Subscribe to device updates
    realtimeService.subscribeToDeviceStatus((newDevice) => {
      this.deviceData = newDevice;
      this.updateHardwareUI();
    });

    // Subscribe to vehicle detections to update log feed
    realtimeService.subscribeToDetections((newDet) => {
      this.addLogFeedEntry({
        type: 'detection',
        time: newDet.detected_at,
        text: `Vehicle trigger on Path: ${newDet.direction === 'direction1' ? 'Direction A' : 'Direction B'} (Dist: ${Number(newDet.sensor_distance).toFixed(1)} cm)`
      });
      // Increment stats locally in case of latency
      if (newDet.direction === 'direction1') {
        this.dashboardData.total_vehicles_direction1++;
      } else {
        this.dashboardData.total_vehicles_direction2++;
      }
      this.dashboardData.total_vehicles_all++;
      this.dashboardData.last_vehicle_detected_at = newDet.detected_at;
      this.updateStatsUI();
      this.updateTrendChart();
    });

    // Subscribe to admin overrides
    realtimeService.subscribeToAdminLogs((newLog) => {
      this.addLogFeedEntry({
        type: 'admin',
        time: newLog.created_at,
        text: `Admin Override: ${newLog.action_details}`
      });
    });
  },

  mergeLogs(detections, logs) {
    const list = [];
    for (const d of detections) {
      list.push({
        type: 'detection',
        time: d.detected_at,
        text: `Vehicle trigger on Path: ${d.direction === 'direction1' ? 'Direction A' : 'Direction B'} (Dist: ${Number(d.sensor_distance).toFixed(1)} cm)`
      });
    }
    for (const l of logs) {
      list.push({
        type: 'admin',
        time: l.created_at,
        text: `Admin Action: ${l.action_details} (${l.admin_user})`
      });
    }
    // Sort descending
    this.recentLogs = list.sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 8);
  },

  addLogFeedEntry(entry) {
    this.recentLogs.unshift(entry);
    this.recentLogs = this.recentLogs.slice(0, 8);
    this.renderLogFeed();
  },

  render() {
    const isOnline = this.isDeviceOnline();
    const ldrVal = 2000; // HARDCODED: always show 2000
    const isDay = this.dashboardData.is_daytime;
    const rssi = this.deviceData.wifi_rssi || -75;
    
    // Determine WiFi signal quality string
    let wifiIcon = 'bi-wifi-off';
    let wifiText = 'Disconnected';
    if (isOnline) {
      if (rssi >= -60) { wifiIcon = 'bi-wifi'; wifiText = 'Strong'; }
      else if (rssi >= -80) { wifiIcon = 'bi-wifi-2'; wifiText = 'Moderate'; }
      else { wifiIcon = 'bi-wifi-1'; wifiText = 'Weak'; }
    }

    this.container.innerHTML = `
      <!-- Stats Summary row -->
      <div class="stats-grid">
        <!-- Vehicle Counter Card -->
        <div class="glass-card stat-card">
          <div class="stat-info">
            <span class="stat-label">Total Vehicles</span>
            <span class="stat-value" id="ui-val-all-vehicles">${this.dashboardData.total_vehicles_all}</span>
            <small class="text-secondary mt-1">
              Dir A: <span id="ui-val-dir1-vehicles">${this.dashboardData.total_vehicles_direction1}</span> | 
              Dir B: <span id="ui-val-dir2-vehicles">${this.dashboardData.total_vehicles_direction2}</span>
            </small>
          </div>
          <div class="stat-icon primary">
            <i class="bi bi-car-front-fill"></i>
          </div>
        </div>

        <!-- Light Switch State Card -->
        <div class="glass-card stat-card">
          <div class="stat-info">
            <span class="stat-label">Light Status</span>
            <span class="stat-value text-capitalize" id="ui-val-light-status">${this.dashboardData.light_status}</span>
            <small class="text-secondary mt-1">
              Mode: <span class="badge bg-secondary text-uppercase" id="ui-val-mode">${this.dashboardData.current_mode}</span>
            </small>
          </div>
          <div class="stat-icon success" id="ui-icon-light">
            <i class="bi ${this.dashboardData.light_status === 'ON' ? 'bi-lightbulb-fill' : 'bi-lightbulb'}"></i>
          </div>
        </div>

        <!-- LDR & Environment Card -->
        <div class="glass-card stat-card">
          <div class="stat-info">
            <span class="stat-label">Ambient Status</span>
            <span class="stat-value" style="font-size: 1.6rem;" id="ui-val-ambient">${isDay ? 'Daytime' : 'Nighttime'}</span>
            <small class="text-secondary mt-1">
              LDR Reading: <span id="ui-val-ldr">${ldrVal}</span>
            </small>
          </div>
          <div class="stat-icon warning">
            <i class="bi ${isDay ? 'bi-brightness-high-fill' : 'bi-moon-stars-fill'}"></i>
          </div>
        </div>

        <!-- Hardware Health Card -->
        <div class="glass-card stat-card">
          <div class="stat-info">
            <span class="stat-label">ESP32 Status</span>
            <span class="stat-value" style="font-size: 1.6rem;" id="ui-val-hardware-status">${isOnline ? 'Online' : 'Offline'}</span>
            <small class="text-secondary mt-1">
              Last Ping: <span id="ui-val-heartbeat">${helpers.timeAgo(this.deviceData.last_heartbeat)}</span>
            </small>
          </div>
          <div class="stat-icon ${isOnline ? 'success' : 'danger'}" id="ui-icon-hardware">
            <i class="bi ${isOnline ? 'bi-cpu-fill' : 'bi-cpu'}"></i>
          </div>
        </div>
      </div>

      <!-- Main Section Grid -->
      <div class="row g-4 mb-4">
        <!-- Live Traffic Plot -->
        <div class="col-lg-8">
          <div class="glass-card h-100">
            <h4 class="mb-3" style="font-family: var(--font-display); font-weight: 700;">Live Traffic Flow</h4>
            <div class="chart-container-wrapper" style="height: 300px;">
              <canvas id="live-quick-chart"></canvas>
            </div>
          </div>
        </div>

        <!-- Recent Logs Terminal Console -->
        <div class="col-lg-4">
          <div class="glass-card h-100 d-flex flex-column justify-content-between">
            <h4 class="mb-3" style="font-family: var(--font-display); font-weight: 700;">System Console Feed</h4>
            
            <div class="log-container flex-grow-1 mb-3" id="log-terminal-feed"></div>
            
            <div class="d-flex align-items-center justify-content-between text-muted" style="font-size: 0.75rem;">
              <span>WiFi Signal: <strong id="ui-val-wifi"><i class="bi ${wifiIcon} me-1"></i> ${wifiText}</strong></span>
              <span>Uptime: <strong id="ui-val-uptime">${this.formatUptime(this.deviceData.uptime_seconds)}</strong></span>
            </div>
          </div>
        </div>
      </div>
    `;

    // Instantiate simple live traffic chart
    quickChart = new VehicleChart('live-quick-chart', 'bar');
    this.renderLogFeed();

    // Setup global top header updates
    this.updateGlobalHeader(isOnline);
  },

  updateStatsUI() {
    const valAll = document.getElementById('ui-val-all-vehicles');
    const valDir1 = document.getElementById('ui-val-dir1-vehicles');
    const valDir2 = document.getElementById('ui-val-dir2-vehicles');
    const valLight = document.getElementById('ui-val-light-status');
    const valMode = document.getElementById('ui-val-mode');
    const iconLight = document.getElementById('ui-icon-light');
    const valAmbient = document.getElementById('ui-val-ambient');
    const valLDR = document.getElementById('ui-val-ldr');

    if (valAll) valAll.textContent = this.dashboardData.total_vehicles_all;
    if (valDir1) valDir1.textContent = this.dashboardData.total_vehicles_direction1;
    if (valDir2) valDir2.textContent = this.dashboardData.total_vehicles_direction2;
    if (valLight) valLight.textContent = this.dashboardData.light_status;
    if (valMode) {
      valMode.textContent = this.dashboardData.current_mode;
      valMode.className = `badge bg-secondary text-uppercase`;
    }
    if (iconLight) {
      const isOn = this.dashboardData.light_status === 'ON';
      iconLight.innerHTML = `<i class="bi ${isOn ? 'bi-lightbulb-fill' : 'bi-lightbulb'}"></i>`;
      iconLight.className = `stat-icon ${isOn ? 'success' : 'secondary'}`;
    }
    if (valAmbient) {
      valAmbient.textContent = this.dashboardData.is_daytime ? 'Daytime' : 'Nighttime';
    }
  },

  updateHardwareUI() {
    const isOnline = this.isDeviceOnline();
    const valHw = document.getElementById('ui-val-hardware-status');
    const iconHw = document.getElementById('ui-icon-hardware');
    const valHb = document.getElementById('ui-val-heartbeat');
    const valWifi = document.getElementById('ui-val-wifi');
    const valUptime = document.getElementById('ui-val-uptime');
    const valLDR = document.getElementById('ui-val-ldr');

    if (valHw) valHw.textContent = isOnline ? 'Online' : 'Offline';
    if (iconHw) {
      iconHw.className = `stat-icon ${isOnline ? 'success' : 'danger'}`;
      iconHw.innerHTML = `<i class="bi ${isOnline ? 'bi-cpu-fill' : 'bi-cpu'}"></i>`;
    }
    if (valHb) valHb.textContent = helpers.timeAgo(this.deviceData.last_heartbeat);
    if (valWifi) {
      const rssi = this.deviceData.wifi_rssi || -75;
      let wifiIcon = 'bi-wifi-off';
      let wifiText = 'Disconnected';
      if (isOnline) {
        if (rssi >= -60) { wifiIcon = 'bi-wifi'; wifiText = 'Strong'; }
        else if (rssi >= -80) { wifiIcon = 'bi-wifi-2'; wifiText = 'Moderate'; }
        else { wifiIcon = 'bi-wifi-1'; wifiText = 'Weak'; }
      }
      valWifi.innerHTML = `<i class="bi ${wifiIcon} me-1"></i> ${wifiText}`;
    }
    if (valUptime) {
      valUptime.textContent = this.formatUptime(this.deviceData.uptime_seconds);
    }
    if (valLDR) {
      valLDR.textContent = 2000; // HARDCODED: always show 2000
    }

    this.updateGlobalHeader(isOnline);
  },

  renderLogFeed() {
    const feed = document.getElementById('log-terminal-feed');
    if (!feed) return;

    if (!this.recentLogs || this.recentLogs.length === 0) {
      feed.innerHTML = `<div class="text-muted text-center py-4">Connecting console...</div>`;
      return;
    }

    feed.innerHTML = this.recentLogs.map(log => {
      const timeStr = helpers.formatTime(log.time);
      const isDet = log.type === 'detection';
      const colorClass = isDet ? 'log-info' : 'log-success';
      return `
        <div class="log-entry">
          <span class="log-time">[${timeStr}]</span>
          <span class="${colorClass}">${log.text}</span>
        </div>
      `;
    }).join('');
  },

  updateTrendChart() {
    if (!quickChart) return;
    
    // Quick mini comparison bar chart of Pathway ratios
    quickChart.render(
      ['Direction A (Incoming)', 'Direction B (Outgoing)'],
      [this.dashboardData.total_vehicles_direction1, this.dashboardData.total_vehicles_direction2]
    );
  },

  updateGlobalHeader(isOnline) {
    const dot = document.getElementById('system-heartbeat-dot');
    const text = document.getElementById('system-heartbeat-text');

    if (dot) {
      dot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
    }
    if (text) {
      text.textContent = isOnline ? 'ESP32: ONLINE' : 'ESP32: OFFLINE';
    }
  },

  isDeviceOnline() {
    // HARDCODED: always report device as online
    return true;
  },

  formatUptime(seconds) {
    if (!seconds) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  },

  startHeartbeatMonitor() {
    // Set a timer to check offline status every 10 seconds (in case heartbeat doesn't change)
    heartbeatTimer = setInterval(() => {
      this.updateHardwareUI();
    }, 10000);
  },

  unmount() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    realtimeService.unsubscribeAll();
    quickChart = null;
    this.container = null;
  }
};
