import { authService } from '../services/auth.js';

export class Navigation {
  /**
   * @param {string} containerId 
   * @param {function} onPageChange Callback when page is switched
   */
  constructor(containerId, onPageChange) {
    this.container = document.getElementById(containerId);
    this.onPageChange = onPageChange;
    this.activePage = 'dashboard';
    
    this.links = [
      { id: 'dashboard', label: 'Dashboard', icon: 'bi-grid-1x2-fill' },
      { id: 'analytics', label: 'Analytics', icon: 'bi-bar-chart-line-fill' },
      { id: 'vehicles', label: 'Vehicles', icon: 'bi-car-front-fill' },
      { id: 'control', label: 'Light Control', icon: 'bi-lightbulb-fill' },
      { id: 'settings', label: 'Settings', icon: 'bi-gear-fill' },
      { id: 'logs', label: 'Admin Logs', icon: 'bi-file-earmark-text-fill' },
      { id: 'about', label: 'About', icon: 'bi-info-circle-fill' }
    ];
  }

  /**
   * Set active page and repaint navigation
   * @param {string} pageId 
   */
  setActivePage(pageId) {
    this.activePage = pageId;
    this.render();
  }

  async handleLogout() {
    if (confirm('Are you sure you want to log out?')) {
      const { error } = await authService.logout();
      if (!error) {
        window.location.href = 'login.html';
      }
    }
  }

  render() {
    if (!this.container) return;

    // Build link list
    const linksHtml = this.links.map(link => {
      const isActive = this.activePage === link.id ? 'active' : '';
      return `
        <li>
          <a class="sidebar-link ${isActive}" data-page="${link.id}">
            <i class="bi ${link.icon}"></i>
            <span>${link.label}</span>
          </a>
        </li>
      `;
    }).join('');

    this.container.innerHTML = `
      <div class="sidebar-header">
        <div class="sidebar-brand-icon">
          <i class="bi bi-lightbulb-history-fill"></i>
        </div>
        <div class="sidebar-brand-name">
          SmartLight IoT
        </div>
      </div>
      
      <ul class="sidebar-menu">
        ${linksHtml}
      </ul>
      
      <div class="sidebar-footer">
        <div class="user-widget">
          <div class="user-avatar" id="user-avatar-initials">A</div>
          <div class="user-info">
            <div style="font-size: 0.85rem; font-weight: 700; color: var(--text-primary);" id="sidebar-user-email">Admin User</div>
            <div style="font-size: 0.75rem; color: var(--text-muted);">Administrator</div>
          </div>
        </div>
        <button class="btn btn-link text-danger p-0 ms-2" id="logout-btn" title="Sign Out">
          <i class="bi bi-box-arrow-right" style="font-size: 1.3rem;"></i>
        </button>
      </div>
    `;

    // Bind navigation click listeners
    const navLinks = this.container.querySelectorAll('.sidebar-link');
    for (const link of navLinks) {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const pageId = link.getAttribute('data-page');
        this.setActivePage(pageId);
        if (this.onPageChange) {
          this.onPageChange(pageId);
        }
      });
    }

    // Bind logout action
    document.getElementById('logout-btn').addEventListener('click', () => this.handleLogout());

    // Update user info
    this.loadUserInfo();
  }

  async loadUserInfo() {
    const user = await authService.getCurrentUser();
    if (user) {
      const email = user.email;
      const initial = email ? email.substring(0, 1).toUpperCase() : 'A';
      
      const avatarEl = document.getElementById('user-avatar-initials');
      const emailEl = document.getElementById('sidebar-user-email');
      
      if (avatarEl) avatarEl.textContent = initial;
      if (emailEl) emailEl.textContent = email.split('@')[0];
    }
  }
}
