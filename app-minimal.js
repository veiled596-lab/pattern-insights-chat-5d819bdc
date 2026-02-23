// Minimal App.js - Just the essentials

const AppState = {
    currentUser: null,
    currentView: 'home'
};

function showView(viewId) {
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // Show target view
    const targetView = document.getElementById(viewId + '-view');
    if (targetView) {
        targetView.classList.remove('hidden');
    }
    
    AppState.currentView = viewId;
}

function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status-message');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${type}`;
        statusDiv.classList.remove('hidden');
        
        setTimeout(() => {
            statusDiv.classList.add('hidden');
        }, 3000);
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const selectUserBtn = document.getElementById('select-user-btn');
    if (selectUserBtn) {
        selectUserBtn.addEventListener('click', () => {
            console.log('Select User clicked');
            showStatus('User selection coming soon!', 'info');
        });
    }
    
    const createUserBtn = document.getElementById('create-user-btn');
    if (createUserBtn) {
        createUserBtn.addEventListener('click', () => {
            console.log('Create User clicked');
            showStatus('User creation coming soon!', 'info');
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initializing...');
    setupEventListeners();
    showView('home');
    showStatus('👋 Welcome to UpEye! Minimal version working!', 'success');
});
