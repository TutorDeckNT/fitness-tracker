// js/utils.js
export function showToast(message, type = 'info', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('exiting');
        toast.addEventListener('animationend', () => toast.remove());
    }, duration);
}

export function toggleButtonLoading(btn, isLoading) {
    if (!btn) return;
    const otherToolbarButtons = btn.closest('.toolbar')?.querySelectorAll('.action-btn');
    btn.classList.toggle('loading', isLoading);
    btn.disabled = isLoading;
    if (isLoading && otherToolbarButtons) {
        otherToolbarButtons.forEach(otherBtn => {
            if (otherBtn !== btn) otherBtn.disabled = true;
        });
    }
}

export function lockBodyScroll() { document.body.classList.add('has-active-modal'); }
export function unlockBodyScroll() {
    setTimeout(() => {
        if (document.querySelectorAll('.modal-overlay.active, .dropdown-overlay.active').length === 0) {
            document.body.classList.remove('has-active-modal');
        }
    }, 100);
}

export function toggleContentSkeleton(isLoading) {
    const mainContentWrapper = document.getElementById('main-content-wrapper');
    const skeletonLoader = document.getElementById('skeleton-loader');
    if (!mainContentWrapper || !skeletonLoader) return;
    if (isLoading) {
        mainContentWrapper.style.display = 'none';
        skeletonLoader.style.display = 'block';
        skeletonLoader.classList.remove('fade-out');
        mainContentWrapper.classList.remove('fade-in');
    } else {
        skeletonLoader.classList.add('fade-out');
        skeletonLoader.addEventListener('animationend', () => {
            skeletonLoader.style.display = 'none';
        }, { once: true });
        mainContentWrapper.style.display = 'block';
        mainContentWrapper.classList.add('fade-in');
    }
}
