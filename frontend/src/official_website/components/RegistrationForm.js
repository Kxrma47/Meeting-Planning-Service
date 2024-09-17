import React, { useState ,useEffect} from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import CaptchaPage from "../pages/CaptchaPage";
import styles from "./RegistrationForm.module.css";


const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

const RegistrationForm = () => {
    const defaultTime = new Date();
    defaultTime.setHours(0, 0, 0, 0);

    const [formData, setFormData] = useState({
        personalName: "",
        companyName: "",
        storeAddress: "",
        phoneNumber: "+7",
        email: "",
        numberOfServices: 1,
        services: [{ title: "", cost: "", description: "", service_time: "" }],
    });

    const [workingHours, setWorkingHours] = useState({
        applyToAll: false,
        sameHours: { start: defaultTime, end: defaultTime },
        days: {
            Monday: { selected: false, start: defaultTime, end: defaultTime },
            Tuesday: { selected: false, start: defaultTime, end: defaultTime },
            Wednesday: { selected: false, start: defaultTime, end: defaultTime },
            Thursday: { selected: false, start: defaultTime, end: defaultTime },
            Friday: { selected: false, start: defaultTime, end: defaultTime },
            Saturday: { selected: false, start: defaultTime, end: defaultTime },
            Sunday: { selected: false, start: defaultTime, end: defaultTime },
        },
    });

    const [showOtpForm, setShowOtpForm] = useState(false);
    const [captchaVerified, setCaptchaVerified] = useState(false);
    const [message, setMessage] = useState("");
    const [errors, setErrors] = useState({});
    const [userId, setUserId] = useState(null);
    const [otp, setOtp] = useState("");
    const [showPopup, setShowPopup] = useState(false);


useEffect(() => {
    if (message) {
        setShowPopup(true);
        const timer = setTimeout(() => {
            setShowPopup(false);
        }, 5000);

        return () => {
            clearTimeout(timer);
        };
    }
}, [message]);



    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name.startsWith("service-")) {
            const index = parseInt(name.split("-")[1]);
            const key = name.split("-")[2];
            const updatedServices = formData.services.map((service, i) =>
                i === index ? { ...service, [key]: value } : service
            );
            setFormData({ ...formData, services: updatedServices });
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const handlePhoneNumberChange = (e) => {
        const value = e.target.value;
        if (/^\+7\d{0,10}$/.test(value)) {
            setFormData({ ...formData, phoneNumber: value });
        }
    };

    const handleServicesChange = (e) => {
        const numberOfServices = parseInt(e.target.value);
        const services = Array.from(
            { length: numberOfServices },
            (_, i) =>
                formData.services[i] || {
                    title: "",
                    cost: "",
                    description: "",
                    service_time: "",
                }
        );
        setFormData({ ...formData, numberOfServices, services });
    };

    const validate = () => {
        let valid = true;
        let errors = {};
        let errorMessages = [];

        if (!/^[a-zA-Z\s]+$/.test(formData.personalName)) {
            valid = false;
            errors.personalName = "Personal Name must contain only alphabets and spaces.";
            errorMessages.push("Personal Name must contain only alphabets and spaces.");
        }

        if (!/^\+7\d{10}$/.test(formData.phoneNumber)) {
            valid = false;
            errors.phoneNumber = "Phone Number must start with +7 and contain 10 digits.";
            errorMessages.push("Phone Number must start with +7 and contain 10 digits.");
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            valid = false;
            errors.email = "Email is invalid.";
            errorMessages.push("Email is invalid.");
        }

        if (!formData.companyName) {
            valid = false;
            errors.companyName = "Company Name is required.";
            errorMessages.push("Company Name is required.");
        }

        if (!formData.storeAddress) {
            valid = false;
            errors.storeAddress = "Store Address is required.";
            errorMessages.push("Store Address is required.");
        }

        if (!formData.phoneNumber) {
            valid = false;
            errors.phoneNumber = "Phone Number is required.";
            errorMessages.push("Phone Number is required.");
        }

        if (!formData.email) {
            valid = false;
            errors.email = "Email is required.";
            errorMessages.push("Email is required.");
        }

        formData.services.forEach((service, index) => {
            if (!service.title || service.title.length > 100) {
                valid = false;
                errors[`service-${index}-title`] = "Service title is required and should not exceed 100 characters.";
                errorMessages.push(`Service ${index + 1} title is required and should not exceed 100 characters.`);
            }
            if (!/^\d+$/.test(service.cost)) {
                valid = false;
                errors[`service-${index}-cost`] = "Service cost must be a number.";
                errorMessages.push(`Service ${index + 1} cost must be a number.`);
            }
            if (!service.description || service.description.length > 500) {
                valid = false;
                errors[`service-${index}-description`] = "Service description is required and should not exceed 500 characters.";
                errorMessages.push(`Service ${index + 1} description is required and should not exceed 500 characters.`);
            }
            if (!/^\d+$/.test(service.service_time)) {
                valid = false;
                errors[`service-${index}-service_time`] = "Service time must be a number.";
                errorMessages.push(`Service ${index + 1} time must be a number.`);
            }
        });

        if (!captchaVerified) {
            valid = false;
            errors.captcha = "Captcha verification is required.";
            errorMessages.push("Captcha verification is required.");
        }

        setErrors(errors);

        if (!valid) {
            const formattedMessage = errorMessages.map((msg, index) => (
                <div key={index}>{index + 1}. {msg}<br /></div>
            ));
            setMessage(formattedMessage);
        }

        return valid;
    };




    const handleWorkingHoursChange = (day, start, end) => {
        setWorkingHours((prevHours) => ({
            ...prevHours,
            days: {
                ...prevHours.days,
                [day]: { start, end },
            },
        }));
    };

    const handleApplyToAllChange = (start, end) => {
        setWorkingHours((prevHours) => ({
            ...prevHours,
            sameHours: { start, end },
            days: Object.fromEntries(
                Object.entries(prevHours.days).map(([day, hours]) => [
                    day,
                    { ...hours, start, end },
                ])
            ),
        }));
    };

    const handleDaySelection = (day) => {
        setWorkingHours((prevHours) => ({
            ...prevHours,
            days: {
                ...prevHours.days,
                [day]: {
                    ...prevHours.days[day],
                    selected: !prevHours.days[day].selected,
                },
            },
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) {
            return;
        }

        const formattedWorkingHours = {
            ...workingHours,
            sameHours: {
                start: formatTime(workingHours.sameHours.start),
                end: formatTime(workingHours.sameHours.end),
            },
            days: Object.fromEntries(
                Object.entries(workingHours.days).map(([day, hours]) => [
                    day,
                    {
                        ...hours,
                        start: formatTime(hours.start),
                        end: formatTime(hours.end),
                    },
                ])
            ),
        };

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ ...formData, workingHours: formattedWorkingHours }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage(data.message || "Registration successfully stored! Please enter the OTP sent to your phone to submit the application.");
                setUserId(data.user_id);
                setShowOtpForm(true);
            } else {
                setMessage(data.message || "Registration failed. Please try again.");
            }
        } catch (error) {
            console.error("Error during registration:", error);
            setMessage("An error occurred. Please try again.");
        }
    };

    const handleOtpVerification = async (e) => {
        e.preventDefault();
        try {
            const response = await fetch("/api/verify_otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ user_id: userId, otp }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage("OTP verified successfully");
                handleOtpVerificationSuccess();
            } else {
                setMessage(data.message || "Failed to verify OTP");
            }
        } catch (error) {
            console.error("Error during OTP verification:", error);
            setMessage("An error occurred. Please try again.");
        }
    };

    const handleOtpVerificationSuccess = () => {
        setMessage("Congratulations! Your registration is successful. You will be notified via mail or SMS within 24 hours. THANK YOU.");
        setShowOtpForm(false);

        setTimeout(() => {
            window.location.reload();
        }, 3000);

        setFormData({
            personalName: "",
            companyName: "",
            storeAddress: "",
            phoneNumber: "+7",
            email: "",
            numberOfServices: 1,
            services: [
                { title: "", cost: "", description: "", service_time: "" },
            ],
        });
        setCaptchaVerified(false);
        setErrors({});
        setWorkingHours({
            applyToAll: false,
            sameHours: { start: defaultTime, end: defaultTime },
            days: {
                Monday: { selected: false, start: defaultTime, end: defaultTime },
                Tuesday: { selected: false, start: defaultTime, end: defaultTime },
                Wednesday: { selected: false, start: defaultTime, end: defaultTime },
                Thursday: { selected: false, start: defaultTime, end: defaultTime },
                Friday: { selected: false, start: defaultTime, end: defaultTime },
                Saturday: { selected: false, start: defaultTime, end: defaultTime },
                Sunday: { selected: false, start: defaultTime, end: defaultTime },
            },
        });
    };



    const handleResendOtp = async () => {
        try {
            const response = await fetch("/api/resend_otp", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ user_id: userId }),
            });

            const data = await response.json();
            setMessage(data.message || "Failed to resend OTP");
        } catch (error) {
            console.error("Error during OTP resend:", error);
            setMessage("An error occurred. Please try again.");
        }
    };

    return (
        <div className={styles.registrationContainer}>
        {showPopup && message && (
                    <div className={styles.dimmedBackground}>
                        <div className={styles.successMessagePopup}>
                            {message}
                        </div>
                    </div>
                )}
            <div className={styles.container}>
                {showOtpForm ? (
                    <div className={styles.otpVerificationContainer}>
                        <h2>Verify OTP</h2>
                        <form onSubmit={handleOtpVerification}>
                            <div className={styles.formGroup}>
                                <label htmlFor="otp">OTP</label>
                                <input
                                    type="text"
                                    id="otp"
                                    name="otp"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                />
                                {errors.otp && (
                                    <p className={styles.error}>{errors.otp}</p>
                                )}
                            </div>
                            <button type="submit" className={styles.submitButton}>
                                Verify OTP
                            </button>
                        </form>
                        <button
                            onClick={handleResendOtp}
                            className={styles.resendButton}
                        >
                            Resend OTP
                        </button>
                    </div>
                ) : (
                    <>
                        <h2>Register Your Business</h2>

                        <form onSubmit={handleSubmit}>
                            <div className={styles.formGroup}>
                                <label htmlFor="personalName">
                                    Personal Name
                                </label>
                                <input
                                    type="text"
                                    id="personalName"
                                    name="personalName"
                                    value={formData.personalName}
                                    onChange={(e) => handleChange(e)}
                                    placeholder="John Doe"
                                    required
                                />
                                {errors.personalName && (
                                    <p className={styles.error}>
                                        {errors.personalName}
                                    </p>
                                )}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="companyName">
                                    Company Name
                                </label>
                                <input
                                    type="text"
                                    id="companyName"
                                    name="companyName"
                                    value={formData.companyName}
                                    onChange={(e) => handleChange(e)}
                                    placeholder="Doe Enterprises"
                                    required
                                />
                                {errors.companyName && (
                                    <p className={styles.error}>
                                        {errors.companyName}
                                    </p>
                                )}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="storeAddress">
                                    Store Address
                                </label>
                                <input
                                    type="text"
                                    id="storeAddress"
                                    name="storeAddress"
                                    value={formData.storeAddress}
                                    onChange={handleChange}
                                    placeholder="1234 Elm Street"
                                    required
                                />
                                {errors.storeAddress && (
                                    <p className={styles.error}>
                                        {errors.storeAddress}
                                    </p>
                                )}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="phoneNumber">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    id="phoneNumber"
                                    name="phoneNumber"
                                    value={formData.phoneNumber}
                                    onChange={handlePhoneNumberChange}
                                    placeholder="+7"
                                    maxLength="12"
                                    required
                                />
                                {errors.phoneNumber && (
                                    <p className={styles.error}>{errors.phoneNumber}</p>
                                )}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="email">Email</label>
                                <input
                                    type="email"
                                    id="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="john.doe@example.com"
                                    required
                                />
                                {errors.email && (
                                    <p className={styles.error}>{errors.email}</p>
                                )}
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="numberOfServices">
                                    Number of Services
                                </label>
                                <input
                                    type="number"
                                    id="numberOfServices"
                                    name="numberOfServices"
                                    value={formData.numberOfServices}
                                    onChange={handleServicesChange}
                                    min="1"
                                    required
                                />
                            </div>
                            {formData.services.map((service, index) => (
                                <div key={index} className={styles.serviceGroup}>
                                    <h3>Service {index + 1}</h3>
                                    <div className={styles.formGroup}>
                                        <label htmlFor={`service-${index}-title`}>Title</label>
                                        <input
                                            type="text"
                                            id={`service-${index}-title`}
                                            name={`service-${index}-title`}
                                            value={service.title}
                                            onChange={handleChange}
                                            placeholder="Haircut"
                                            required
                                        />
                                        {errors[`service-${index}-title`] && (
                                            <p className={styles.error}>{errors[`service-${index}-title`]}</p>
                                        )}
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor={`service-${index}-cost`}>Cost</label>
                                        <input
                                            type="number"
                                            id={`service-${index}-cost`}
                                            name={`service-${index}-cost`}
                                            value={service.cost}
                                            onChange={handleChange}
                                            placeholder="50"
                                            required
                                        />
                                        {errors[`service-${index}-cost`] && (
                                            <p className={styles.error}>{errors[`service-${index}-cost`]}</p>
                                        )}
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor={`service-${index}-description`}>Description</label>
                                        <textarea
                                            id={`service-${index}-description`}
                                            name={`service-${index}-description`}
                                            value={service.description}
                                            onChange={handleChange}
                                            placeholder="A detailed description of the service."
                                            required
                                        />
                                        {errors[`service-${index}-description`] && (
                                            <p className={styles.error}>{errors[`service-${index}-description`]}</p>
                                        )}
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor={`service-${index}-service_time`}>Service Time (minutes)</label>
                                        <input
                                            type="number"
                                            id={`service-${index}-service_time`}
                                            name={`service-${index}-service_time`}
                                            value={service.service_time}
                                            onChange={handleChange}
                                            placeholder="30"
                                            required
                                        />
                                        {errors[`service-${index}-service_time`] && (
                                            <p className={styles.error}>{errors[`service-${index}-service_time`]}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                            <div className={styles.workingHoursContainer}>
                                <h3>Working Hours</h3>
                                <div className={styles.formGroup}>
                                    <label>
                                        <input
                                            type="checkbox"
                                            checked={workingHours.applyToAll}
                                            onChange={() =>
                                                setWorkingHours({
                                                    ...workingHours,
                                                    applyToAll: !workingHours.applyToAll,
                                                })
                                            }
                                        />
                                        Apply the same hours to all days
                                    </label>
                                </div>
                                {workingHours.applyToAll && (
                                    <div className={styles.formGroup}>
                                        <div>
                                            <label>Start Time:</label>
                                            <DatePicker
                                                selected={workingHours.sameHours.start}
                                                onChange={(start) => handleApplyToAllChange(start, workingHours.sameHours.end)}
                                                showTimeSelect
                                                showTimeSelectOnly
                                                timeIntervals={30}
                                                timeCaption="Time"
                                                dateFormat="HH:mm"
                                                className={styles.reactDatetimePicker}
                                                timeFormat="HH:mm"
                                            />
                                        </div>
                                        <div>
                                            <label>End Time:</label>
                                            <DatePicker
                                                selected={workingHours.sameHours.end}
                                                onChange={(end) => handleApplyToAllChange(workingHours.sameHours.start, end)}
                                                showTimeSelect
                                                showTimeSelectOnly
                                                timeIntervals={30}
                                                timeCaption="Time"
                                                dateFormat="HH:mm"
                                                className={styles.reactDatetimePicker}
                                                timeFormat="HH:mm"
                                            />
                                        </div>
                                    </div>
                                )}
                                {Object.keys(workingHours.days).map((day) => (
                                    <div key={day} className={styles.formGroup}>
                                        <label>
                                            <input
                                                type="checkbox"
                                                checked={workingHours.days[day].selected}
                                                onChange={() => handleDaySelection(day)}
                                            />
                                            {day}
                                        </label>
                                        {(!workingHours.applyToAll || workingHours.days[day].selected) && (
                                            <div>
                                                <label>Start Time:</label>
                                                <DatePicker
                                                    selected={workingHours.days[day].start}
                                                    onChange={(start) => handleWorkingHoursChange(day, start, workingHours.days[day].end)}
                                                    showTimeSelect
                                                    showTimeSelectOnly
                                                    timeIntervals={30}
                                                    timeCaption="Time"
                                                    dateFormat="HH:mm"
                                                    className={styles.reactDatetimePicker}
                                                    timeFormat="HH:mm"
                                                />
                                                <label>End Time:</label>
                                                <DatePicker
                                                    selected={workingHours.days[day].end}
                                                    onChange={(end) => handleWorkingHoursChange(day, workingHours.days[day].start, end)}
                                                    showTimeSelect
                                                    showTimeSelectOnly
                                                    timeIntervals={30}
                                                    timeCaption="Time"
                                                    dateFormat="HH:mm"
                                                    className={styles.reactDatetimePicker}
                                                    timeFormat="HH:mm"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {errors.workingHours && <p className={styles.error}>{errors.workingHours}</p>}
                            </div>
                            <div className={styles.formGroup}>
                                <CaptchaPage onChange={setCaptchaVerified} />
                                {errors.captcha && <p className={styles.error}>{errors.captcha}</p>}
                            </div>
                            <button type="submit" className={styles.submitButton}>Register</button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default RegistrationForm;
