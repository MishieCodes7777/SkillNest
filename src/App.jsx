import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// Pages
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Sessions = lazy(() => import('./pages/Sessions'));
const Messages = lazy(() => import('./pages/Messages'));
const Profile = lazy(() => import('./pages/Profile'));
const AIMentor = lazy(() => import('./pages/AIMentor'));
const AIRoadmap = lazy(() => import('./pages/AIRoadmap'));
const Arena = lazy(() => import('./pages/Arena'));
const Interview = lazy(() => import('./pages/Interview'));
const ResumeReview = lazy(() => import('./pages/ResumeReview'));
const MeetingRoom = lazy(() => import('./pages/MeetingRoom'));
const Achievements = lazy(() => import('./pages/Achievements'));
const Courses = lazy(() => import('./pages/Courses'));

// Mentor pages
const MentorDashboard = lazy(() => import('./pages/mentor/MentorDashboard'));
const MentorCourses = lazy(() => import('./pages/mentor/MentorCourses'));
const MentorStudents = lazy(() => import('./pages/mentor/MentorStudents'));
const MentorSessions = lazy(() => import('./pages/mentor/MentorSessions'));
const MentorCommunity = lazy(() => import('./pages/mentor/MentorCommunity'));
const MentorResources = lazy(() => import('./pages/mentor/MentorResources'));
const MentorEarnings = lazy(() => import('./pages/mentor/MentorEarnings'));
const MentorSettings = lazy(() => import('./pages/mentor/MentorSettings'));

function Loading() {
    return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#8892b0' }}>
            <p>Loading...</p>
        </div>
    );
}

function App() {
    return (
        <Router>
            <Suspense fallback={<Loading />}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/sessions" element={<Sessions />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/ai-mentor" element={<AIMentor />} />
                    <Route path="/ai-roadmap" element={<AIRoadmap />} />
                    <Route path="/arena" element={<Arena />} />
                    <Route path="/interview" element={<Interview />} />
                    <Route path="/resume-review" element={<ResumeReview />} />
                    <Route path="/meeting" element={<MeetingRoom />} />
                    <Route path="/achievements" element={<Achievements />} />
                    <Route path="/courses" element={<Courses />} />

                    {/* Mentor Portal */}
                    <Route path="/mentor/dashboard" element={<MentorDashboard />} />
                    <Route path="/mentor/courses" element={<MentorCourses />} />
                    <Route path="/mentor/students" element={<MentorStudents />} />
                    <Route path="/mentor/sessions" element={<MentorSessions />} />
                    <Route path="/mentor/community" element={<MentorCommunity />} />
                    <Route path="/mentor/resources" element={<MentorResources />} />
                    <Route path="/mentor/earnings" element={<MentorEarnings />} />
                    <Route path="/mentor/settings" element={<MentorSettings />} />
                </Routes>
            </Suspense>
        </Router>
    );
}

export default App;
