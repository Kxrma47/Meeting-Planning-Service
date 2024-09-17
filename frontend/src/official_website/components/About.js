import React from 'react';
import { Link } from 'react-router-dom';
import './About.css';

const About = () => {
    return (
        <div className="about-page">
            <header className="header">
                <nav className="nav">
                    <ul>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/about">About Us</Link></li>
                        <li><Link to="/contact">Contact</Link></li>
                    </ul>
                </nav>
            </header>
            <main className="main-content">
                <div className="section">
                    <section className="about-info">
                        <h2>Our Mission</h2>
                        <p>Our mission is to provide an intuitive and efficient meeting planning service to help businesses spread their scheduling processes. By leveraging advanced technologies and user-centric design, we aim to simplify the complex logistics of meeting planning, making it accessible and efficient for all users.</p>
                    </section>
                </div>
                <div className="section">
                    <section className="team">
                        <h2>Our Team</h2>
                        <p>We are a group of dedicated professionals committed to improving how you plan and conduct appointments. Our team consists of seasoned developers, innovative designers, and meticulous project managers form National Research University Higher School of Economics, all of whom share a passion for creating a seamless scheduling experience. Our diverse backgrounds and combined expertise allow us to tackle the unique challenges of meeting planning with creativity and precision.</p>
                        <p>We are proud to have several alumni from the Higher School of Economics (HSE) as part of our core team. Their rigorous training and forward-thinking approach contribute significantly to our ongoing success.</p>
                    </section>
                </div>
                <div className="section">
                    <section className="history">
                        <h2>Our History</h2>
                        <p>Since our founding in 2024, we have been at the forefront of meeting planning technology. Our journey began with a simple goal: to create a tool that could handle the complexities of scheduling in a fast-paced business environment. Over the years, we have expanded our services, incorporating user feedback and technological advancements to develop a comprehensive meeting planning solution.</p>
                        <p>Our first major milestone was the launch of our integrated video conferencing feature, which allowed users to schedule and conduct meetings without needing third-party applications. This innovation set us apart in the industry and paved the way for further developments.</p>
                        <p>In 2024, we also introduced the QR system for check-ins, simplifying the process for both organizers and participants. This feature was particularly well-received in the educational sector, including institutions like HSE, where managing large numbers of attendees efficiently is crucial.</p>
                    </section>
                </div>
            </main>
            <footer className="footer">
                <p>&copy; 2024 Meeting Planning Service. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default About;
