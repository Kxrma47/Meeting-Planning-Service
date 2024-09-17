import React from 'react';
import Captcha from '../components/Captcha';

const CaptchaPage = ({ onChange }) => {
    return (
        <div>
            <Captcha onChange={onChange} />
        </div>
    );
};

export default CaptchaPage;
