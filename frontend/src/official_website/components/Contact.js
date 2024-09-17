import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './Contact.css';

const Contact = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        message: ''
    });
    const [responseMessage, setResponseMessage] = useState('');

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        })
        .then(response => response.json())
        .then(data => {
            if (data.error) {
                setResponseMessage(data.error);
            } else {
                setResponseMessage('Message sent successfully!');
                setFormData({ name: '', email: '', message: '' });
            }
        })
        .catch(error => {
            setResponseMessage('Failed to send message.');
            console.error('Error:', error);
        });
    };

    return (
        <div className="contact-page">
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
                    <section className="contact-info">
                        <h2>Get in Touch</h2>
                        <p>We'd love to hear from you! Reach out to us using the information below.</p>
                        <address>
                            <p><strong>Email:</strong> <a href="mailto:info@mps.com">info@mps.com</a></p>
                            <p><strong>Phone:</strong> <a href="tel:1234567890">+7(123) 456-78 90</a></p>
                            <p><strong>Address:</strong> 123 Meeting St, Planning City, PB 12345</p>
                        </address>
                    </section>
                </div>
                <div className="section">
                    <section className="contact-form">
                        <h2>Contact Form</h2>
                        <form onSubmit={handleSubmit}>
                            <label htmlFor="name">Name:</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                pattern="[A-Za-z\s]+"
                                title="Name should only contain letters."
                                required
                            />

                            <label htmlFor="email">Email:</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />

                            <label htmlFor="message">Message:</label>
                            <textarea
                                id="message"
                                name="message"
                                value={formData.message}
                                onChange={handleChange}
                                maxLength="300"
                                placeholder="Max 300 characters"
                                required
                            ></textarea>

                            <button type="submit">Send Message</button>
                        </form>
                        {responseMessage && <p>{responseMessage}</p>}
                    </section>
                </div>
            </main>
            <footer className="footer">
                <p>&copy; 2024 Meeting Planning Service. All rights reserved.</p>
            </footer>
        </div>
    );
};

export default Contact;
