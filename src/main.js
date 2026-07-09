import { authService } from './services/auth.js';
import { Navigation } from './components/Navigation.js';
import { ThemeToggler } from './components/ThemeToggler.js';

// Page Imports
import { DashboardPage } from './pages/dashboard.js';
import { AnalyticsPage } from './pages/analytics.js';
import { VehiclesPage } from './pages/vehicles.js';
import { ControlPage } from './pages/control.js';
import { SettingsPage } from './pages/settings.js';
import { LogsPage } from './pages/logs.js';
import { AboutPage } from './pages/about.js';
import { Error404Page } from './pages/error404.js';

const PAGES = {
  dashboard: { module: DashboardPage, title: 'System Telemetry Dashboard', subtitle: 'Real-time telemetry and street light controller status' },
  analytics: { module: AnalyticsPage, title: 'Traffic Analytics', subtitle: 'Historical vehicle logs and light usage distributions' },
  vehicles: { module: VehiclesPage, title: 'Vehicle Detections', subtitle: 'Comprehensive logs of ultrasonic sensor triggers' },
  control: { module: ControlPage, title: 'Remote Control Overrides', subtitle: 'Manual lighting overrides and system purge maintenance' },
  settings: { module: SettingsPage, title: 'System Settings', subtitle: 'Calibrate daylight thresholds, scanning bounds, and timer schedules' },
  logs: { module: LogsPage, title: 'Admin Logs', subtitle: 'Audit trail of administrative manual overrides and setting changes' },
  about: { module: AboutPage, title: 'System Details', subtitle: 'Embedded hardware specs and Clean Architecture definitions' },
  404: { module: Error404Page, title: 'Page Not Found', subtitle: 'Requested view could not be located' }
};

let activePageInstance = null;
let navigationInstance = null;

// Initialize Application on Page Load
window.addEventListener('DOMContentLoaded', async () => {
  // 1. Authenticate administrator session
  const session = await authService.getSession();
  if (!session) {
    window.location.href = 'login.html';
    return;
  }

  // 2. Hide Global Loading Overlay
  const loader = document.getElementById('global-loader');
  if (loader) {
    loader.style.opacity = '0';
    setTimeout(() => loader.remove(), 300);
  }

  // 3. Mount Theme Selector
  new ThemeToggler('theme-toggler-container');

  // 4. Initialize Navigation Sidebar
  navigationInstance = new Navigation('sidebar-container', (pageId) => {
    switchPage(pageId);
  });
  navigationInstance.render();

  // 5. Setup Mobile Navigation Layout Toggle
  const mobileToggle = document.getElementById('mobile-sidebar-toggle');
  const sidebar = document.getElementById('sidebar-container');
  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('show');
    });

    // Close mobile sidebar when clicking main page content
    document.addEventListener('click', () => {
      sidebar.classList.remove('show');
    });
  }

  // 6. Route to active page from hash or default to Dashboard
  const initialPage = window.location.hash.replace('#', '') || 'dashboard';
  const targetPage = PAGES[initialPage] ? initialPage : 'dashboard';
  navigationInstance.setActivePage(targetPage);
  switchPage(targetPage);
});

/**
 * Handle Single Page Application route transitions
 * @param {string} pageId 
 */
async function switchPage(pageId) {
  let pageConfig = PAGES[pageId];
  if (!pageConfig) {
    pageId = '404';
    pageConfig = PAGES['404'];
  }

  // Unmount active page to unsubscribe listeners
  if (activePageInstance && activePageInstance.unmount) {
    try {
      activePageInstance.unmount();
    } catch (e) {
      console.warn('Error during page unmounting:', e);
    }
  }

  // Update URL hash state without triggering page refresh
  window.history.pushState(null, '', `#${pageId}`);

  // Highlight navigation item if it exists in the navigation link configurations
  if (navigationInstance) {
    navigationInstance.setActivePage(pageId);
  }

  // Update Breadcrumb Header
  const titleEl = document.getElementById('current-page-title');
  const subtitleEl = document.getElementById('current-page-subtitle');
  if (titleEl) titleEl.textContent = pageConfig.title;
  if (subtitleEl) subtitleEl.textContent = pageConfig.subtitle;

  // Mount Target Page
  const contentEl = document.getElementById('page-content');
  if (contentEl) {
    activePageInstance = pageConfig.module;
    try {
      await activePageInstance.mount(contentEl);
    } catch (err) {
      console.error(`Mount failure on page '${pageId}':`, err);
      contentEl.innerHTML = `
        <div class="alert alert-danger my-4">
          <h4 class="alert-heading"><i class="bi bi-exclamation-octagon-fill me-2"></i>Navigation Error</h4>
          <p>An unexpected error occurred while loading this view.</p>
          <hr>
          <p class="mb-0" style="font-size: 0.85rem;">Reason: ${err.message}</p>
        </div>
      `;
    }
  }
}
