import React, { useEffect, useState } from 'react';
import { Link, useHistory } from 'react-router-dom';
import styles from './Support.module.css';

const Support = () => {
    const [message, setMessage] = useState('');
    const history = useHistory();

    useEffect(() => {
        const checkAuthentication = async () => {
            try {
                const response = await fetch('/api/business_owner/check_auth');
                if (response.status === 401) {
                    history.push('/business-owner/login');
                }
            } catch (error) {
                console.error('Error checking authentication:', error);
                history.push('/business-owner/login');
            }
        };

        checkAuthentication();
    }, [history]);

    const handleLogout = async () => {
        try {
            const response = await fetch('/api/business_owner/logout', { method: 'POST' });
            if (response.ok) {
                history.push('/business-owner/login');
            } else {
                alert('Logout failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during logout:', error);
            alert('An error occurred. Please try again.');
        }
    };

    return (
        <div className={styles.supportContainer}>
            <header className={styles.header}>
                <nav className={styles.nav}>
                    <ul>
                        <li><Link to="/business-owner/dashboard">Dashboard</Link></li>
                        <li><Link to="/business-owner/services">Services</Link></li>
                        <li><Link to="/business-owner/faq">FAQ</Link></li>
                        <li><Link to="/business-owner/support">Support</Link></li>
                    </ul>
                    <button onClick={handleLogout} className={styles.logoutButton}>Logout</button>
                </nav>
                <h1>Support</h1>
            </header>
            <main className={styles.mainContent}>
                <div className={styles.contactInfo}>
                    <h2>Office Contacts</h2>
                    <p><strong>Email:</strong> support@business.com</p>
                    <p><strong>Phone:</strong> (123) 456-7890</p>
                    <p><strong>Address:</strong> 123 Business St, Suite 456, Business City, BC 12345</p>
                </div>
                <div className={styles.supportDetails}>
                    <h2>Technical Support</h2>
                    <p>For any technical issues you may encounter, please contact our support team. We are available 24/7 to assist you with any problems, including:</p>
                    <ul>
                        <li>Account Access Issues</li>
                        <li>Payment and Billing Inquiries</li>
                        <li>Technical Troubleshooting</li>
                        <li>Security Concerns</li>
                        <li>General Questions</li>
                    </ul>
                    <h2>Safety and Security</h2>
                    <p>We prioritize your safety and security. Here are some tips to help you stay secure:</p>
                    <ul>
                        <li>Always use a strong, unique password for your account.</li>
                        <li>Enable two-factor authentication to add an extra layer of security.</li>
                        <li>Be cautious of phishing emails and fraudulent activities.</li>
                        <li>Regularly update your software to the latest version.</li>
                        <li>Contact our support team if you notice any suspicious activity.</li>
                    </ul>
                    <h2>Frequently Encountered Issues</h2>
                    <p>Here are some common issues and their solutions:</p>
                    <ul>
                        <li><strong>Login Problems:</strong> Ensure you are using the correct email and password. If you have forgotten your password, use the "Forgot Password" feature to reset it.</li>
                        <li><strong>Payment Errors:</strong> Double-check your payment details and ensure your card is valid. If the issue persists, contact our support team.</li>
                        <li><strong>Website Errors:</strong> Try clearing your browser cache and cookies. If the problem continues, reach out to our technical support.</li>
                    </ul>
                    <h2>Feedback</h2>
                    <p>We value your feedback and suggestions. If you have any comments or ideas to improve our services, please let us know. Your input helps us to serve you better.</p>
                </div>
            </main>
        </div>
    );
};

export default Support;
