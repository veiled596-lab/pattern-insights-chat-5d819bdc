// Clean App.js - Working version with all features

// Global Application State
const AppState = {
    currentUser: null,
    currentView: 'home',
    selectedDate: null,
    currentPatterns: [],
    patternView: 'log',
    currentPatternLength: 2,
    currentMonth: new Date().getMonth(),
    currentYear: new Date().getFullYear()
};

// Utility Functions
function calculateMedian(values) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 
        ? (sorted[mid - 1] + sorted[mid]) / 2 
        : sorted[mid];
}

function calculateHealthBenefitsScore(healthMetrics) {
    if (!healthMetrics) return 50;
    
    const { heart_rate, stress_level, energy_level, hydration_level, sleep_quality } = healthMetrics;
    
    // Optimal ranges (lower stress is better, higher is better for others)
    const heartScore = heart_rate >= 60 && heart_rate <= 100 ? 100 : Math.max(0, 100 - Math.abs(80 - heart_rate));
    const stressScore = Math.max(0, 100 - (stress_level * 10));
    const energyScore = energy_level * 10;
    const hydrationScore = hydration_level * 10;
    const sleepScore = sleep_quality * 10;
    
    return Math.round((heartScore + stressScore + energyScore + hydrationScore + sleepScore) / 5);
}

function getHealthBenefitsDescription(score) {
    if (score >= 80) return 'Excellent health benefits';
    if (score >= 60) return 'Good health benefits';
    if (score >= 40) return 'Moderate health benefits';
    if (score >= 20) return 'Low health benefits';
    return 'Poor health benefits';
}

// View Management
function showView(viewId) {
    console.log('Showing view:', viewId);
    
    // Hide all views
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });
    
    // Show target view
    const targetView = document.getElementById(viewId + '-view');
    if (targetView) {
        targetView.classList.remove('hidden');
        console.log('View shown successfully');
    } else {
        console.log('View not found:', viewId + '-view');
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

// User Management
async function loadUsers() {
    console.log('Loading users...');
    try {
        if (!window.supabaseClient) {
            console.log('Supabase client not available, using demo mode');
            showStatus('👤 Demo mode: Showing sample user', 'info');
            showView('user-selection');
            return;
        }
        
        const { data: users, error } = await window.supabaseClient
            .from('users')
            .select('*');
        
        if (error) throw error;
        
        const usersList = document.getElementById('users-list');
        if (usersList) {
            usersList.innerHTML = '';
            
            users.forEach(user => {
                const userCard = document.createElement('div');
                userCard.className = 'user-card';
                userCard.innerHTML = `
                    <h3>${user.username}</h3>
                    <p>Created: ${new Date(user.created_at).toLocaleDateString()}</p>
                `;
                userCard.addEventListener('click', () => selectUser(user));
                usersList.appendChild(userCard);
            });
        }
        
        showView('user-selection');
        showStatus(`✅ Found ${users.length} users`, 'success');
    } catch (error) {
        console.error('Error loading users:', error);
        showStatus('Error loading users: ' + error.message, 'error');
    }
}

async function selectUser(user) {
    AppState.currentUser = user;
    showView('days');
    await loadDaysForUser(user.user_id);
}

// Pattern Analysis Functions
function analyzeSequentialPatterns(activities) {
    const patterns = [];
    
    for (let length = 1; length <= 4; length++) {
        const lengthPatterns = analyzePatternsByLength(activities, length);
        patterns.push(...lengthPatterns);
    }
    
    return patterns;
}

function analyzePatternsByLength(activities, length) {
    const patterns = {};
    
    for (let i = 0; i <= activities.length - length; i++) {
        const pattern = activities.slice(i, i + length)
            .map(a => a.activity_name.toLowerCase().replace(/\s+/g, '_'))
            .join('_');
        
        if (!patterns[pattern]) {
            patterns[pattern] = {
                pattern_id: pattern,
                pattern_name: pattern,
                pattern_type: 'sequential',
                length: length,
                occurrences: [],
                frequency: 0,
                avg_productivity: 0,
                avg_satisfaction: 0,
                avg_health_metrics: {},
                health_benefits_score: 0,
                health_benefits_description: ''
            };
        }
        
        patterns[pattern].occurrences.push({
            activities: activities.slice(i, i + length).map(a => a.activity_name),
            day_id: activities[i].day_id
        });
        patterns[pattern].frequency++;
    }
    
    // Calculate metrics for each pattern
    Object.values(patterns).forEach(pattern => {
        const allOccurrences = pattern.occurrences.flatMap(occ => 
            activities.filter(a => occ.activities.includes(a.activity_name))
        );
        
        if (allOccurrences.length > 0) {
            pattern.avg_productivity = allOccurrences.reduce((sum, a) => sum + a.productivity_score, 0) / allOccurrences.length;
            pattern.avg_satisfaction = allOccurrences.reduce((sum, a) => sum + a.satisfaction_score, 0) / allOccurrences.length;
            
            // Calculate health metrics
            const healthMetrics = allOccurrences.filter(a => a.health_metrics).map(a => a.health_metrics);
            if (healthMetrics.length > 0) {
                pattern.avg_health_metrics = {
                    heart_rate: healthMetrics.reduce((sum, m) => sum + m.avg_heart_rate, 0) / healthMetrics.length,
                    stress_level: healthMetrics.reduce((sum, m) => sum + m.stress_level, 0) / healthMetrics.length,
                    energy_level: healthMetrics.reduce((sum, m) => sum + m.energy_level, 0) / healthMetrics.length,
                    hydration_level: healthMetrics.reduce((sum, m) => sum + m.hydration_level, 0) / healthMetrics.length,
                    sleep_quality: healthMetrics.reduce((sum, m) => sum + m.sleep_quality, 0) / healthMetrics.length
                };
                
                pattern.health_benefits_score = calculateHealthBenefitsScore(pattern.avg_health_metrics);
                pattern.health_benefits_description = getHealthBenefitsDescription(pattern.health_benefits_score);
            }
        }
    });
    
    return Object.values(patterns);
}

// Pattern Display Functions
function displayPatternLog() {
    console.log('Displaying pattern log...');
    const patternLogList = document.getElementById('pattern-log-list');
    if (patternLogList) {
        patternLogList.innerHTML = '';
        
        // Add visualization container
        let vizContainer = document.getElementById('pattern-visualization');
        if (!vizContainer) {
            vizContainer = document.createElement('div');
            vizContainer.id = 'pattern-visualization';
            vizContainer.className = 'pattern-visualization';
            const patternDiagnosticsView = document.getElementById('pattern-diagnostics-view');
            if (patternDiagnosticsView) {
                patternDiagnosticsView.appendChild(vizContainer);
            }
        }
        
        // Filter out unwanted patterns and sort by occurrences
        const filteredPatterns = AppState.currentPatterns.filter(p => 
            p.pattern_type !== 'time_based' && 
            p.pattern_type !== 'health_based' &&
            !p.pattern_id.includes('morning') &&
            !p.pattern_id.includes('afternoon') &&
            !p.pattern_id.includes('high_stress') &&
            !p.pattern_id.includes('high_energy')
        );
        filteredPatterns.sort((a, b) => b.frequency - a.frequency);
        
        // Display visualization chart
        if (vizContainer && filteredPatterns.length > 0) {
            vizContainer.innerHTML = 
                '<div class="pattern-chart">' +
                '<h3>📊 Pattern ' + AppState.currentPatternLength + ' - Top ' + Math.min(10, filteredPatterns.length) + ' Patterns</h3>' +
                '<div class="chart-container">' +
                filteredPatterns.slice(0, 10).map((pattern, index) => 
                    '<div class="pattern-bar" style="width: ' + ((pattern.frequency / filteredPatterns[0].frequency) * 100) + '%">' +
                    '<div class="pattern-info">' +
                    '<span class="pattern-name">' + pattern.pattern_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + '</span>' +
                    '<span class="pattern-count">' + pattern.frequency + ' times</span>' +
                    '<span class="pattern-health">🏥 ' + pattern.health_benefits_score + '/100</span>' +
                    '</div></div>'
                ).join('') +
                '</div></div>';
        }
        
        // Add filter button
        const header = document.querySelector('#pattern-diagnostics-view h2');
        if (header && !document.getElementById('filter-patterns-btn')) {
            const filterBtn = document.createElement('button');
            filterBtn.id = 'filter-patterns-btn';
            filterBtn.className = 'secondary-btn';
            filterBtn.textContent = '🔍 Filter by Activity';
            filterBtn.onclick = function() {
                alert('Filter functionality would open here with activity selection');
            };
            header.appendChild(filterBtn);
        }
        
        if (AppState.currentPatterns.length === 0) {
            patternLogList.innerHTML = '<p>No patterns found</p>';
            return;
        }
        
        const patternItems = AppState.currentPatterns.filter(pattern => pattern.pattern_type !== "time_based" && pattern.pattern_type !== "health_based").map((pattern) => {
            const healthScoreColor = pattern.health_benefits_score >= 80 ? '#4CAF50' :
                                     pattern.health_benefits_score >= 60 ? '#FF9800' :
                                     pattern.health_benefits_score >= 40 ? '#FFC107' : '#F44336';
            
            return `
                <div class="pattern-item" onclick="showPatternDetails('${pattern.pattern_id}')">
                    <div class="pattern-header">
                        <h4>${pattern.pattern_name}</h4>
                        <span class="pattern-type">${pattern.pattern_type}</span>
                    </div>
                    <div class="pattern-metrics">
                        <div class="metric-item">📊 ${pattern.avg_productivity}/10 Productivity</div>
                        <div class="metric-item">😊 ${pattern.avg_satisfaction}/10 Satisfaction</div>
                    </div>
                    <div class="health-metrics">
                        <div class="metric-item">❤️ ${pattern.avg_health_metrics.heart_rate || 'N/A'}</div>
                        <div class="metric-item">😰 ${pattern.avg_health_metrics.stress_level || 'N/A'}/10 Stress</div>
                        <div class="metric-item">⚡ ${pattern.avg_health_metrics.energy_level || 'N/A'}/10 Energy</div>
                        <div class="metric-item">💧 ${pattern.avg_health_metrics.hydration_level || 'N/A'}/10 Hydration</div>
                        <div class="metric-item">😴 ${pattern.avg_health_metrics.sleep_quality || 'N/A'}/10 Sleep</div>
                    </div>
                    <div class="health-benefits" style="border-left: 4px solid ${healthScoreColor};">
                        🏥 ${pattern.health_benefits_score}/100 Health Benefits
                        <div>${pattern.health_benefits_description}</div>
                    </div>
                    <div class="pattern-frequency">
                        🔁 ${pattern.frequency} occurrences
                    </div>
                </div>
            `;
        }).join('');
        
        patternLogList.innerHTML = patternItems;
    }
}

function showPatternDetails(patternId) {
    const pattern = AppState.currentPatterns.find(p => p.pattern_id === patternId);
    if (pattern) {
        alert(`Pattern Details:\n\nName: ${pattern.pattern_name}\nType: ${pattern.pattern_type}\nFrequency: ${pattern.frequency}\nHealth Score: ${pattern.health_benefits_score}/100\n\n${pattern.health_benefits_description}`);
    }
}

// Event Listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const selectUserBtn = document.getElementById('select-user-btn');
    if (selectUserBtn) {
        selectUserBtn.addEventListener('click', loadUsers);
    }
    
    const createUserBtn = document.getElementById('create-user-btn');
    if (createUserBtn) {
        createUserBtn.addEventListener('click', () => showView('create-user'));
    }
    
    const backToHome = document.getElementById('back-to-home');
    if (backToHome) {
        backToHome.addEventListener('click', () => showView('home'));
    }
    
    console.log('Event listeners set up');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    console.log('App initializing...');
    try {
        setupEventListeners();
        showView('home');
        showStatus('👋 Welcome to UpEye! Select a user or create a new one to get started.', 'info');
        console.log('App initialized successfully');
    } catch (error) {
        console.error('App initialization error:', error);
        showStatus('⚠️ App loaded with limited functionality', 'warning');
    }
});

// Make functions globally accessible
window.loadUsers = loadUsers;
window.showView = showView;
window.showPatternDetails = showPatternDetails;
window.displayPatternLog = displayPatternLog;
