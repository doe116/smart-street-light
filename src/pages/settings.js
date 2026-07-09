import { apiService } from '../services/api.js';
import { authService } from '../services/auth.js';

export const SettingsPage = {
  container: null,
  adminEmail: 'admin',
  settingsData: {},

  async mount(container) {
    this.container = container;
    
    // Resolve logged in email for logs
    const session = await authService.getSession();
    this.adminEmail = session?.user?.email || 'admin';

    this.renderSkeleton();
    await this.loadSettings();
  },

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="glass-card skeleton skeleton-card mb-4" style="height: 350px;"></div>
    `;
  },

  async loadSettings() {
    try {
      const settings = await apiService.getSystemSettings();
      // Map array of {setting_key, setting_value} to an object
      this.settingsData = {};
      for (const s of settings) {
        this.settingsData[s.setting_key] = s.setting_value;
      }
      this.render();
    } catch (e) {
      console.error('Failed to load settings:', e);
      this.container.innerHTML = `
        <div class="alert alert-danger">Failed to retrieve system settings from Supabase.</div>
      `;
    }
  },

  render() {
    this.container.innerHTML = `
      <div class="row g-4">
        <!-- Settings Form Card -->
        <div class="col-lg-8">
          <div class="glass-card">
            <h3 class="mb-4" style="font-family: var(--font-display); font-weight: 700;">System Thresholds & Scheduling</h3>
            
            <form id="settings-form" class="needs-validation" novalidate>
              <div class="row g-3">
                <!-- Light ON Duration -->
                <div class="col-md-6">
                  <label for="light_on_duration" class="form-label fw-semibold" style="font-size: 0.85rem; color: var(--text-secondary);">Light ON Duration (ms)</label>
                  <input type="number" class="form-control" id="light_on_duration" value="${this.settingsData.light_on_duration || '2000'}" required>
                  <div class="form-text text-muted">Time street light remains ON after vehicle detection.</div>
                </div>

                <!-- LDR Threshold Day -->
                <div class="col-md-6">
                  <label for="ldr_threshold_day" class="form-label fw-semibold" style="font-size: 0.85rem; color: var(--text-secondary);">LDR Daytime Threshold (0-4095)</label>
                  <input type="number" class="form-control" id="ldr_threshold_day" min="0" max="4095" value="${this.settingsData.ldr_threshold_day || '2000'}" required>
                  <div class="form-text text-muted">LDR value above this is considered DAY.</div>
                </div>

                <!-- Vehicle Detection Distance -->
                <div class="col-md-6">
                  <label for="detection_distance" class="form-label fw-semibold" style="font-size: 0.85rem; color: var(--text-secondary);">Vehicle Detection Distance (cm)</label>
                  <input type="number" class="form-control" id="detection_distance" value="${this.settingsData.detection_distance || '35'}" required>
                  <div class="form-text text-muted">Trigger threshold for ultrasonic sensor scan.</div>
                </div>

                <!-- Heartbeat Interval -->
                <div class="col-md-6">
                  <label for="heartbeat_interval" class="form-label fw-semibold" style="font-size: 0.85rem; color: var(--text-secondary);">Heartbeat Sync Interval (seconds)</label>
                  <input type="number" class="form-control" id="heartbeat_interval" value="${this.settingsData.heartbeat_interval || '10'}" required>
                  <div class="form-text text-muted">Frequency at which ESP32 reports telemetry.</div>
                </div>

                <!-- Time Scheduling -->
                <div class="col-md-6">
                  <label for="night_mode_start" class="form-label fw-semibold" style="font-size: 0.85rem; color: var(--text-secondary);">Night Schedule Start Time</label>
                  <input type="time" class="form-control" id="night_mode_start" value="${this.settingsData.night_mode_start || '18:00'}" required>
                  <div class="form-text text-muted">Switch scheduling into forced night control.</div>
                </div>
                <div class="col-md-6">
                  <label for="night_mode_end" class="form-label fw-semibold" style="font-size: 0.85rem; color: var(--text-secondary);">Night Schedule End Time</label>
                  <input type="time" class="form-control" id="night_mode_end" value="${this.settingsData.night_mode_end || '06:00'}" required>
                  <div class="form-text text-muted">Switch scheduling back to standard day control.</div>
                </div>

                <!-- Realtime Polling Interval -->
                <div class="col-md-6">
                  <label for="realtime_polling_interval" class="form-label fw-semibold" style="font-size: 0.85rem; color: var(--text-secondary);">Web Refresh Polling (seconds)</label>
                  <input type="number" class="form-control" id="realtime_polling_interval" value="${this.settingsData.realtime_polling_interval || '2'}" required>
                  <div class="form-text text-muted">Polling rate configured for dashboard widgets.</div>
                </div>
              </div>

              <div class="mt-4 pt-3 border-top d-flex align-items-center justify-content-between" style="border-color: var(--border-subtle) !important;">
                <button type="submit" class="btn btn-primary btn-sm px-4 fw-bold" id="btn-save-settings">
                  <span class="spinner-border spinner-border-sm d-none me-2" id="settings-spinner" role="status" aria-hidden="true"></span>
                  Save Configurations
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Explanatory Calibration Card -->
        <div class="col-lg-4">
          <div class="glass-card mb-4">
            <h4 class="mb-3" style="font-family: var(--font-display); font-weight: 700;">Calibration Help</h4>
            <div class="d-flex flex-column gap-3" style="font-size: 0.85rem; color: var(--text-secondary);">
              <div>
                <strong>LDR Threshold</strong>
                <p class="mb-0">Lower LDR resistance values mean higher sunlight brightness. Measure actual ambient read limits during twilight to calibrate the daylight trigger.</p>
              </div>
              <div>
                <strong>Sensor Distance</strong>
                <p class="mb-0">Calibrate this based on the physical height position of the sensors above the road level. The default is 35 cm.</p>
              </div>
              <div>
                <strong>Time Scheduling</strong>
                <p class="mb-0">The system uses the RTC clock module. It activates forced low-illumination states automatically between the Night Schedule bounds regardless of LDR readings.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    const form = document.getElementById('settings-form');
    const spinner = document.getElementById('settings-spinner');
    const submitBtn = document.getElementById('btn-save-settings');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const keysToUpdate = [
        'light_on_duration',
        'ldr_threshold_day',
        'detection_distance',
        'heartbeat_interval',
        'night_mode_start',
        'night_mode_end',
        'realtime_polling_interval'
      ];

      // Enable spinner
      spinner.classList.remove('d-none');
      submitBtn.disabled = true;

      try {
        let updateCount = 0;
        for (const key of keysToUpdate) {
          const inputEl = document.getElementById(key);
          if (inputEl) {
            const val = inputEl.value;
            // Check if modified
            if (this.settingsData[key] !== val) {
              await apiService.updateSystemSetting(key, val, this.adminEmail);
              this.settingsData[key] = val;
              updateCount++;
            }
          }
        }

        if (updateCount > 0) {
          this.showToast(`Updated ${updateCount} system parameters successfully.`);
        } else {
          this.showToast('No settings were modified.');
        }
      } catch (err) {
        alert('Failed to update system settings: ' + err.message);
      } finally {
        spinner.classList.add('d-none');
        submitBtn.disabled = false;
      }
    });
  },

  showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.style.borderLeftColor = 'var(--primary)';
    toast.innerHTML = `
      <div>
        <div style="font-weight: 700; font-size: 0.85rem;"><i class="bi bi-gear-fill text-primary me-2"></i>Settings Sync</div>
        <div class="text-secondary" style="font-size: 0.80rem;">${msg}</div>
      </div>
      <button class="btn btn-close btn-sm" onclick="this.parentElement.remove()"></button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 5000);
  },

  unmount() {
    this.container = null;
  }
};
