import React, { useState, useEffect } from 'react';
import { useHistory, useParams } from 'react-router-dom';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './Option.css';
import { format, toZonedTime } from 'date-fns-tz';

const Option = () => {
    const [hasAppointment, setHasAppointment] = useState(null);
        const [phoneNumber, setPhoneNumber] = useState('+7');
        const [appointmentInfo, setAppointmentInfo] = useState(null);
        const [previousTime, setPreviousTime] = useState('');
        const [error, setError] = useState('');
        const [appointmentNotFound, setAppointmentNotFound] = useState(false);
        const [feedback, setFeedback] = useState('');
        const [clientName, setClientName] = useState('');
        const [clientEmail, setClientEmail] = useState('');
        const [clientPhone, setClientPhone] = useState('');
        const [showFeedbackForm, setShowFeedbackForm] = useState(false);
        const [showBookAgainOption, setShowBookAgainOption] = useState(false);
        const [showChangeTimeOption, setShowChangeTimeOption] = useState(false);
        const [showCalendar, setShowCalendar] = useState(false);
        const [selectedDate, setSelectedDate] = useState(null);
        const [availableSlots, setAvailableSlots] = useState([]);
        const [selectedTime, setSelectedTime] = useState(null);
        const [timeSlotError, setTimeSlotError] = useState('');
        const [showServiceEditor, setShowServiceEditor] = useState(false);
        const [showOtpModal, setShowOtpModal] = useState(false);
        const [otp, setOtp] = useState('');
        const [otpVerified, setOtpVerified] = useState(false);
        const [resendTimer, setResendTimer] = useState(60);
        const [otpRequested, setOtpRequested] = useState(false);
        const [isEditing, setIsEditing] = useState(false);
        const history = useHistory();
        const { username } = useParams();
        const [bookings, setBookings] = useState([]);
        const [changedServices, setChangedServices] = useState(null);
        const [changedDate, setChangedDate] = useState(null);
        const [changedTime, setChangedTime] = useState(null);
        const [availableServices, setAvailableServices] = useState([]);

const handleSubmitChanges = async () => {
    if (!changedServices && !changedDate && !changedTime) {
        alert("No changes made");
        return;
    }

    try {
        const formattedDate = changedDate
            ? format(changedDate, 'yyyy-MM-dd', { timeZone: 'Europe/Moscow' })
            : appointmentInfo.date;

        let formattedTime;
        if (changedTime instanceof Date) {
            formattedTime = format(changedTime, 'HH:mm', { timeZone: 'Europe/Moscow' });
        } else if (typeof changedTime === 'string' && changedTime.length > 0) {
            formattedTime = changedTime;
        } else {
            const appointmentTime = new Date(`${appointmentInfo.date}T${appointmentInfo.time}:00`);
            if (isNaN(appointmentTime)) {
                alert('Invalid time value in the appointment information.');
                return;
            }
            formattedTime = format(appointmentTime, 'HH:mm', { timeZone: 'Europe/Moscow' });
        }

        const totalServiceTime = (changedServices || appointmentInfo.services)
            .reduce((total, service) => total + (service.duration * service.quantity), 0);
        const numServices = (changedServices || appointmentInfo.services).length;

        const updatedServices = (changedServices || appointmentInfo.services).map(service => {
            return {
                service_id: service.service_id || service.id,
                quantity: service.quantity,
                name: service.name,
                duration: service.duration,
                cost: service.cost,
            };
        });


        console.log({
            appointment_id: appointmentInfo.id,
            client_name: appointmentInfo.client_name,
            phone_number: phoneNumber,
            client_email: appointmentInfo.client_email,
            requested_date: formattedDate,
            requested_time: formattedTime,
            requested_service: updatedServices,
            requested_total_service_time: totalServiceTime,
            requested_num_services: numServices,
        });

        const response = await fetch('/api/request_change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                appointment_id: appointmentInfo.id,
                client_name: appointmentInfo.client_name,
                phone_number: phoneNumber,
                client_email: appointmentInfo.client_email,
                requested_date: formattedDate,
                requested_time: formattedTime,
                requested_service: updatedServices,
                requested_total_service_time: totalServiceTime,
                requested_num_services: numServices,
            }),
        });


        if (response.ok) {
            alert('Changes submitted successfully.');
            history.push(`/shop/${username}/view`);
        } else {
            const errorData = await response.json();
            alert('Failed to submit changes. ' + errorData.message);
        }
    } catch (error) {
        console.error('Error during submission:', error);
        alert('An error occurred. Please try again.');
    }
};


    const handleCreateAppointmentYes = async () => {
        console.log('User opted to create an appointment');
        history.push(`/shop/${username}/view`);
    };

    const handleCreateAppointmentNo = async () => {
        console.log('User opted not to create an appointment');
        setShowFeedbackForm(true);
    };



    const handleBookAgainYes = () => {
        console.log('User opted to book again');
        history.push(`/shop/${username}/view`);
    };




    const handleBookAgainNo = () => {
        console.log('User opted not to book again');
        setShowFeedbackForm(true);
    };

    useEffect(() => {
        const fetchBookings = async () => {
            console.log('Fetching bookings for', username);
            try {
                const response = await fetch(`/api/shop/${username}/reservations`);
                if (!response.ok) throw new Error('Error fetching bookings');
                const data = await response.json();
                console.log('Bookings fetched:', data);
                setBookings(data);
            } catch (error) {
                console.error('Error fetching bookings:', error.message);
            }
        };

        fetchBookings();
    }, [username]);

    const handleYes = async () => {
        console.log('User has an appointment');
        setHasAppointment(true);
        sessionStorage.setItem('option_selected', 'yes');
        try {
            await fetch('/api/select_option', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ option_selected: 'yes' }),
            });
            console.log('Option "yes" selected');
        } catch (error) {
            console.error('Error selecting option:', error.message);
        }
    };

    const handleNo = async () => {
        console.log('User does not have an appointment');
        setHasAppointment(false);
        sessionStorage.setItem('option_selected', 'no');
        history.push(`/shop/${username}/view`);
        try {
            await fetch('/api/select_option', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ option_selected: 'no' }),
            });
            console.log('Option "no" selected');
        } catch (error) {
            console.error('Error selecting option:', error.message);
        }
    };

    const handlePhoneNumberChange = (e) => {
        let value = e.target.value;
        console.log('Phone number input changed:', value);

        if (!value.startsWith('+7')) {
            value = '+7' + value.replace(/[^0-9]/g, '');
        } else {
            value = '+7' + value.slice(2).replace(/[^0-9]/g, '');
        }

        if (value.length > 12) {
            value = value.slice(0, 12);
        }

        setPhoneNumber(value);
        console.log('Formatted phone number:', value);
    };

    const handleCheckAppointment = async () => {
        console.log('Checking appointment for phone number:', phoneNumber);
        try {
            const response = await fetch(`/api/shop/${username}/appointment_details?phone=${phoneNumber}`);
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);

            if (response.ok) {
                console.log('Appointment found:', data);
                const rawTime = data.time;
                setPreviousTime(rawTime);

                setAppointmentInfo({
                    ...data,
                    id: data.id,
                    client_name: data.client_name,
                    client_email: data.client_email,
                    status: data.status,
                    time: `${data.date} ${rawTime}`,
                });

                const appointmentDateTime = new Date(`${data.date}T${rawTime}:00`);
                setSelectedDate(appointmentDateTime);
                setError('');
                setAppointmentNotFound(false);
                setShowBookAgainOption(true);


                if (data.status !== 'Rejected') {
                    setShowChangeTimeOption(true);
                }
            } else {
                console.log('No appointment found:', data.message);
                setError(data.message || 'No appointment found');
                setAppointmentNotFound(true);
            }
        } catch (error) {
            console.error('Error fetching appointment:', error.message);
            setError('An error occurred. Please try again.');
            setAppointmentNotFound(true);
        }
    };



    useEffect(() => {
        if (selectedTime && appointmentInfo && appointmentInfo.services) {
            console.log('Updating available slots based on selected time and services');
            const endTime = calculateEndTime(selectedTime, appointmentInfo.services);
            setAvailableSlots((prevSlots) =>
                prevSlots.map((slot) => {
                    if (slot.time >= selectedTime && slot.time < endTime) {
                        if (slot.status === 'free') {
                            console.log('Slot booked:', slot.time);
                            return { ...slot, status: 'booked' };
                        }
                    }
                    return slot;
                })
            );
        }
    }, [selectedTime, appointmentInfo]);


    const requestOtp = async () => {
        if (otpRequested) return;
        console.log('Requesting OTP for phone number:', phoneNumber);
        try {
            const response = await fetch('/api/request_otp_ver', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone: phoneNumber }),
            });
            if (response.ok) {
                console.log('OTP requested successfully');
                setShowOtpModal(true);
                setOtpRequested(true);
                setResendTimer(60);
            } else {
                console.error('Failed to request OTP');
                alert('Failed to send OTP. Please try again.');
            }
        } catch (error) {
            console.error('Error requesting OTP:', error.message);
            alert('An error occurred. Please try again.');
        }
    };

    useEffect(() => {
        if (resendTimer > 0) {
            const timerId = setInterval(() => {
                setResendTimer((prevTimer) => prevTimer - 1);

                if (resendTimer % 10 === 0) {
                    console.log('Resend timer:', resendTimer);
                }
            }, 1000);

            return () => clearInterval(timerId);
        }
    }, [resendTimer]);


    const handleVerifyOtp = async () => {
        console.log('Verifying OTP:', otp);
        try {
            const response = await fetch('/api/verify_otp_ver', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ phone: phoneNumber, otp }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('OTP verified successfully. Fetched appointment and available services data:', data);

                setAppointmentInfo({
                    id: data.appointment_id,
                    client_name: data.client_name,
                    client_email: data.client_email,
                    services: data.services.map(service => ({
                        service_id: service.service_id,
                        name: service.name,
                        quantity: service.quantity,
                        cost: service.cost,
                        duration: service.duration,
                    })),
                    status: data.status,
                    date: data.date,
                });


                setAvailableServices(data.available_services);

                setOtpVerified(true);
                setShowOtpModal(false);

                if (showServiceEditor) {
                    setShowServiceEditor(true);
                } else if (showCalendar) {
                    setShowCalendar(true);
                }
            } else {
                console.error('Invalid OTP');
                alert('Invalid OTP. Please try again.');
            }
        } catch (error) {
            console.error('Error verifying OTP:', error.message);
            alert('An error occurred. Please try again.');
        }
    };





    const handleServiceEditClick = async () => {
        console.log('Editing services');
        if (!otpVerified) {
            if (!otpRequested) {
                await requestOtp();
            }
            setShowOtpModal(true);
        } else {
            setShowServiceEditor(true);
        }
    };


    const handleTimeChangeClick = () => {
        console.log('Changing appointment time');
        if (!otpVerified) {
            if (!otpRequested) {
                requestOtp();
            }
            setShowCalendar(true);
        } else {
            setShowCalendar(true);
        }
    };

    useEffect(() => {
        if (selectedDate && showCalendar) {
            console.log('Fetching available slots for date:', selectedDate);
            const fetchAvailableSlots = async () => {
                const zonedDate = toZonedTime(selectedDate, 'Europe/Moscow');
                const formattedDate = format(zonedDate, 'yyyy-MM-dd', { timeZone: 'Europe/Moscow' });
                try {
                    const response = await fetch(`/api/shop/${username}/available_slots?date=${formattedDate}`);
                    const data = await response.json();
                    if (response.ok) {
                        console.log('Available slots fetched:', data.available_slots);
                        setAvailableSlots(data.available_slots || []);
                        setTimeSlotError(data.available_slots.length > 0 ? '' : 'No available slots for the selected date.');
                    } else if (response.status === 404) {
                        console.log('No working hours found for the selected day');
                        setAvailableSlots([]);
                        setTimeSlotError('No working hours found for this day.');
                    } else {
                        console.error('Failed to fetch available slots');
                        setTimeSlotError('Failed to fetch available slots.');
                    }
                } catch (error) {
                    console.error('Error fetching available slots:', error.message);
                    setTimeSlotError('An error occurred while fetching available slots.');
                }
            };

            fetchAvailableSlots();
        }
    }, [selectedDate, username, showCalendar]);

    const handleSubmitFeedback = async () => {
        console.log('Submitting feedback');
        if (!clientName || !clientEmail || !clientPhone || !feedback) {
            console.error('Feedback form incomplete');
            alert('Please fill in all fields');
            return;
        }

        try {
            const response = await fetch('/api/submit_feedback', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    shop_username: username,
                    client_name: clientName,
                    client_email: clientEmail,
                    client_phone: clientPhone,
                    complaint: feedback,
                }),
            });

            if (response.ok) {
                console.log('Feedback submitted successfully');
                alert('Feedback submitted successfully');
                history.push(`/shop/${username}/view`);
            } else {
                console.error('Failed to submit feedback');
                alert('Failed to submit feedback');
            }
        } catch (error) {
            console.error('Error submitting feedback:', error.message);
            alert('An error occurred. Please try again.');
        }
    };

const handleSlotClick = (slot, index) => {
    if (!isEditing) {
        alert("Please click 'Edit Appointment Time' before selecting a time slot.");
        return;
    }

    const totalServiceTime = appointmentInfo.services.reduce(
        (total, service) => total + (service.duration * service.quantity),
        0
    );
    const slotsNeeded = Math.ceil(totalServiceTime / 60);

    if (slot.isSelected) {
        setAvailableSlots(prevSlots =>
            prevSlots.map((s, idx) =>
                idx >= index && idx < index + slotsNeeded
                    ? { ...s, status: 'free', isSelected: false }
                    : s
            )
        );
        setSelectedTime(null);
        setTimeSlotError('');
        return;
    }

    if (slot.status === 'occupied') {
        alert("This slot is already reserved. Please select another one.");
        return;
    }

    const slotsToSelect = availableSlots.slice(index, index + slotsNeeded);
    if (!slotsToSelect || slotsToSelect.length === 0) {
        console.error("slotsToSelect is not properly initialized or is empty:", slotsToSelect);
        return;
    }

    const hasEnoughConsecutiveSlots =
        slotsToSelect.length === slotsNeeded &&
        slotsToSelect.every(s => s.status === 'free');

    if (hasEnoughConsecutiveSlots) {
        const startTime = slot.time;
        setSelectedTime(startTime);

        const endTime = calculateEndTime(startTime, appointmentInfo.services);

        setAvailableSlots(prevSlots =>
            prevSlots.map(s =>
                s.isSelected ? { ...s, status: 'free', isSelected: false } : s
            )
        );

        setAvailableSlots(prevSlots =>
            prevSlots.map((s, idx) =>
                idx >= index && idx < index + slotsNeeded
                    ? { ...s, status: 'booked', isSelected: true }
                    : s
            )
        );
        setTimeSlotError('');
    } else {
        setTimeSlotError(
            "Not enough consecutive free time slots available from the selected start time. Please choose another start time."
        );
    }

    console.log('After selecting, slot statuses:', availableSlots);
};




    const handleConfirmEdit = () => {
            console.log('Setting changed time, but not saving to the database.');
            setChangedDate(selectedDate);
            setChangedTime(selectedTime);
            setIsEditing(false);
        };


    const handleQuantityBlur = (index) => {
        setAppointmentInfo(prevInfo => {
            const updatedServices = prevInfo.services.map((service, i) =>
                i === index && (service.quantity === '' || service.quantity <= 0) ? { ...service, quantity: 1 } : service
            );
            return { ...prevInfo, services: updatedServices };
        });
    };




    const handleServiceQuantityChange = (index, newQuantity) => {
        console.log('Changing service quantity for index:', index, 'to new quantity:', newQuantity);

        if (newQuantity === '') {
            setAppointmentInfo(prevInfo => {
                const updatedServices = prevInfo.services.map((service, i) =>
                    i === index ? { ...service, quantity: '' } : service
                );
                return { ...prevInfo, services: updatedServices };
            });
            return;
        }

        const parsedQuantity = parseInt(newQuantity, 10);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
            console.error('Invalid quantity:', newQuantity);
            return;
        }

        setAppointmentInfo(prevInfo => {
            const updatedServices = prevInfo.services.map((service, i) =>
                i === index ? { ...service, quantity: parsedQuantity } : service
            );
            return { ...prevInfo, services: updatedServices };
        });
    };




    const handleRemoveService = (index) => {
        console.log('Removing service at index:', index);
        setAppointmentInfo((prevInfo) => {
            const updatedServices = prevInfo.services.filter((_, i) => i !== index);
            return { ...prevInfo, services: updatedServices };
        });
    };

    const handleSaveServiceChanges = () => {
            console.log('Setting changed services, but not saving to the database.');
            setChangedServices(appointmentInfo.services);
            setShowServiceEditor(false);
        };


    const handleEditClick = () => {
        console.log('Editing appointment time');
        if (!otpVerified) {
            console.warn('OTP not verified');
            alert('Please verify OTP first.');
            return;
        }

        setSelectedTime(null);
        setShowCalendar(true);

        const endTime = calculateEndTime(previousTime, appointmentInfo.services);

        let updatedSlots = availableSlots.map((slot) => {
            if (slot.time >= previousTime && slot.time < endTime) {
                console.log('Freeing slot:', slot.time);
                return { ...slot, status: 'free', isSelected: false };
            }
            return slot;
        });

        updatedSlots = updatedSlots.map((slot) => {
            if (slot.status === 'free' && isSlotOccupiedByAnotherBooking(slot.time)) {
                console.log('Slot occupied by another booking:', slot.time);
                return { ...slot, status: 'occupied' };
            }
            return slot;
        });

        setAvailableSlots(updatedSlots);
        setIsEditing(true);
    };


    const isSlotOccupiedByAnotherBooking = (time) => {
        console.log('Checking if slot is occupied by another booking:', time);
        if (!Array.isArray(bookings)) {
            return false;
        }

        return bookings.some(booking => {
            const bookingStartTime = booking.date.split(' ')[1];
            const bookingEndTime = calculateEndTime(bookingStartTime, booking.services);

            return time >= bookingStartTime && time < bookingEndTime;
        });
    };


    const calculateEndTime = (startTime, services = []) => {
        if (!Array.isArray(services) || services.length === 0 || !startTime) {
            return startTime;
        }

        const totalServiceTime = services.reduce((total, service) => {
            return total + (service?.duration * service?.quantity || 0);
        }, 0);

        const [startHours, startMinutes] = startTime.split(':').map(Number);

        if (isNaN(startHours) || isNaN(startMinutes)) {
            console.error('Invalid start time:', startTime);
            return '00:00';
        }

        const endMinutesTotal = startMinutes + totalServiceTime;
        const endHours = startHours + Math.floor(endMinutesTotal / 60);
        const endMinutes = endMinutesTotal % 60;

        const endTime = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
        console.log('Calculated end time:', endTime);
        return endTime;
    };
    const handleAddService = (service) => {

        const existingServiceIndex = appointmentInfo.services.findIndex(s => s.service_id === service.service_id);

        if (existingServiceIndex !== -1) {
            alert("This service is already added.");
            return;
        }

        setAppointmentInfo(prevInfo => ({
            ...prevInfo,
            services: [...prevInfo.services, { ...service, quantity: 1 }]
        }));
    };

const handleCancelAppointment = async () => {
    try {
        const otpResponse = await fetch('/api/business_owner/generate_cancel_otp', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                phone_number: phoneNumber,
            }),
        });

        const otpData = await otpResponse.json();
        console.log('Generated OTP:', otpData.otp);

        if (otpResponse.ok) {
            const otpCode = prompt('Please enter the OTP sent to your phone:');
            const cancellationReason = prompt('Please provide a reason for cancellation:');

            const cancelResponse = await fetch('/api/business_owner/cancel_appointment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    appointment_id: appointmentInfo.id,
                    phone_number: phoneNumber,
                    otp_code: otpCode,
                    cancellation_reason: cancellationReason,
                }),
            });

            const cancelData = await cancelResponse.json();

            if (cancelResponse.ok) {
                alert('Appointment cancelled successfully.');
                history.push(`/shop/${username}/view`);
            } else {
                alert('Failed to cancel appointment: ' + cancelData.message);
            }
        } else {
            alert('Failed to generate OTP: ' + otpData.message);
        }

    } catch (error) {
        console.error('Error cancelling appointment:', error);
        alert('An error occurred. Please try again.');
    }
};
    return (
        <div className="option-page-container">
            {hasAppointment === null && (
                <div className="option-container">
                    <h2>Do you already have an appointment?</h2>
                    <div className="option-buttons">
                        <button onClick={handleYes} className="option-button yes-button">Yes</button>
                        <button onClick={handleNo} className="option-button no-button">No</button>
                    </div>
                </div>
            )}
            {hasAppointment && (
                <div className="appointment-check-container">
                    <h2>Enter your phone number to check your appointment</h2>
                    <input
                        type="text"
                        value={phoneNumber}
                        onChange={handlePhoneNumberChange}
                        placeholder="Enter phone number"
                        className="phone-input"
                    />
                    <button onClick={handleCheckAppointment} className="check-button">
                        Check Appointment
                    </button>
                    {error && <p className="error-message">{error}</p>}
                    {appointmentNotFound && (
                        <div className="create-appointment-container">
                            <h3>No appointment found. Do you want to create an appointment?</h3>
                            <button onClick={handleCreateAppointmentYes} className="option-button yes-button">Yes</button>
                            <button onClick={handleCreateAppointmentNo} className="option-button no-button">No</button>
                        </div>
                    )}
                    {showFeedbackForm && (
                        <div className="feedback-container">
                            <h4>Provide your feedback:</h4>
                            <input
                                type="text"
                                value={clientName}
                                onChange={(e) => setClientName(e.target.value)}
                                placeholder="Enter your name"
                                className="feedback-input"
                            />
                            <input
                                type="email"
                                value={clientEmail}
                                onChange={(e) => setClientEmail(e.target.value)}
                                placeholder="Enter your email"
                                className="feedback-input"
                            />
                            <input
                                type="text"
                                value={clientPhone}
                                onChange={(e) => setClientPhone(e.target.value)}
                                placeholder="Enter your phone number"
                                className="feedback-input"
                            />
                            <textarea
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                placeholder="Enter your feedback here"
                                className="feedback-textarea"
                            />
                            <button onClick={handleSubmitFeedback} className="submit-feedback-button">
                                Submit Feedback
                            </button>
                        </div>
                    )}
                    {appointmentInfo && (
                        <div className="appointment-info">
                            <h3>Appointment Details</h3>
                            <p><strong>Time:</strong> {appointmentInfo.time}</p>
                            <p><strong>Status:</strong> {appointmentInfo.status}</p>

                            <div className="services-list">
                                <h4>Services You Have Booked:</h4>
                                {appointmentInfo.services && appointmentInfo.services.map((service, index) => (
                                    <div key={index} className="service-item">
                                        <p>{service.name}</p>
                                        <input
                                            type="number"
                                            value={service.quantity}
                                            min="1"
                                            onChange={(e) => handleServiceQuantityChange(index, e.target.value)}
                                            onBlur={() => handleQuantityBlur(index)}
                                            className="service-quantity-input"
                                            disabled={!otpVerified || !showServiceEditor}
                                        />
                                        {showServiceEditor && otpVerified && (
                                            <button onClick={() => handleRemoveService(index)} className="remove-service-button">Remove</button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <p><strong>Total:</strong> ${appointmentInfo.total}</p>

                            {otpVerified && (
                                <button onClick={handleCancelAppointment} className="cancel-appointment-button">
                                    Cancel Appointment
                                </button>
                            )}
                            {showServiceEditor && availableServices && (
                                <div className="available-services">
                                    <h4>Available Services</h4>
                                    {availableServices.map((service, index) => (
                                        <div key={index} className="available-service-item">
                                            <p>{service.name} - ${service.cost}</p>
                                            <button onClick={() => handleAddService(service)} className="add-service-button">Add Service</button>

                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    {appointmentInfo && appointmentInfo.status &&
                        appointmentInfo.status !== 'Rejected' &&
                        appointmentInfo.status !== 'Cancelled' &&
                        appointmentInfo.status !== 'Reported' && (
                        <>
                            <div className="change-time-container">
                                <h3>Plan changed? Want to change your appointment time?</h3>
                                <button onClick={handleTimeChangeClick} className="option-button change-time-button">Change Time</button>
                            </div>
                            <div className="change-service-container">
                                <h3>Need to change your services?</h3>
                                <button onClick={handleServiceEditClick} className="option-button change-service-button">Change Services</button>
                            </div>
                        </>
                    )}
                </div>
            )}
            {showCalendar && otpVerified && (
                <div className="calendar-slots-container">
                    <div className="calendar">
                        <h3>Select a new date and time for your appointment</h3>
                        <Calendar
                            onChange={setSelectedDate}
                            value={selectedDate ? toZonedTime(selectedDate, 'Europe/Moscow') : null}
                            className="calendar"
                        />
                    </div>
                    {selectedDate && (
                        <div className="available-slots-container">
                            <h4>Available Time Slots</h4>
                            {timeSlotError && <p className="error-message">{timeSlotError}</p>}
                            <ul>
                                {availableSlots.length === 0 ? (
                                    <li>{timeSlotError || "No available slots"}</li>
                                ) : (
                                    availableSlots.map((slot, index) => (
                                        <li
                                            key={index}
                                            onClick={() => handleSlotClick(slot, index)}
                                            className={`available-slot ${slot.status === 'occupied' ? 'occupied' : slot.status === 'booked' ? 'booked' : ''}`}
                                            style={{
                                                cursor: slot.status === 'occupied' ? 'not-allowed' : 'pointer',
                                                backgroundColor: slot.isSelected ? '#003366' : '',
                                                color: slot.isSelected ? '#ffffff' : slot.status === 'occupied' ? 'red' : '',
                                            }}
                                        >
                                            {slot.time} - {slot.status === 'occupied' ? 'Occupied' : slot.status === 'booked' ? 'Booked' : 'Free'}
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    )}
                    {isEditing ? (
                                            <button onClick={handleConfirmEdit} className="confirm-button">
                                                Confirm
                                            </button>
                                        ) : (
                                            <button onClick={handleEditClick} className="edit-button">
                                                Edit Appointment Time
                                            </button>
                                        )}


                                    </div>

            )}
            {otpVerified && (changedServices || changedDate || changedTime) && (
                                                                    <button onClick={handleSubmitChanges} className="finish-button">
                                                                        Finish
                                                                    </button>

                                                                )}
            {showOtpModal && (
                        <div className="otp-modal">
                            <h3>Enter OTP</h3>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                placeholder="Enter OTP"
                                className="otp-input"
                            />
                            <button onClick={handleVerifyOtp} className="verify-otp-button">Verify OTP</button>
                            {resendTimer > 0 ? (
                                <p>Resend OTP in {resendTimer} seconds</p>
                            ) : (
                                <button onClick={requestOtp} className="resend-otp-button">Resend OTP</button>
                            )}
                        </div>

                    )}

        </div>

    );
};

export default Option;

