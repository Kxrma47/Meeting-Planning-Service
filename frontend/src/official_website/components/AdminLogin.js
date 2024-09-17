import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import './AdminLogin.css';

const AdminLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');
    const history = useHistory();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
           const response = await fetch('/api/admin/login', {
               method: 'POST',
               headers: {
                   'Content-Type': 'application/json',
               },
               credentials: 'include',
               body: JSON.stringify({ username, password })
           });


            if (response.ok) {
                setMessage('Login successful');
                history.push('/admin/dashboard');
            } else {
                const data = await response.json();
                setMessage(data.message || 'Login failed. Please try again.');
            }
        } catch (error) {
            console.error('Error during login:', error);
            setMessage('An error occurred. Please try again.');
        }
    };


    return (
        <div className="admin-login-container">
            <div className="admin-login-box">
                <h2 className="admin-title">Admin</h2>
                {message && <p className="admin-message">{message}</p>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            name="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            name="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>
                    <button type="submit" className="admin-submit-button">Login</button>
                </form>
            </div>
        </div>
    );
};

export default AdminLogin;
