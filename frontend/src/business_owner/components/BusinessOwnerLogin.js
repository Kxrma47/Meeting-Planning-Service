import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import styles from './BusinessOwnerLogin.module.css';

const BusinessOwnerLogin = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const history = useHistory();

    const handleLogin = async (e) => {
        e.preventDefault();

        try {
            const response = await fetch('/api/business_owner/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            if (response.ok) {
                history.push('/business-owner/dashboard');
            } else {
                setError('Invalid username or password');
            }
        } catch (error) {
            console.error('Error during login:', error);
            setError('An error occurred. Please try again.');
        }
    };

    return (
        <div className={styles.businessOwnerLoginContainer}>
            <div className={styles.businessOwnerLoginBox}>
                <h2>Login</h2>
                {error && <p className={styles.businessOwnerError}>{error}</p>}
                <form onSubmit={handleLogin}>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit" className={styles.businessOwnerSubmitButton}>Login</button>
                </form>
            </div>
        </div>
    );
};

export default BusinessOwnerLogin;
