import React from 'react';

const OptionPage = ({ onYes, onNo }) => {
    return (
        <div className="option-container">
            <h2>Do you already have an appointment?</h2>
            <div className="option-buttons">
                <button onClick={onYes} className="option-button yes-button">Yes</button>
                <button onClick={onNo} className="option-button no-button">No</button>
            </div>
        </div>
    );
};

export default OptionPage;