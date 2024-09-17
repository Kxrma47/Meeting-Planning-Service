import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.module.css';

const Home = () => {
    return (
        <div className={styles.homePage}>
            <header className={styles.header}>
                <nav className={styles.nav}>
                    <ul className={styles.navList}>
                        <li className={styles.navItem}><Link to="/" className={styles.navLink}>Home</Link></li>
                        <li className={styles.navItem}><Link to="/about" className={styles.navLink}>About Us</Link></li>
                        <li className={styles.navItem}><Link to="/contact" className={styles.navLink}>Contact</Link></li>
                    </ul>
                </nav>
            </header>
            <main className={styles.mainContent}>
                <div className={styles.section}>
                    <section className={styles.introSection}>
                        <h2 className={styles.sectionTitle}>Welcome to MPS</h2>
                        <p className={styles.sectionText}>Efficient business appointment booking service with personal accounts, QR system, and fast reservations.</p>
                    </section>
                </div>
                <div className={styles.section}>
                    <section className={styles.featuresSection}>
                        <h2 className={styles.sectionTitle}>Features</h2>
                        <ul className={styles.featureList}>
                            <li className={styles.featureItem}>Easy scheduling</li>
                            <li className={styles.featureItem}>Automated response</li>
                            <li className={styles.featureItem}>Statistical details</li>
                            <li className={styles.featureItem}>Comprehensive reporting</li>
                            <li className={styles.featureItem}>Personal accounts</li>
                            <li className={styles.featureItem}>QR system for check-ins</li>
                            <li className={styles.featureItem}>Fast reservations</li>
                        </ul>
                    </section>
                </div>
                <div className={styles.section}>
                    <section className={styles.getStartedSection}>
                        <Link to="/register" className={styles.getStartedButton}>Get Started</Link>
                    </section>
                </div>
                <div className={styles.section}>
                    <section className={styles.detailsSection}>
                        <h2 className={styles.sectionTitle}>Why Choose MPS</h2>
                        <p className={styles.sectionText}>Our platform provides a comprehensive suite of tools to help you manage your business appointments efficiently.</p>
                        <ul className={styles.benefitsList}>
                            <li className={styles.benefitItem}><strong>Reliable:</strong> Our platform is robust and reliable, ensuring that you can depend on it for your meeting needs.</li>
                            <li className={styles.benefitItem}><strong>User-Friendly:</strong> Our interface is designed with the user in mind, making it easy to navigate and use.</li>
                            <li className={styles.benefitItem}><strong>Cost-Effective:</strong> We offer competitive and easy ergonomics that provide great value for both business owners and clients.</li>
                        </ul>
                    </section>
                </div>
                <div className={styles.section}>
                    <section className={styles.contactSection}>
                        <h2 className={styles.sectionTitle}>Contact Us</h2>
                        <p className={styles.sectionText}>If you have any questions or need assistance, feel free to reach out to us.</p>
                        <p className={styles.contactInfo}>Email: <a href="mailto:hadi@mps.com" className={styles.contactLink}>support@mps.com</a></p>
                        <p className={styles.contactInfo}>Phone: <a href="tel:+7234567890" className={styles.contactLink}>+1 234 567 890</a></p>
                    </section>
                </div>
            </main>
            <footer className={styles.footer}>
                <p className={styles.footerText}>&copy; 2024 MPS. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Home;
