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

// Demo Mode Toggle
function toggleDemoMode() {
    const checkbox = document.getElementById('use-demo-mode');
    const statusDiv = document.getElementById('demo-status');
    
    if (checkbox.checked) {
        statusDiv.classList.remove('hidden');
        window.USE_MOCK_DATA = true;
        showStatus('🎮 Demo Mode activated - Using sample data', 'success');
    } else {
        statusDiv.classList.add('hidden');
        window.USE_MOCK_DATA = false;
        showStatus('🔄 Real Supabase mode activated', 'success');
    }
    
    // Reload current view to apply new mode
    if (AppState.currentUser) {
        loadDaysForUser(AppState.currentUser.user_id);
    }
}

// View Management
function showView(viewId) {
    document.querySelectorAll('.view').forEach(view => {
        view.classList.add('hidden');
    });
    document.getElementById(viewId).classList.remove('hidden');
    AppState.currentView = viewId;
}

function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('status-message');
    statusDiv.textContent = message;
    statusDiv.className = `status-message ${type}`;
    statusDiv.classList.remove('hidden');
    
    setTimeout(() => {
        statusDiv.classList.add('hidden');
    }, 3000);
}

// User Management
async function loadUsers() {
    try {
        const { data: users, error } = await window.supabaseClient
            .from('users')
            .select('*');
        
        if (error) throw error;
        
        const usersList = document.getElementById('users-list');
        usersList.innerHTML = '';
        
        users.forEach(user => {
            const userCard = document.createElement('div');
            userCard.className = 'user-card';
            userCard.innerHTML = `
                <h3>${user.username}</h3>
                <p>Created: ${new Date(user.created_at).toLocaleDateString()}</p>
            `;
            userCard.onclick = () => selectUser(user);
            usersList.appendChild(userCard);
        });
        
        showView('user-selection-view');
    } catch (error) {
        console.error('Error loading users:', error);
        showStatus('Error loading users: ' + error.message, 'error');
    }
}

async function selectUser(user) {
    AppState.currentUser = user;
    document.getElementById('pattern-user-name').textContent = user.username;
    await loadDaysForUser(user.user_id);
}

async function createUser(username, email) {
    try {
        const { data, error } = await window.supabaseClient
            .from('users')
            .insert([{ username, email }])
            .select();
        
        if (error) throw error;
        
        showStatus('User created successfully!', 'success');
        await selectUser(data[0]);
    } catch (error) {
        console.error('Error creating user:', error);
        showStatus('Error creating user: ' + error.message, 'error');
    }
}

// Days Management
async function loadDaysForUser(userId) {
    try {
        const { data: days, error } = await window.supabaseClient
            .from('days')
            .select('*')
            .eq('user_id', userId);
        
        if (error) throw error;
        
        // Generate calendar
        generateCalendar(days || []);
        
        // Show pattern analysis button if there are days
        if (days && days.length > 0) {
            // Add pattern button to calendar container
            const calendarContainer = document.querySelector('.calendar-container');
            const existingBtn = document.getElementById('analyze-patterns-btn');
            if (existingBtn) existingBtn.remove();
            
            const patternBtn = document.createElement('button');
            patternBtn.id = 'analyze-patterns-btn';
            patternBtn.className = 'primary-btn';
            patternBtn.textContent = '📈 Analyze Patterns';
            patternBtn.style.marginTop = '20px';
            patternBtn.style.width = '100%';
            patternBtn.onclick = () => loadPatternsForUser();
            calendarContainer.appendChild(patternBtn);
        }
        
        showView('days-table-view');
    } catch (error) {
        console.error('Error loading days:', error);
        showStatus('Error loading days: ' + error.message, 'error');
    }
}

function generateCalendar(days) {
    const calendarGrid = document.getElementById('calendar-grid');
    const monthYearSpan = document.getElementById('current-month-year');
    
    // Set month/year display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    monthYearSpan.textContent = `${monthNames[AppState.currentMonth]} ${AppState.currentYear}`;
    
    // Clear calendar
    calendarGrid.innerHTML = '';
    
    // Add day headers
    const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayHeaders.forEach(day => {
        const headerDiv = document.createElement('div');
        headerDiv.className = 'calendar-day-header';
        headerDiv.textContent = day;
        calendarGrid.appendChild(headerDiv);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(AppState.currentYear, AppState.currentMonth, 1).getDay();
    const daysInMonth = new Date(AppState.currentYear, AppState.currentMonth + 1, 0).getDate();
    const today = new Date();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        calendarGrid.appendChild(emptyDiv);
    }
    
    // Create day cells
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.className = 'calendar-day';
        dayDiv.textContent = day;
        
        // Check if this day has activities
        const dayDate = `${AppState.currentYear}-${String(AppState.currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const hasActivities = days.some(d => d.activity_date === dayDate);
        
        if (hasActivities) {
            dayDiv.classList.add('has-activities');
        }
        
        // Check if today
        if (today.getFullYear() === AppState.currentYear && 
            today.getMonth() === AppState.currentMonth && 
            today.getDate() === day) {
            dayDiv.classList.add('today');
        }
        
        // Add click handler
        dayDiv.onclick = () => {
            const dayData = days.find(d => d.activity_date === dayDate);
            if (dayData) {
                loadActivitiesForDay(dayData);
            }
        };
        
        calendarGrid.appendChild(dayDiv);
    }
}

// Calendar navigation
document.getElementById('prev-month').addEventListener('click', () => {
    AppState.currentMonth--;
    if (AppState.currentMonth < 0) {
        AppState.currentMonth = 11;
        AppState.currentYear--;
    }
    loadDaysForUser(AppState.currentUser.user_id);
});

document.getElementById('next-month').addEventListener('click', () => {
    AppState.currentMonth++;
    if (AppState.currentMonth > 11) {
        AppState.currentMonth = 0;
        AppState.currentYear++;
    }
    loadDaysForUser(AppState.currentUser.user_id);
});

// Activities Management
async function loadActivitiesForDay(day) {
    try {
        AppState.selectedDate = day;
        document.getElementById('selected-date').textContent = new Date(day.activity_date).toLocaleDateString();
        
        const { data: activities, error } = await window.supabaseClient
            .from('activities')
            .select('*')
            .eq('day_id', day.day_id);
        
        if (error) throw error;
        
        // Add random health metrics if missing
        activities.forEach(activity => {
            if (!activity.health_metrics) {
                activity.health_metrics = {
                    avg_heart_rate: Math.floor(Math.random() * 40) + 60,
                    stress_level: Math.round(Math.random() * 10 * 10) / 10,
                    energy_level: Math.round(Math.random() * 10 * 10) / 10,
                    hydration_level: Math.round(Math.random() * 10 * 10) / 10,
                    sleep_quality: Math.round(Math.random() * 10 * 10) / 10
                };
            }
        });
        
        const activitiesContainer = document.getElementById('activities-container');
        activitiesContainer.innerHTML = '';
        
        activities.forEach(activity => {
            const activityCard = document.createElement('div');
            activityCard.className = 'activity-card';
            activityCard.innerHTML = `
                <h3>${activity.activity_name}</h3>
                <p>Time: ${activity.start_time}</p>
                <p>Productivity: ${activity.productivity_score}/10</p>
                <p>Satisfaction: ${activity.satisfaction_score}/10</p>
            `;
            activityCard.onclick = () => showActivityDetails(activity);
            activitiesContainer.appendChild(activityCard);
        });
        
        showView('activities-view');
    } catch (error) {
        console.error('Error loading activities:', error);
        showStatus('Error loading activities: ' + error.message, 'error');
    }
}

function showActivityDetails(activity) {
    const detailsDiv = document.getElementById('activity-details');
    detailsDiv.innerHTML = `
        <h4>${activity.activity_name}</h4>
        <p><strong>Time:</strong> ${activity.start_time}</p>
        ${activity.health_metrics ? `
        <p><strong>Health Metrics:</strong></p>
        <ul>
            <li>❤️ Heart Rate: ${activity.health_metrics.avg_heart_rate || 'N/A'} bpm</li>
            <li>😰 Stress Level: ${activity.health_metrics.stress_level || 'N/A'}/10</li>
            <li>⚡ Energy Level: ${activity.health_metrics.energy_level || 'N/A'}/10</li>
            <li>💧 Hydration Level: ${activity.health_metrics.hydration_level || 'N/A'}/10</li>
            <li>😴 Sleep Quality: ${activity.health_metrics.sleep_quality || 'N/A'}/10</li>
        </ul>
        ` : '<p><em>No health metrics available for this activity</em></p>'}
    `;
    
    document.getElementById('activity-modal').classList.remove('hidden');
}

function closeActivityModal() {
    document.getElementById('activity-modal').classList.add('hidden');
}

// Pattern Analysis Functions
async function analyzeSequentialPatterns(activities, patternLength) {
    if (activities.length < patternLength) return [];
    
    // Sort activities by time
    const sortedActivities = activities.sort((a, b) => {
        return a.start_time.localeCompare(b.start_time);
    });
    
    const patternData = {};
    
    // Build patterns
    for (let i = 0; i <= sortedActivities.length - patternLength; i++) {
        const pattern = [];
        let totalProductivity = 0;
        let totalSatisfaction = 0;
        let healthMetricsSum = {
            heart_rate: 0,
            stress_level: 0,
            energy_level: 0,
            hydration_level: 0,
            sleep_quality: 0
        };
        let healthCount = 0;
        
        for (let j = 0; j < patternLength; j++) {
            const activity = sortedActivities[i + j];
            pattern.push(activity.activity_name);
            totalProductivity += activity.productivity_score || 0;
            totalSatisfaction += activity.satisfaction_score || 0;
            
            if (activity.health_metrics) {
                healthMetricsSum.heart_rate += activity.health_metrics.avg_heart_rate || 0;
                healthMetricsSum.stress_level += activity.health_metrics.stress_level || 0;
                healthMetricsSum.energy_level += activity.health_metrics.energy_level || 0;
                healthMetricsSum.hydration_level += activity.health_metrics.hydration_level || 0;
                healthMetricsSum.sleep_quality += activity.health_metrics.sleep_quality || 0;
                healthCount++;
            }
        }
        
        const patternKey = pattern.join(' → ');
        
        if (!patternData[patternKey]) {
            patternData[patternKey] = {
                occurrences: [],
                totalProductivity: 0,
                totalSatisfaction: 0,
                healthMetricsSum: { ...healthMetricsSum },
                healthCount: 0
            };
        }
        
        patternData[patternKey].occurrences.push({
            activities: pattern,
            date: sortedActivities[i].day_id
        });
        
        patternData[patternKey].totalProductivity += totalProductivity / patternLength;
        patternData[patternKey].totalSatisfaction += totalSatisfaction / patternLength;
        
        if (healthCount > 0) {
            Object.keys(healthMetricsSum).forEach(key => {
                patternData[patternKey].healthMetricsSum[key] += healthMetricsSum[key] / healthCount;
            });
            patternData[patternKey].healthCount += healthCount;
        }
    }
    
    // Convert to pattern objects
    const patterns = [];
    Object.entries(patternData).forEach(([pattern, data]) => {
        if (data.occurrences.length >= 2) { // Filter for frequency >= 2
            const avgProductivity = Math.round((data.totalProductivity / data.occurrences.length) * 10) / 10;
            const avgSatisfaction = Math.round((data.totalSatisfaction / data.occurrences.length) * 10) / 10;
            
            const avgHealthMetrics = {
                heart_rate: data.healthCount > 0 ? Math.round(data.healthMetricsSum.heart_rate / data.healthCount) : 0,
                stress_level: data.healthCount > 0 ? Math.round((data.healthMetricsSum.stress_level / data.healthCount) * 10) / 10 : 0,
                energy_level: data.healthCount > 0 ? Math.round((data.healthMetricsSum.energy_level / data.healthCount) * 10) / 10 : 0,
                hydration_level: data.healthCount > 0 ? Math.round((data.healthMetricsSum.hydration_level / data.healthCount) * 10) / 10 : 0,
                sleep_quality: data.healthCount > 0 ? Math.round((data.healthMetricsSum.sleep_quality / data.healthCount) * 10) / 10 : 0
            };
            
            const healthBenefitsScore = calculateHealthBenefitsScore(avgHealthMetrics);
            
            patterns.push({
                pattern_id: `seq_${pattern.replace(/\s+→\s+/g, '_').toLowerCase()}`,
                pattern_name: pattern,
                pattern_type: 'sequential',
                avg_productivity: avgProductivity,
                avg_satisfaction: avgSatisfaction,
                avg_health_metrics: avgHealthMetrics,
                health_benefits_score: healthBenefitsScore,
                health_benefits_description: getHealthBenefitsDescription(healthBenefitsScore),
                frequency: data.occurrences.length,
                occurrences: data.occurrences
            });
        }
    });
    
    return patterns.sort((a, b) => b.frequency - a.frequency);
}

function analyzeTimePatterns(activities) {
    const timeGroups = {
        'Early Morning': [],
        'Morning': [],
        'Afternoon': [],
        'Evening': [],
        'Night': []
    };
    
    activities.forEach(activity => {
        const hour = parseInt(activity.start_time.split(':')[0]);
        let timeOfDay;
        
        if (hour >= 5 && hour < 8) timeOfDay = 'Early Morning';
        else if (hour >= 8 && hour < 12) timeOfDay = 'Morning';
        else if (hour >= 12 && hour < 17) timeOfDay = 'Afternoon';
        else if (hour >= 17 && hour < 21) timeOfDay = 'Evening';
        else timeOfDay = 'Night';
        
        timeGroups[timeOfDay].push(activity);
    });
    
    const patterns = [];
    
    Object.entries(timeGroups).forEach(([timeOfDay, activityList]) => {
        if (activityList.length >= 5) {
            const avgProductivity = Math.round((activityList.reduce((sum, a) => sum + (a.productivity_score || 0), 0) / activityList.length) * 10) / 10;
            const avgSatisfaction = Math.round((activityList.reduce((sum, a) => sum + (a.satisfaction_score || 0), 0) / activityList.length) * 10) / 10;
            
            // Calculate median health metrics
            const healthMetricsArray = activityList.filter(a => a.health_metrics).map(a => a.health_metrics);
            const avgHealthMetrics = {
                heart_rate: healthMetricsArray.length > 0 ? Math.round(calculateMedian(healthMetricsArray.map(h => h.avg_heart_rate || 0))) : 0,
                stress_level: healthMetricsArray.length > 0 ? Math.round(calculateMedian(healthMetricsArray.map(h => h.stress_level || 0)) * 10) / 10 : 0,
                energy_level: healthMetricsArray.length > 0 ? Math.round(calculateMedian(healthMetricsArray.map(h => h.energy_level || 0)) * 10) / 10 : 0,
                hydration_level: healthMetricsArray.length > 0 ? Math.round(calculateMedian(healthMetricsArray.map(h => h.hydration_level || 0)) * 10) / 10 : 0,
                sleep_quality: healthMetricsArray.length > 0 ? Math.round(calculateMedian(healthMetricsArray.map(h => h.sleep_quality || 0)) * 10) / 10 : 0
            };
            
            const healthBenefitsScore = calculateHealthBenefitsScore(avgHealthMetrics);
            
            patterns.push({
                pattern_id: `time_${timeOfDay.toLowerCase().replace(' ', '_')}`,
                pattern_name: `${timeOfDay} Routine`,
                pattern_type: 'time_based',
                avg_productivity: avgProductivity,
                avg_satisfaction: avgSatisfaction,
                avg_health_metrics: avgHealthMetrics,
                health_benefits_score: healthBenefitsScore,
                health_benefits_description: getHealthBenefitsDescription(healthBenefitsScore),
                frequency: activityList.length,
                occurrences: activityList.map(a => ({ activities: [a.activity_name], date: a.day_id }))
            });
        }
    });
    
    return patterns;
}

function analyzeHealthPatterns(activities) {
    const activitiesWithHealth = activities.filter(a => a.health_metrics);
    if (activitiesWithHealth.length === 0) return [];
    
    const patterns = [];
    
    // High stress activities
    const highStressActivities = activitiesWithHealth.filter(a => a.health_metrics.stress_level >= 7);
    if (highStressActivities.length >= 3) {
        const avgProductivity = Math.round((highStressActivities.reduce((sum, a) => sum + (a.productivity_score || 0), 0) / highStressActivities.length) * 10) / 10;
        const avgSatisfaction = Math.round((highStressActivities.reduce((sum, a) => sum + (a.satisfaction_score || 0), 0) / highStressActivities.length) * 10) / 10;
        
        const avgHealthMetrics = {
            heart_rate: Math.round(calculateMedian(highStressActivities.map(a => a.health_metrics.avg_heart_rate || 0))),
            stress_level: Math.round(calculateMedian(highStressActivities.map(a => a.health_metrics.stress_level || 0)) * 10) / 10,
            energy_level: Math.round(calculateMedian(highStressActivities.map(a => a.health_metrics.energy_level || 0)) * 10) / 10,
            hydration_level: Math.round(calculateMedian(highStressActivities.map(a => a.health_metrics.hydration_level || 0)) * 10) / 10,
            sleep_quality: Math.round(calculateMedian(highStressActivities.map(a => a.health_metrics.sleep_quality || 0)) * 10) / 10
        };
        
        const healthBenefitsScore = calculateHealthBenefitsScore(avgHealthMetrics);
        
        patterns.push({
            pattern_id: 'health_high_stress',
            pattern_name: 'High Stress Activities',
            pattern_type: 'health_based',
            avg_productivity: avgProductivity,
            avg_satisfaction: avgSatisfaction,
            avg_health_metrics: avgHealthMetrics,
            health_benefits_score: healthBenefitsScore,
            health_benefits_description: getHealthBenefitsDescription(healthBenefitsScore),
            frequency: highStressActivities.length,
            occurrences: highStressActivities.map(a => ({ activities: [a.activity_name], date: a.day_id }))
        });
    }
    
    // High energy activities
    const highEnergyActivities = activitiesWithHealth.filter(a => a.health_metrics.energy_level >= 8);
    if (highEnergyActivities.length >= 3) {
        const avgProductivity = Math.round((highEnergyActivities.reduce((sum, a) => sum + (a.productivity_score || 0), 0) / highEnergyActivities.length) * 10) / 10;
        const avgSatisfaction = Math.round((highEnergyActivities.reduce((sum, a) => sum + (a.satisfaction_score || 0), 0) / highEnergyActivities.length) * 10) / 10;
        
        const avgHealthMetrics = {
            heart_rate: Math.round(calculateMedian(highEnergyActivities.map(a => a.health_metrics.avg_heart_rate || 0))),
            stress_level: Math.round(calculateMedian(highEnergyActivities.map(a => a.health_metrics.stress_level || 0)) * 10) / 10,
            energy_level: Math.round(calculateMedian(highEnergyActivities.map(a => a.health_metrics.energy_level || 0)) * 10) / 10,
            hydration_level: Math.round(calculateMedian(highEnergyActivities.map(a => a.health_metrics.hydration_level || 0)) * 10) / 10,
            sleep_quality: Math.round(calculateMedian(highEnergyActivities.map(a => a.health_metrics.sleep_quality || 0)) * 10) / 10
        };
        
        const healthBenefitsScore = calculateHealthBenefitsScore(avgHealthMetrics);
        
        patterns.push({
            pattern_id: 'health_high_energy',
            pattern_name: 'High Energy Activities',
            pattern_type: 'health_based',
            avg_productivity: avgProductivity,
            avg_satisfaction: avgSatisfaction,
            avg_health_metrics: avgHealthMetrics,
            health_benefits_score: healthBenefitsScore,
            health_benefits_description: getHealthBenefitsDescription(healthBenefitsScore),
            frequency: highEnergyActivities.length,
            occurrences: highEnergyActivities.map(a => ({ activities: [a.activity_name], date: a.day_id }))
        });
    }
    
    return patterns;
}

async function analyzePatternsByLength(activities, patternLength) {
    const patterns = [];
    
    if (patternLength === 1) {
        // Frequency analysis for single activities
        const activityCounts = {};
        activities.forEach(activity => {
            activityCounts[activity.activity_name] = (activityCounts[activity.activity_name] || 0) + 1;
        });
        
        Object.entries(activityCounts).forEach(([activityName, count]) => {
            if (count >= 2) {
                const activityInstances = activities.filter(a => a.activity_name === activityName);
                const avgProductivity = Math.round((activityInstances.reduce((sum, a) => sum + (a.productivity_score || 0), 0) / activityInstances.length) * 10) / 10;
                const avgSatisfaction = Math.round((activityInstances.reduce((sum, a) => sum + (a.satisfaction_score || 0), 0) / activityInstances.length) * 10) / 10;
                
                const healthMetricsArray = activityInstances.filter(a => a.health_metrics).map(a => a.health_metrics);
                const avgHealthMetrics = {
                    heart_rate: healthMetricsArray.length > 0 ? Math.round(calculateMedian(healthMetricsArray.map(h => h.avg_heart_rate || 0))) : 0,
                    stress_level: healthMetricsArray.length > 0 ? Math.round(calculateMedian(healthMetricsArray.map(h => h.stress_level || 0)) * 10) / 10 : 0,
                    energy_level: healthMetricsArray.length > 0 ? Math.round(calculateMedian(healthMetricsArray.map(h => h.energy_level || 0)) * 10) / 10 : 0,
                    hydration_level: healthMetricsArray.length > 0 ? Math.round(calculateMedian(healthMetricsArray.map(h => h.hydration_level || 0)) * 10) / 10 : 0,
                    sleep_quality: healthMetricsArray.length > 0 ? Math.round(calculateMedian(healthMetricsArray.map(h => h.sleep_quality || 0)) * 10) / 10 : 0
                };
                
                const healthBenefitsScore = calculateHealthBenefitsScore(avgHealthMetrics);
                
                patterns.push({
                    pattern_id: `freq_${activityName.toLowerCase().replace(/\s+/g, '_')}`,
                    pattern_name: activityName,
                    pattern_type: 'frequency',
                    avg_productivity: avgProductivity,
                    avg_satisfaction: avgSatisfaction,
                    avg_health_metrics: avgHealthMetrics,
                    health_benefits_score: healthBenefitsScore,
                    health_benefits_description: getHealthBenefitsDescription(healthBenefitsScore),
                    frequency: count,
                    occurrences: activityInstances.map(a => ({ activities: [a.activity_name], date: a.day_id }))
                });
            }
        });
    } else {
        // Sequential patterns for length 2-4
        const sequentialPatterns = await analyzeSequentialPatterns(activities, patternLength);
        patterns.push(...sequentialPatterns);
    }
    
    // Always include time and health patterns
    const timePatterns = analyzeTimePatterns(activities);
    const healthPatterns = analyzeHealthPatterns(activities);
    
    patterns.push(...timePatterns);
    patterns.push(...healthPatterns);
    
    return patterns.sort((a, b) => b.frequency - a.frequency);
}

async function loadPatternsForUser() {
    try {
        showStatus('🔄 Loading activities and analyzing patterns...', 'info');
        
        // Get all days for the user
        const { data: days, error: daysError } = await window.supabaseClient
            .from('days')
            .select('*')
            .eq('user_id', AppState.currentUser.user_id);
        
        if (daysError) throw daysError;
        
        if (!days || days.length === 0) {
            showStatus('No activity days found for this user', 'warning');
            return;
        }
        
        // Get all activities for all days
        const dayIds = days.map(d => d.day_id);
        const { data: activities, error: activitiesError } = await window.supabaseClient
            .from('activities')
            .select('*')
            .in('day_id', dayIds);
        
        if (activitiesError) throw activitiesError;
        
        if (!activities || activities.length === 0) {
            showStatus('No activities found for this user', 'warning');
            return;
        }
        
        // Add random health metrics if missing
        activities.forEach(activity => {
            if (!activity.health_metrics) {
                activity.health_metrics = {
                    avg_heart_rate: Math.floor(Math.random() * 40) + 60,
                    stress_level: Math.round(Math.random() * 10 * 10) / 10,
                    energy_level: Math.round(Math.random() * 10 * 10) / 10,
                    hydration_level: Math.round(Math.random() * 10 * 10) / 10,
                    sleep_quality: Math.round(Math.random() * 10 * 10) / 10
                };
            }
        });
        
        // Analyze patterns
        const analyzedPatterns = await analyzePatternsByLength(activities || [], AppState.currentPatternLength);
        AppState.currentPatterns = analyzedPatterns;
        
        showView('pattern-diagnostics-view');
        
        if (AppState.patternView === 'log') {
            displayPatternLog();
        } else {
            displayPatternResults();
        }
        
        showStatus(`✅ Found ${analyzedPatterns.length} patterns`, 'success');
    } catch (error) {
        console.error('Error loading patterns:', error);
        showStatus('Error loading patterns: ' + error.message, 'error');
    }
}

function displayPatternLog() {
    const patternLogList = document.getElementById('pattern-log-list');
    patternLogList.innerHTML = '';

    // Add visualization container
    const vizContainer = document.getElementById('pattern-visualization');
    if (!vizContainer) {
        const vizDiv = document.createElement('div');
        vizDiv.id = 'pattern-visualization';
        vizDiv.className = 'pattern-visualization';
        document.querySelector('#pattern-diagnostics-view').appendChild(vizDiv);
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
    document.getElementById('pattern-visualization').innerHTML = 
        '<div class="pattern-chart">' +
        '<h3>📊 Pattern ' + AppState.currentPatternLength + ' - Top ' + Math.min(10, filteredPatterns.length) + ' Patterns</h3>' +
        '<div class="chart-container">' +
        filteredPatterns.slice(0, 10).map((pattern, index) => 
            '<div class="pattern-bar" style="width: ' + ((pattern.frequency / filteredPatterns[0].frequency) * 100) + '%">' +
            '<div class="pattern-info">' +
            '<span class="pattern-name">' + pattern.pattern_name.replace(/_/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase()) + '</span>' +
            '<span class="pattern-count">' + pattern.frequency + ' times</span>' +
            '<span class="pattern-health">🏥 ' + pattern.health_benefits_score + '/100</span>' +
            '</div></div>'
        ).join('') +
        '</div></div>';
    
    // Add filter button
    const header = document.querySelector('#pattern-diagnostics-view h2');
    if (header && !document.getElementById('filter-patterns-btn')) {
        const filterBtn = document.createElement('button');
        filterBtn.id = 'filter-patterns-btn';
        filterBtn.className = 'secondary-btn';
        filterBtn.textContent = '🔍 Filter by Activity';
        filterBtn.onclick = function() {
            // Get all unique activities from current patterns
            const allActivities = [...new Set(AppState.currentPatterns.flatMap(p => p.occurrences.flatMap(o => o.activities)))].sort();
            
            if (allActivities.length === 0) {
                alert('No activities available to filter');
                return;
            }
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'pattern-filter-modal';
            modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;';
            
            modal.innerHTML = 
                '<div style="background: white; padding: 20px; border-radius: 8px; max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">' +
                '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">' +
                '<h3>🔍 Filter Patterns by Activity</h3>' +
                '<button onclick="this.closest(\'.modal\').remove()" style="background: none; border: none; font-size: 20px; cursor: pointer;">×</button>' +
                '</div>' +
                '<div style="margin-bottom: 20px;">' +
                '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Select Activities:</label>' +
                '<select id="activity-filter" multiple style="width: 100%; height: 150px; padding: 10px; border: 1px solid #ccc; border-radius: 4px;">' +
                allActivities.map(a => '<option value="' + a + '">' + a + '</option>').join('') +
                '</select>' +
                '<small style="display: block; margin-top: 5px; color: #666;">Hold Ctrl/Cmd to select multiple activities</small>' +
                '</div>' +
                '<div style="margin-bottom: 20px;">' +
                '<label style="display: block; margin-bottom: 10px; font-weight: bold;">Filter Type:</label>' +
                '<div style="display: flex; flex-direction: column; gap: 10px;">' +
                '<label style="display: flex; align-items: center; cursor: pointer;">' +
                '<input type="radio" name="filter-type" value="exclusive" checked style="margin-right: 8px;">' +
                '<span>Exclusive (Only selected activities, no others)</span>' +
                '</label>' +
                '<label style="display: flex; align-items: center; cursor: pointer;">' +
                '<input type="radio" name="filter-type" value="exclusive-plus" style="margin-right: 8px;">' +
                '<span>Exclusive Plus (Selected activities + others allowed)</span>' +
                '</label>' +
                '<label style="display: flex; align-items: center; cursor: pointer;">' +
                '<input type="radio" name="filter-type" value="non-exclusive" style="margin-right: 8px;">' +
                '<span>Non-Exclusive (Any selected activity)</span>' +
                '</label>' +
                '</div>' +
                '</div>' +
                '<div style="display: flex; gap: 10px; justify-content: flex-end;">' +
                '<button onclick="this.closest(\'.modal\').remove()" style="padding: 10px 20px; border: 1px solid #ccc; background: #f5f5f5; border-radius: 4px; cursor: pointer;">Cancel</button>' +
                '<button onclick="applyActivityFilter()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Apply Filter</button>' +
                '</div>' +
                '</div>';
            
            document.body.appendChild(modal);
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
                    <div class="metric-item">❤️ ${pattern.avg_health_metrics.heart_rate}</div>
                    <div class="metric-item">😰 ${pattern.avg_health_metrics.stress_level}/10 Stress</div>
                    <div class="metric-item">⚡ ${pattern.avg_health_metrics.energy_level}/10 Energy</div>
                    <div class="metric-item">💧 ${pattern.avg_health_metrics.hydration_level}/10 Hydration</div>
                    <div class="metric-item">😴 ${pattern.avg_health_metrics.sleep_quality}/10 Sleep</div>
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

function displayPatternResults() {
    const totalPatterns = document.getElementById('total-patterns');
    const mostActivePattern = document.getElementById('most-active-pattern');
    const peakTime = document.getElementById('peak-time');
    
    totalPatterns.textContent = AppState.currentPatterns.length;
    
    if (AppState.currentPatterns.length > 0) {
        mostActivePattern.textContent = AppState.currentPatterns[0].pattern_name;
        
        const timePatterns = AppState.currentPatterns.filter(p => p.pattern_type === 'time_based');
        if (timePatterns.length > 0) {
            peakTime.textContent = timePatterns[0].pattern_name.replace(' Routine', '');
        } else {
            peakTime.textContent = 'N/A';
        }
    } else {
        mostActivePattern.textContent = '-';
        peakTime.textContent = '-';
    }
}

function showPatternDetails(patternId) {
    const pattern = AppState.currentPatterns.find(p => p.pattern_id === patternId);
    if (!pattern) return;
    
    const details = `
        <h4>${pattern.pattern_name}</h4>
        <p><strong>Type:</strong> ${pattern.pattern_type}</p>
        <p><strong>Frequency:</strong> ${pattern.frequency} occurrences</p>
        <p><strong>Average Productivity:</strong> ${pattern.avg_productivity}/10</p>
        <p><strong>Average Satisfaction:</strong> ${pattern.avg_satisfaction}/10</p>
        <p><strong>Health Benefits Score:</strong> ${pattern.health_benefits_score}/100</p>
        <p><strong>Health Benefits:</strong> ${pattern.health_benefits_description}</p>
        <p><strong>Health Metrics:</strong></p>
        <ul>
            <li>Heart Rate: ${pattern.avg_health_metrics.heart_rate}</li>
            <li>Stress Level: ${pattern.avg_health_metrics.stress_level}/10</li>
            <li>Energy Level: ${pattern.avg_health_metrics.energy_level}/10</li>
            <li>Hydration Level: ${pattern.avg_health_metrics.hydration_level}/10</li>
            <li>Sleep Quality: ${pattern.avg_health_metrics.sleep_quality}/10</li>
        </ul>
    `;
    
    document.getElementById('activity-details').innerHTML = details;
    document.getElementById('activity-modal').classList.remove('hidden');
}

// Event Listeners
function setupEventListeners() {
    // Navigation buttons
    const selectUserBtn = document.getElementById('select-user-btn');
    if (selectUserBtn) selectUserBtn.addEventListener('click', loadUsers);
    
    const createUserBtn = document.getElementById('create-user-btn');
    if (createUserBtn) createUserBtn.addEventListener('click', () => showView('create-user-view'));
    
    const backToHome = document.getElementById('back-to-home');
    if (backToHome) backToHome.addEventListener('click', () => showView('home-view'));
    
    const backToSelection = document.getElementById('back-to-selection');
    if (backToSelection) backToSelection.addEventListener('click', () => loadUsers());
    
    const backToDaysFromActivity = document.getElementById('back-to-days-from-activity');
    if (backToDaysFromActivity) backToDaysFromActivity.addEventListener('click', () => loadDaysForUser(AppState.currentUser.user_id));
    
    const backToDays = document.getElementById('back-to-days');
    if (backToDays) backToDays.addEventListener('click', () => loadDaysForUser(AppState.currentUser.user_id));
    
    // User creation form
    const createUserForm = document.getElementById('create-user-form');
    if (createUserForm) {
        createUserForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const username = document.getElementById('new-username').value;
            const email = document.getElementById('new-email').value;
            createUser(username, email);
        });
    }
    
    const cancelCreation = document.getElementById('cancel-creation');
    if (cancelCreation) cancelCreation.addEventListener('click', () => showView('home-view'));
    
    // Add activity form
    const addActivityForm = document.getElementById('add-activity-form');
    if (addActivityForm) {
        addActivityForm.addEventListener('submit', handleAddActivity);
    }
    
    // Pattern view buttons
    const patternLogBtn = document.getElementById('pattern-log-btn');
    if (patternLogBtn) {
        patternLogBtn.addEventListener('click', () => {
            AppState.patternView = 'log';
            const patternLogView = document.getElementById('pattern-log-view');
            if (patternLogView) patternLogView.classList.remove('hidden');
            const patternResultsView = document.getElementById('pattern-results-view');
            if (patternResultsView) patternResultsView.classList.add('hidden');
            displayPatternLog();
        });
    }
    
    const patternResultsBtn = document.getElementById('pattern-results-btn');
    if (patternResultsBtn) {
        patternResultsBtn.addEventListener('click', () => {
            AppState.patternView = 'results';
            const patternLogView = document.getElementById('pattern-log-view');
            if (patternLogView) patternLogView.classList.add('hidden');
            const patternResultsView = document.getElementById('pattern-results-view');
            if (patternResultsView) patternResultsView.classList.remove('hidden');
            displayPatternResults();
        });
    }
    
    // Pattern length buttons
    const pattern1Btn = document.getElementById('pattern-1-btn');
    if (pattern1Btn) {
        pattern1Btn.addEventListener('click', () => {
            AppState.currentPatternLength = 1;
            updatePatternLengthButtons();
            loadPatternsForUser();
        });
    }
    
    const pattern2Btn = document.getElementById('pattern-2-btn');
    if (pattern2Btn) {
        pattern2Btn.addEventListener('click', () => {
            AppState.currentPatternLength = 2;
            updatePatternLengthButtons();
            loadPatternsForUser();
        });
    }
    
    const pattern3Btn = document.getElementById('pattern-3-btn');
    if (pattern3Btn) {
        pattern3Btn.addEventListener('click', () => {
            AppState.currentPatternLength = 3;
            updatePatternLengthButtons();
            loadPatternsForUser();
        });
    }
    
    const pattern4Btn = document.getElementById('pattern-4-btn');
    if (pattern4Btn) {
        pattern4Btn.addEventListener('click', () => {
            AppState.currentPatternLength = 4;
            updatePatternLengthButtons();
            loadPatternsForUser();
        });
    }
    
    // Export data button
    const exportDataBtn = document.getElementById('export-data-btn');
    if (exportDataBtn) exportDataBtn.addEventListener('click', exportPatternData);
    
    // Add Activity button
    const addActivityBtn = document.getElementById('add-activity-btn');
    if (addActivityBtn) addActivityBtn.addEventListener('click', showAddActivityModal);
}

function updatePatternLengthButtons() {
    document.querySelectorAll('.pattern-length-btn').forEach(btn => {
        btn.classList.remove('primary-btn');
        btn.classList.add('secondary-btn');
    });
    
    const activeBtn = document.getElementById(`pattern-${AppState.currentPatternLength}-btn`);
    if (activeBtn) {
        activeBtn.classList.remove('secondary-btn');
        activeBtn.classList.add('primary-btn');
    }
}

function exportPatternData() {
    const dataStr = JSON.stringify(AppState.currentPatterns, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `patterns_${AppState.currentUser.username}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    showStatus('Pattern data exported successfully', 'success');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    showView('home-view');
    showStatus('👋 Welcome to UpEye! Select a user or create a new one to get started.', 'info');
});


function showAddActivityModal() {
    const modal = document.getElementById('add-activity-modal');
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeAddActivityModal() {
    const modal = document.getElementById('add-activity-modal');
    if (modal) {
        modal.classList.add('hidden');
        document.getElementById('add-activity-form').reset();
    }
}

async function handleAddActivity(e) {
    e.preventDefault();
    
    try {
        const activityData = {
            day_id: AppState.selectedDate.day_id,
            activity_name: document.getElementById('activity-name').value,
            start_time: document.getElementById('activity-time').value,
            productivity_score: parseInt(document.getElementById('activity-productivity').value),
            satisfaction_score: parseInt(document.getElementById('activity-satisfaction').value),
            health_metrics: {
                avg_heart_rate: parseInt(document.getElementById('activity-heart-rate').value) || Math.floor(Math.random() * 40) + 60,
                stress_level: parseFloat(document.getElementById('activity-stress').value) || Math.round(Math.random() * 10 * 10) / 10,
                energy_level: parseFloat(document.getElementById('activity-energy').value) || Math.round(Math.random() * 10 * 10) / 10,
                hydration_level: parseFloat(document.getElementById('activity-hydration').value) || Math.round(Math.random() * 10 * 10) / 10,
                sleep_quality: parseFloat(document.getElementById('activity-sleep').value) || Math.round(Math.random() * 10 * 10) / 10
            }
        };
        
        const { data, error } = await window.supabaseClient
            .from('activities')
            .insert([activityData])
            .select();
        
        if (error) throw error;
        
        showStatus('Activity added successfully!', 'success');
        closeAddActivityModal();
        
        // Reload activities for the current day
        await loadActivitiesForDay(AppState.selectedDate);
        
    } catch (error) {
        console.error('Error adding activity:', error);
        showStatus('Error adding activity: ' + error.message, 'error');
    }
}

// Add event listener for the form (moved to main setup)
// This is now handled in setupEventListeners()


// Apply Activity Filter Function
function applyActivityFilter() {
    const select = document.getElementById('activity-filter');
    const selected = Array.from(select.selectedOptions).map(o => o.value);
    const filterType = document.querySelector('input[name="filter-type"]:checked').value;
    
    if (selected.length === 0) {
        alert('Please select at least one activity');
        return;
    }
    
    // Filter patterns based on filter type
    let filtered;
    if (filterType === 'exclusive') {
        // Exclusive: ONLY selected activities must be present (no others)
        filtered = AppState.currentPatterns.filter(p => 
            p.occurrences.some(o => 
                selected.every(a => o.activities.includes(a)) && 
                o.activities.length === selected.length
            )
        );
    } else if (filterType === 'exclusive-plus') {
        // Exclusive Plus: ALL selected activities must be present, but others allowed
        filtered = AppState.currentPatterns.filter(p => 
            p.occurrences.some(o => selected.every(a => o.activities.includes(a)))
        );
    } else {
        // Non-exclusive: ANY selected activity can be present
        filtered = AppState.currentPatterns.filter(p => 
            p.occurrences.some(o => selected.some(a => o.activities.includes(a)))
        );
    }
    
    // Sort by health benefits
    filtered.sort((a, b) => b.health_benefits_score - a.health_benefits_score);
    
    // Display filtered patterns
    const patternLogList = document.getElementById('pattern-log-list');
    if (filtered.length === 0) {
        patternLogList.innerHTML = '<p style="text-align: center; padding: 20px; color: #666;">No patterns found containing the selected activities.</p>';
    } else {
        // Update visualization chart to show filtered patterns
        const vizContainer = document.getElementById('pattern-visualization');
        if (vizContainer && filtered.length > 0) {
            vizContainer.innerHTML = 
                '<div class="pattern-chart">' +
                '<h3>📊 Filtered Patterns - Top ' + Math.min(10, filtered.length) + ' Results</h3>' +
                '<div class="chart-container">' +
                filtered.slice(0, 10).map((pattern, index) => 
                    '<div class="pattern-bar" style="width: ' + ((pattern.frequency / filtered[0].frequency) * 100) + '%">' +
                    '<div class="pattern-info">' +
                    '<span class="pattern-name">' + pattern.pattern_name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) + '</span>' +
                    '<span class="pattern-count">' + pattern.frequency + ' times</span>' +
                    '<span class="pattern-health">🏥 ' + pattern.health_benefits_score + '/100</span>' +
                    '</div></div>'
                ).join('') +
                '</div></div>';
        }
        
        const patternItems = filtered.map((pattern) => {
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
                    <div class="pattern-activities">
                        ${pattern.occurrences[0].activities.map(a => '<span class="activity-tag">' + a + '</span>').join('')}
                    </div>
                </div>
            `;
        }).join('');
        
        let filterTypeText;
    if (filterType === 'exclusive') {
        filterTypeText = 'Exclusive (Only selected activities)';
    } else if (filterType === 'exclusive-plus') {
        filterTypeText = 'Exclusive Plus (Selected + others)';
    } else {
        filterTypeText = 'Non-Exclusive (Any selected activity)';
    }
        patternLogList.innerHTML = 
            '<div style="background: #f8f9fa; padding: 15px; margin-bottom: 20px; border-radius: 4px; border-left: 4px solid #007bff;">' +
            '<strong>🔍 Filter Applied:</strong> ' + selected.join(', ') + '<br>' +
            '<small>Type: ' + filterTypeText + ' | Found ' + filtered.length + ' pattern(s)</small>' +
            '</div>' +
            patternItems + 
            '<div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;"><button onclick="displayPatternLog()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 4px; cursor: pointer;">Clear Filter</button></div>';
    }
    
    // Close modal
    document.getElementById('pattern-filter-modal').remove();
}

// Make functions globally accessible
window.toggleDemoMode = toggleDemoMode;
window.showPatternDetails = showPatternDetails;
window.closeActivityModal = closeActivityModal;
window.showAddActivityModal = showAddActivityModal;
window.closeAddActivityModal = closeAddActivityModal;
window.handleAddActivity = handleAddActivity;
window.applyActivityFilter = applyActivityFilter;


