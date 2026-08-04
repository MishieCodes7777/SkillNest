import React from 'react';
import MentorLayout from '../../components/MentorLayout';

export default function MentorResources() {
    return (
        <MentorLayout>
            <h1 style={{ fontSize: 22, marginBottom: 20, paddingLeft: 50 }}>Resources</h1>
            <div className="m-card">
                <h3><span className="material-icons">upload_file</span> Upload Resources</h3>
                <p style={{ color: '#8892b0', fontSize: 14, marginBottom: 15 }}>Share PDFs, slides, code, templates with your students. Cloudinary integration coming soon.</p>
                <button className="m-btn-outline">Upload File (Coming Soon)</button>
            </div>
            <div className="m-card"><p className="m-empty">No resources uploaded yet.</p></div>
        </MentorLayout>
    );
}
