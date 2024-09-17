//This is a custom captch page . I made it but later i decided not to use and use react-simple-captcha

import React, { useState, useEffect } from 'react';
import { LoadCanvasTemplate, loadCaptchaEnginge, validateCaptcha } from 'react-simple-captcha';
import './Captcha.css';

const Captcha = ({ onChange }) => {
    const [captchaInput, setCaptchaInput] = useState('');
    const [isVerified, setIsVerified] = useState(false);

    useEffect(() => {
        loadCaptchaEnginge(6);
    }, []);

    const handleChange = (e) => {
        setCaptchaInput(e.target.value);
    };

    const handleVerify = () => {
        if (validateCaptcha(captchaInput)) {
            setIsVerified(true);
            onChange(true);
        } else {
            setIsVerified(false);
            onChange(false);
            alert('Captcha does not match, please try again.');
        }
    };

    return (
        <div className="captcha-container">
            <h3>Solve the Captcha to Verify</h3>
            <LoadCanvasTemplate />
            <input
                type="text"
                value={captchaInput}
                onChange={handleChange}
                placeholder="Enter Captcha"
                className="captcha-input"
            />
            <button onClick={handleVerify} className="verify-button">Verify</button>
            {isVerified && <p className="captcha-verified">Captcha verified</p>}
        </div>
    );
};

export default Captcha;