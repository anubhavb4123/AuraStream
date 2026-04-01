// ============================================
// AuraStream — Toast Notification System
// ============================================

import { createElement, uid } from '../utils/helpers.js';
import { TOAST_DURATION } from '../utils/constants.js';

let toastContainer = null;

function ensureContainer() {
  if (!toastContainer) {
    toastContainer = createElement('div', {
      className: 'toast-container',
      id: 'aura-toast-container',
    });
    // Styles inline since this is a global overlay
    Object.assign(toastContainer.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      zIndex: '50',
      pointerEvents: 'none',
      maxWidth: '400px',
      width: '100%',
    });
    document.body.appendChild(toastContainer);
  }
  return toastContainer;
}

const TOAST_COLORS = {
  error: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.3)', icon: '✕', color: '#ef4444' },
  warning: { bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.3)', icon: '⚠', color: '#f59e0b' },
  info: { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgba(59, 130, 246, 0.3)', icon: 'ℹ', color: '#3b82f6' },
  success: { bg: 'rgba(34, 197, 94, 0.15)', border: 'rgba(34, 197, 94, 0.3)', icon: '✓', color: '#22c55e' },
};

/**
 * Show a toast notification
 * @param {string} message
 * @param {'error'|'warning'|'info'|'success'} type
 * @param {number} [duration]
 */
export function showToast(message, type = 'info', duration = TOAST_DURATION) {
  const container = ensureContainer();
  const colors = TOAST_COLORS[type] || TOAST_COLORS.info;
  const id = `toast-${uid()}`;

  const toast = createElement('div', {
    id,
    html: `
      <span style="font-size: 16px; flex-shrink: 0; width: 24px; text-align: center; color: ${colors.color}">${colors.icon}</span>
      <span style="flex: 1; font-size: 14px; line-height: 1.5;">${message}</span>
    `,
  });

  Object.assign(toast.style, {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '10px',
    padding: '12px 16px',
    borderRadius: '12px',
    background: colors.bg,
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: `1px solid ${colors.border}`,
    color: '#e2e8f0',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
    pointerEvents: 'auto',
    animation: 'slide-in-right 300ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
    cursor: 'pointer',
  });

  // Click to dismiss
  toast.addEventListener('click', () => dismissToast(toast));

  container.appendChild(toast);

  // Auto dismiss
  if (duration > 0) {
    setTimeout(() => dismissToast(toast), duration);
  }

  return toast;
}

function dismissToast(toast) {
  if (!toast || !toast.parentNode) return;
  toast.style.animation = 'slide-out-right 200ms ease forwards';
  setTimeout(() => {
    toast.parentNode?.removeChild(toast);
  }, 200);
}
