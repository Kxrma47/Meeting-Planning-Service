import React, { useEffect } from 'react';
import { Link, useHistory } from 'react-router-dom';
import styles from './FAQ.module.css';

const FAQ = () => {
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
        <div className={styles.faqContainer}>
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
                <h1>FAQ</h1>
            </header>
            <main className={styles.mainContent}>
                <div className={styles.faqItem}>
                  <h3>How can I get assistance for my business?</h3>
                  <p>You can reach out to our dedicated business support team via email at support@business.com or call us at (123) 456-7890. We’re here to help with any queries or issues.</p>
                </div>

                <div className={styles.faqItem}>
                  <h3>How do I secure my business account?</h3>
                  <p>To protect your business account, ensure you use a strong and unique password, enable two-factor authentication, and keep your login credentials confidential.</p>
                </div>

                <div className={styles.faqItem}>
                  <h3>What should I do if I encounter technical issues on the dashboard?</h3>
                  <p>If you experience any technical problems, try refreshing the page or clearing your browser's cache. For persistent issues, contact our support team for assistance.</p>
                </div>

                <div className={styles.faqItem}>
                  <h3>How can I update my business details or profile information?</h3>
                  <p>To update your business details, log in to your account, go to the profile section, and make the necessary updates to your business information.</p>
                </div>

                <div className={styles.faqItem}>
                  <h3>What if I forget my business account password?</h3>
                  <p>If you forget your password, click on the "Forgot Password" link on the login page and follow the instructions to reset it securely.</p>
                </div>

                <div className={styles.faqItem}>
                  <h3>How do I permanently delete my business account?</h3>
                  <p>If you wish to delete your business account, please contact our support team. Note that account deletion is permanent and cannot be undone.</p>
                </div>

                <div className={styles.faqItem}>
                  <h3>Can I view the history of appointments booked with my business?</h3>
                  <p>Yes, you can view all past appointments by navigating to the “Appointment History” section of your dashboard after logging in.</p>
                </div>

                <div className={styles.faqItem}>
                  <h3>How can I provide feedback about the platform or my experience?</h3>
                  <p>We highly appreciate your feedback. You can provide feedback by contacting our support team or by filling out the feedback form available on the platform.</p>
                </div>

            </main>
        </div>
    );
};

export default FAQ;
