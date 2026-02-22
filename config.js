// Supabase Configuration
// IMPORTANT: Replace these with your actual Supabase project details
const SUPABASE_URL = 'https://bwydpxwphytucmorxtel.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3eWRweHdwaHl0dWNtb3J4dGVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzA0Mzc5NzIsImV4cCI6MjA4NjAxMzk3Mn0.-XAxEXqVPaejdrzDvgwPsQHoxKjzPTduf8dBqXlLWLM';

// Always use real Supabase
const USE_MOCK_DATA = false;

// Mock data for demo mode
const MOCK_DATA = {
    users: [
        { user_id: 'demo-user-1', username: 'Demo User', created_at: new Date().toISOString() }
    ],
    activities: [
        // Generate sample activities with health metrics
        { activity_id: '1', activity_name: 'Walking', day_id: '1', start_time: '08:00', productivity_score: 7, satisfaction_score: 8, health_metrics: { avg_heart_rate: 75, stress_level: 3, energy_level: 6, hydration_level: 7, sleep_quality: 8 } },
        { activity_id: '2', activity_name: 'Work', day_id: '1', start_time: '09:00', productivity_score: 8, satisfaction_score: 7, health_metrics: { avg_heart_rate: 80, stress_level: 4, energy_level: 7, hydration_level: 6, sleep_quality: 7 } },
        { activity_id: '3', activity_name: 'Yoga', day_id: '1', start_time: '17:00', productivity_score: 6, satisfaction_score: 9, health_metrics: { avg_heart_rate: 70, stress_level: 2, energy_level: 8, hydration_level: 8, sleep_quality: 9 } },
        { activity_id: '4', activity_name: 'Reading', day_id: '1', start_time: '19:00', productivity_score: 7, satisfaction_score: 8, health_metrics: { avg_heart_rate: 72, stress_level: 2, energy_level: 6, hydration_level: 7, sleep_quality: 8 } },
        { activity_id: '5', activity_name: 'Meeting', day_id: '1', start_time: '10:00', productivity_score: 8, satisfaction_score: 6, health_metrics: { avg_heart_rate: 78, stress_level: 5, energy_level: 7, hydration_level: 6, sleep_quality: 7 } },
        { activity_id: '6', activity_name: 'Cooking', day_id: '1', start_time: '18:00', productivity_score: 6, satisfaction_score: 7, health_metrics: { avg_heart_rate: 74, stress_level: 3, energy_level: 6, hydration_level: 7, sleep_quality: 8 } },
        { activity_id: '7', activity_name: 'Social Time', day_id: '1', start_time: '20:00', productivity_score: 5, satisfaction_score: 9, health_metrics: { avg_heart_rate: 76, stress_level: 2, energy_level: 8, hydration_level: 7, sleep_quality: 9 } },
        { activity_id: '8', activity_name: 'Gym Workout', day_id: '1', start_time: '16:00', productivity_score: 7, satisfaction_score: 8, health_metrics: { avg_heart_rate: 85, stress_level: 4, energy_level: 9, hydration_level: 8, sleep_quality: 8 } },
        { activity_id: '9', activity_name: 'Meditation', day_id: '1', start_time: '07:00', productivity_score: 6, satisfaction_score: 9, health_metrics: { avg_heart_rate: 68, stress_level: 1, energy_level: 7, hydration_level: 8, sleep_quality: 9 } },
        { activity_id: '10', activity_name: 'Running', day_id: '1', start_time: '06:30', productivity_score: 8, satisfaction_score: 8, health_metrics: { avg_heart_rate: 82, stress_level: 3, energy_level: 8, hydration_level: 7, sleep_quality: 8 } }
    ],
    days: [
        { day_id: '1', user_id: 'demo-user-1', activity_date: '2026-02-20' }
    ]
};

// Initialize Supabase client
let supabaseClient;

// Real Supabase client only
supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Export for use in other files
window.supabaseClient = supabaseClient;
window.USE_MOCK_DATA = USE_MOCK_DATA;
