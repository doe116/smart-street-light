/**
 * 404 Page Component
 * Renders a premium error screen when a page is not found.
 */
export const Error404Page = {
  mount(container) {
    container.innerHTML = `
      <div class="d-flex align-items-center justify-content-center py-5" style="min-height: 60vh;">
        <div class="glass-card text-center p-5" style="max-width: 500px; border-radius: var(--radius-lg);">
          <div class="display-1 text-info fw-extrabold mb-3" style="font-family: var(--font-display); font-size: 6rem; letter-spacing: -0.05em;">404</div>
          <h3 class="mb-3" style="font-family: var(--font-display); font-weight: 700;">Page Not Found</h3>
          <p class="text-secondary mb-4" style="font-size: 0.95rem;">
            The requested page does not exist or has been relocated. Check the URL hash or return to safety.
          </p>
          <a class="btn btn-primary btn-sm px-4 py-2 fw-bold" href="#dashboard" id="btn-back-home" style="border-radius: var(--radius-sm);">
            <i class="bi bi-house-door-fill me-2"></i> Return to Dashboard
          </a>
        </div>
      </div>
    `;

    // Bind back home redirect trigger
    document.getElementById('btn-back-home').addEventListener('click', (e) => {
      // Allow standard link navigation hash changes
    });
  },
  unmount() {
    // No cleanup required
  }
};
