import { apiService } from '../services/api.js';
import { realtimeService } from '../services/realtime.js';
import { LogsTable } from '../components/LogsTable.js';
import { helpers } from '../utils/helpers.js';

let detectionsTableInstance = null;
let currentOffset = 0;
const LIMIT = 15;
let page = 1;
let allDetections = [];

export const VehiclesPage = {
  async mount(container) {
    container.innerHTML = `
      <div class="glass-card mb-4 d-flex flex-wrap align-items-center justify-content-between gap-3">
        <div>
          <h4 class="mb-1" style="font-family: var(--font-display); font-weight: 700;">Vehicle Detection Logs</h4>
          <p class="text-secondary mb-0" style="font-size: 0.85rem;">Chronological audit of sensor triggers and calculated speeds/distances</p>
        </div>
        <div class="d-flex align-items-center gap-2">
          <button class="btn btn-outline-secondary btn-sm" id="btn-export-csv">
            <i class="bi bi-file-earmark-spreadsheet me-1"></i> CSV
          </button>
          <button class="btn btn-outline-secondary btn-sm" id="btn-export-excel">
            <i class="bi bi-file-earmark-excel me-1"></i> Excel
          </button>
          <button class="btn btn-outline-info btn-sm" id="btn-export-pdf">
            <i class="bi bi-file-earmark-pdf me-1"></i> PDF
          </button>
        </div>
      </div>
      
      <!-- Simulation Controls -->
      <div class="glass-card mb-4">
        <h5 class="mb-3" style="font-family: var(--font-display); font-weight: 700;">
          <i class="bi bi-cpu text-info me-2"></i>Simulation Controls
        </h5>
        <div class="d-flex flex-wrap gap-3">
          <button class="btn btn-primary d-flex align-items-center gap-2" id="btn-simulate-dir1">
            <i class="bi bi-plus-circle-fill"></i> Simulate Vehicle: Direction A (Incoming)
          </button>
          <button class="btn btn-success d-flex align-items-center gap-2" id="btn-simulate-dir2">
            <i class="bi bi-plus-circle-fill"></i> Simulate Vehicle: Direction B (Outgoing)
          </button>
        </div>
      </div>
      
      <div class="glass-card">
        <div id="detections-table-container"></div>
      </div>
    `;

    // Instantiate paginated LogsTable component for detections
    detectionsTableInstance = new LogsTable('detections-table-container', {
      headers: ['Record ID', 'Timestamp', 'Sensor Distance (cm)', 'Direction', 'Vehicle Index'],
      keys: ['id', 'detected_at', 'sensor_distance', 'direction', 'vehicle_count'],
      formatters: {
        detected_at: (val) => helpers.formatDateTime(val),
        sensor_distance: (val) => `<strong>${Number(val).toFixed(1)}</strong> cm`,
        direction: (val) => {
          const isDir1 = val === 'direction1';
          const icon = isDir1 ? 'bi-arrow-right-circle-fill text-primary' : 'bi-arrow-left-circle-fill text-success';
          const text = isDir1 ? 'Direction A (Incoming)' : 'Direction B (Outgoing)';
          return `<i class="bi ${icon} me-1"></i> ${text}`;
        },
        vehicle_count: (val) => `<span class="badge bg-secondary">#${val}</span>`
      }
    });

    // Configure pagination event handlers
    detectionsTableInstance.onNextPage = () => {
      page++;
      currentOffset += LIMIT;
      this.fetchDetections();
    };

    detectionsTableInstance.onPrevPage = () => {
      if (page > 1) {
        page--;
        currentOffset -= LIMIT;
        this.fetchDetections();
      }
    };

    // Load initial data
    await this.fetchDetections();
    this.fetchAllDetectionsForExport();

    // Subscribe to new vehicle detections in real time
    realtimeService.subscribeToDetections((newDetection) => {
      // Trigger user-facing alert/toast
      this.showToast(newDetection);
      // Reset view to first page
      page = 1;
      currentOffset = 0;
      this.fetchDetections();
      this.fetchAllDetectionsForExport();
    });

    // Attach export event listeners
    document.getElementById('btn-export-csv').addEventListener('click', () => this.export('csv'));
    document.getElementById('btn-export-excel').addEventListener('click', () => this.export('excel'));
    document.getElementById('btn-export-pdf').addEventListener('click', () => this.export('pdf'));

    // Attach simulation event listeners
    document.getElementById('btn-simulate-dir1').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      await this.simulateVehicle('direction1');
      btn.disabled = false;
    });
    document.getElementById('btn-simulate-dir2').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      await this.simulateVehicle('direction2');
      btn.disabled = false;
    });
  },

  async fetchDetections() {
    try {
      const detections = await apiService.getVehicleDetections(LIMIT + 1, currentOffset);
      const hasMore = detections.length > LIMIT;
      const displayData = hasMore ? detections.slice(0, LIMIT) : detections;
      
      detectionsTableInstance.update(displayData, page, hasMore);
    } catch (e) {
      console.error('Failed to load detections:', e);
    }
  },

  async fetchAllDetectionsForExport() {
    try {
      // Pull first 300 detections for reports
      allDetections = await apiService.getVehicleDetections(300, 0);
    } catch (e) {
      console.error('Failed to pre-fetch detections for export:', e);
    }
  },

  export(format) {
    const filename = `Vehicle_Detections_Export_${new Date().toISOString().slice(0,10)}`;
    const keys = ['id', 'detected_at', 'sensor_distance', 'direction', 'vehicle_count'];
    const headers = ['Record ID', 'Timestamp', 'Sensor Distance (cm)', 'Direction', 'Vehicle Index'];
    
    // Format timestamp for export readability
    const formattedData = allDetections.map(det => ({
      ...det,
      detected_at: helpers.formatDateTime(det.detected_at),
      direction: det.direction === 'direction1' ? 'Direction A (Incoming)' : 'Direction B (Outgoing)'
    }));

    if (format === 'csv') {
      helpers.exportToCSV(formattedData, `${filename}.csv`);
    } else if (format === 'excel') {
      helpers.exportToExcel(formattedData, `${filename}.xls`);
    } else if (format === 'pdf') {
      helpers.exportToPDF('Vehicle Detection Logs', headers, formattedData, keys);
    }
  },

  showToast(det) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const isDir1 = det.direction === 'direction1';
    const pathway = isDir1 ? 'Direction A (Incoming)' : 'Direction B (Outgoing)';
    const toast = document.createElement('div');
    toast.className = 'custom-toast';
    toast.style.borderLeftColor = isDir1 ? 'var(--primary)' : 'var(--success)';
    toast.innerHTML = `
      <div>
        <div style="font-weight: 700; font-size: 0.85rem;">
          <i class="bi bi-car-front-fill me-2 text-info"></i>Vehicle Detected!
        </div>
        <div class="text-secondary" style="font-size: 0.80rem;">
          Path: ${pathway} (Distance: ${Number(det.sensor_distance).toFixed(1)} cm)
        </div>
      </div>
      <button class="btn btn-close btn-sm" onclick="this.parentElement.remove()"></button>
    `;
    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) toast.remove();
    }, 5000);
  },

  async simulateVehicle(direction) {
    try {
      // Random sensor distance between 2 and 7 (e.g. 4.3 cm)
      const randomVal = Math.random() * (7 - 2) + 2;
      const roundedVal = Math.round(randomVal * 10) / 10;

      // Add vehicle detection log (which updates last_vehicle_detected_at to trigger the ESP32)
      await apiService.addVehicleDetection(direction, roundedVal);

      // Immediately override light to ON — mirrors ESP32's 2-second physical response
      await apiService.simulateLightOn();

      // After 2 seconds, turn light back OFF (same duration as ESP32 hardware timer)
      setTimeout(async () => {
        try {
          await apiService.simulateLightOff();
        } catch (e) {
          console.warn('[Simulate] Failed to auto-reset light OFF after 2s:', e);
        }
      }, 2000);
    } catch (e) {
      console.error('Failed to simulate vehicle detection:', e);
    }
  },

  unmount() {
    realtimeService.unsubscribeAll();
    detectionsTableInstance = null;
  }
};
