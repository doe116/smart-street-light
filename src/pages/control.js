import { apiService } from '../services/api.js';
import { realtimeService } from '../services/realtime.js';
import { authService } from '../services/auth.js';

export const ControlPage = {
  container: null,
  adminEmail: 'admin',

  async mount(container) {
    this.container = container;
    
    // Resolve logged in email for logs
    const session = await authService.getSession();
    this.adminEmail = session?.user?.email || 'admin';

    this.renderSkeleton();
    await this.loadData();
    this.setupRealtime();
  },

  renderSkeleton() {
    this.container.innerHTML = `
      <div class="row g-4">
        <div class="col-md-6">
          <div class="glass-card skeleton skeleton-card"></div>
        </div>
        <div class="col-md-6">
          <div class="glass-card skeleton skeleton-card"></div>
        </div>
      </div>
    `;
  },

  async loadData() {
    try {
      const dash = await apiService.getDashboardStatus();
      this.render(dash);
    } catch (e) {
      console.error('Failed to load control page status:', e);
      this.container.innerHTML = `
        <div class="alert alert-danger">Failed to sync dashboard status. Check Supabase connection.</div>
      `;
    }
  },

  setupRealtime() {
    realtimeService.subscribeToDashboardStatus((newStatus) => {
      this.updateUI(newStatus);
    });
  },

  render(dash) {
    const isManual = dash.current_mode === 'manual';
    const isAuto = dash.current_mode === 'auto';
    const isTimer = dash.current_mode === 'timer';
    const isOn = dash.light_status === 'ON';
    
    this.container.innerHTML = `
      <div class="row g-4">
        <!-- Remote Override Card -->
        <div class="col-md-6">
          <div class="glass-card h-100">
            <h3 class="mb-3" style="font-family: var(--font-display); font-weight: 700;">Manual Remote Overrides</h3>
            <p class="text-secondary mb-4" style="font-size: 0.9rem;">
              Manually force the street light state. Switching overrides will temporarily disengage the edge sensor logic.
            </p>
            
            <div class="d-flex flex-column gap-3">
              <!-- Mode Selection -->
              <div class="d-flex align-items-center justify-content-between p-3 rounded" style="background-color: rgba(0,0,0,0.02); border: 1px solid var(--border-subtle);">
                <div>
                  <strong>Control Mode</strong>
                  <div class="text-muted" style="font-size: 0.8rem;" id="mode-desc">
                    ${isAuto ? 'Adaptive edge sensors driving state' : isManual ? 'Fixed override states engaged' : 'RTC time scheduler active'}
                  </div>
                </div>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-primary ${isAuto ? 'active' : ''}" id="btn-mode-auto">AUTO</button>
                  <button class="btn btn-outline-primary ${isManual ? 'active' : ''}" id="btn-mode-manual">MANUAL</button>
                </div>
              </div>

              <!-- State Toggle -->
              <div class="d-flex align-items-center justify-content-between p-3 rounded" style="background-color: rgba(0,0,0,0.02); border: 1px solid var(--border-subtle);">
                <div>
                  <strong>Physical Light State</strong>
                  <div class="text-muted" style="font-size: 0.8rem;">
                    Currently physically switched: <span class="badge ${isOn ? 'bg-success' : 'bg-secondary'}" id="ui-light-badge">${dash.light_status}</span>
                  </div>
                </div>
                <div class="form-check form-switch p-0 m-0">
                  <input class="form-check-input ms-0" type="checkbox" role="switch" id="light-state-switch" ${isOn ? 'checked' : ''} ${!isManual ? 'disabled' : ''}>
                </div>
              </div>
            </div>
            
            <div class="mt-4 pt-3 border-top" style="border-color: var(--border-subtle) !important;">
              <small class="text-muted"><i class="bi bi-info-circle me-1"></i> ESP32 polls commands every 1-2 seconds.</small>
            </div>
          </div>
        </div>

        <!-- System Maintenance Card -->
        <div class="col-md-6">
          <div class="glass-card h-100 d-flex flex-column justify-content-between">
            <div>
              <h3 class="mb-3 text-danger" style="font-family: var(--font-display); font-weight: 700;">System Actions</h3>
              <p class="text-secondary mb-4" style="font-size: 0.9rem;">
                Perform administrative purge actions or hard sync tests on the dashboard.
              </p>
              
              <div class="p-3 rounded border border-danger-subtle bg-danger-subtle bg-opacity-10 mb-4">
                <h5 class="h6 text-danger fw-bold"><i class="bi bi-trash3-fill me-2"></i>Reset System Statistics</h5>
                <p class="text-secondary mb-3" style="font-size: 0.8rem;">
                  Clears all vehicle count aggregates, purges vehicle log tables, and clears historical light state logs.
                </p>
                <button class="btn btn-danger btn-sm" id="btn-reset-stats">Reset Counters & Logs</button>
              </div>
            </div>

            <div class="pt-3 border-top" style="border-color: var(--border-subtle) !important;">
              <span class="text-muted" style="font-size: 0.8rem;">Last Database Sync: <strong id="ui-last-updated">${new Date(dash.last_updated).toLocaleTimeString()}</strong></span>
            </div>
          </div>
        </div>
      </div>

      <!-- Custom Confirmation Modal -->
      <div class="custom-modal-backdrop d-none" id="confirm-modal-backdrop">
        <div class="custom-modal p-4">
          <h4 class="text-danger mb-3 fw-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i>Critical Action</h4>
          <p class="text-secondary mb-4" style="font-size: 0.9rem;">
            You are about to reset all vehicle counters and completely purge all logs. This action is irreversible. Do you wish to continue?
          </p>
          <div class="d-flex align-items-center justify-content-end gap-2">
            <button class="btn btn-light btn-sm px-3" id="modal-btn-cancel">Cancel</button>
            <button class="btn btn-danger btn-sm px-3" id="modal-btn-confirm">Yes, Reset All</button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  },

  bindEvents() {
    const btnAuto = document.getElementById('btn-mode-auto');
    const btnManual = document.getElementById('btn-mode-manual');
    const lightSwitch = document.getElementById('light-state-switch');
    const btnReset = document.getElementById('btn-reset-stats');

    const modalBackdrop = document.getElementById('confirm-modal-backdrop');
    const modalCancel = document.getElementById('modal-btn-cancel');
    const modalConfirm = document.getElementById('modal-btn-confirm');

    // Trigger AUTO Mode
    btnAuto.addEventListener('click', async () => {
      try {
        btnAuto.disabled = true;
        // In AUTO mode, default light to OFF initially or let edge sensors decide
        await apiService.sendLightCommand('OFF', 'auto', this.adminEmail);
      } catch (e) {
        alert('Failed to switch to auto mode: ' + e.message);
      } finally {
        btnAuto.disabled = false;
      }
    });

    // Trigger MANUAL Mode
    btnManual.addEventListener('click', async () => {
      try {
        btnManual.disabled = true;
        // Keep current light state, just toggle mode
        const currentLight = lightSwitch.checked ? 'ON' : 'OFF';
        await apiService.sendLightCommand(currentLight, 'manual', this.adminEmail);
      } catch (e) {
        alert('Failed to switch to manual mode: ' + e.message);
      } finally {
        btnManual.disabled = false;
      }
    });

    // Light State Override Switch
    lightSwitch.addEventListener('change', async () => {
      try {
        lightSwitch.disabled = true;
        const targetState = lightSwitch.checked ? 'ON' : 'OFF';
        await apiService.sendLightCommand(targetState, 'manual', this.adminEmail);
      } catch (e) {
        alert('Failed to change light state: ' + e.message);
        lightSwitch.checked = !lightSwitch.checked; // Revert
      } finally {
        lightSwitch.disabled = false;
      }
    });

    // Reset Modal Bindings
    btnReset.addEventListener('click', () => {
      modalBackdrop.classList.remove('d-none');
      setTimeout(() => modalBackdrop.classList.add('show'), 10);
    });

    modalCancel.addEventListener('click', () => {
      modalBackdrop.classList.remove('show');
      setTimeout(() => modalBackdrop.classList.add('d-none'), 250);
    });

    modalConfirm.addEventListener('click', async () => {
      modalConfirm.disabled = true;
      try {
        await apiService.resetDashboardStats(this.adminEmail);
        
        // Hide Modal
        modalBackdrop.classList.remove('show');
        setTimeout(() => modalBackdrop.classList.add('d-none'), 250);

        // Flash a notification toast
        this.showToast('System reset completed successfully.');
      } catch (e) {
        alert('Purge operation failed: ' + e.message);
      } finally {
        modalConfirm.disabled = false;
      }
    });
  },

  updateUI(dash) {
    const isManual = dash.current_mode === 'manual';
    const isAuto = dash.current_mode === 'auto';
    const isOn = dash.light_status === 'ON';

    const btnAuto = document.getElementById('btn-mode-auto');
    const btnManual = document.getElementById('btn-mode-manual');
    const lightSwitch = document.getElementById('light-state-switch');
    const modeDesc = document.getElementById('mode-desc');
    const badge = document.getElementById('ui-light-badge');
    const lastUpdateEl = document.getElementById('ui-last-updated');

    if (btnAuto) {
      if (isAuto) btnAuto.classList.add('active');
      else btnAuto.classList.remove('active');
    }
    if (btnManual) {
      if (isManual) btnManual.classList.add('active');
      else btnManual.classList.remove('active');
    }
    if (modeDesc) {
      modeDesc.textContent = isAuto ? 'Adaptive edge sensors driving state' : 'Fixed override states engaged';
    }
    if (lightSwitch) {
      lightSwitch.checked = isOn;
      lightSwitch.disabled = !isManual;
    }
    if (badge) {
      badge.textContent = dash.light_status;
      badge.className = `badge ${isOn ? 'bg-success' : 'bg-secondary'}`;
    }
    if (lastUpdateEl) {
      lastUpdateEl.textContent = new Date(dash.last_updated).toLocaleTimeString();
    }
  },

  showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.style.borderLeftColor = 'var(--danger)';
    toast.innerHTML = `
      <div>
        <div style="font-weight: 700; font-size: 0.85rem;"><i class="bi bi-trash3-fill me-2 text-danger"></i>Stats Purged</div>
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
    realtimeService.unsubscribeAll();
    this.container = null;
  }
};
