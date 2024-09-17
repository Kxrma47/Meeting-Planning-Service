import React, { useState, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import QRCode from "qrcode.react";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "./ShopView.css";
import {
  FaShoppingCart,
  FaTrash,
  FaPlusCircle,
  FaMinusCircle,
} from "react-icons/fa";
import { format, toZonedTime } from "date-fns-tz";

const ShopView = () => {
  const { username } = useParams();
  const history = useHistory();
  const [shopData, setShopData] = useState(null);
  const [selectedServices, setSelectedServices] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [phoneNumber, setPhoneNumber] = useState("+7");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpRequested, setOtpRequested] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [reservationStep, setReservationStep] = useState(1);
  const [timeSlotError, setTimeSlotError] = useState("");
  const [appointmentError, setAppointmentError] = useState("");
  const [message, setMessage] = useState("");
  const [cartOpen, setCartOpen] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showClientDetailsModal, setShowClientDetailsModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const MOSCOW_TZ = "Europe/Moscow";
  useEffect(() => {
    if (selectedDate) {
      const zonedDate = toZonedTime(selectedDate, MOSCOW_TZ);
      const formattedDate = format(zonedDate, "yyyy-MM-dd");
      fetchAvailableSlots(formattedDate);
    }
  }, [username, selectedDate]);

  const fetchAvailableSlots = async (formattedDate) => {
    try {
      const response = await fetch(
        `/api/shop/${username}/available_slots?date=${formattedDate}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.available_slots && data.available_slots.length > 0) {
          setAvailableSlots(data.available_slots);
          setTimeSlotError("");
        } else {
          setAvailableSlots([]);
          setTimeSlotError("No available slots for the selected date.");
        }
      } else if (response.status === 404) {
        setAvailableSlots([]);
        setTimeSlotError("No working hours found for this day.");
      } else {
        setTimeSlotError("Failed to fetch available slots.");
      }
    } catch (error) {
      setTimeSlotError("An error occurred while fetching available slots.");
    }
  };

  useEffect(() => {
    const optionSelected = sessionStorage.getItem("option_selected");
    if (!optionSelected) {
      history.push(`/shop/${username}`);
    } else {
      fetchShopData();
    }
  }, [username, history]);

  const fetchShopData = async () => {
    try {
      const response = await fetch(`/api/shop/${username}/data`);
      if (response.ok) {
        const data = await response.json();
        setShopData(data);
      } else if (response.status === 403) {
        history.push(`/shop/${username}`);
      } else {
        setTimeSlotError("Failed to fetch shop data.");
      }
    } catch (error) {
      setTimeSlotError("An error occurred while fetching shop data.");
    }
  };

  const checkAppointment = async () => {
    try {
      const response = await fetch(
        `/api/check_appointment?phone=${phoneNumber}`
      );
      if (response.ok) {
        const data = await response.json();
        setAppointmentDetails(data);
        setAppointmentError("");
      } else {
        setAppointmentError("No appointment found with this phone number.");
        setAppointmentDetails(null);
      }
    } catch (error) {
      setAppointmentError("An error occurred while checking the appointment.");
      setAppointmentDetails(null);
    }
  };

  useEffect(() => {
    if (selectedDate) {
      const fetchAvailableSlots = async (date) => {
        const utcDate = new Date(
          Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
        );
        const formattedDate = utcDate.toISOString().split("T")[0];
        try {
          const response = await fetch(
            `/api/shop/${username}/available_slots?date=${formattedDate}`
          );
          if (response.ok) {
            const data = await response.json();
            if (data.available_slots && data.available_slots.length > 0) {
              setAvailableSlots(data.available_slots);
              setTimeSlotError("");
            } else {
              setAvailableSlots([]);
              setTimeSlotError("No available slots for the selected date.");
            }
          } else if (response.status === 404) {
            setAvailableSlots([]);
            setTimeSlotError("No working hours found for this day.");
          } else {
            setTimeSlotError("Failed to fetch available slots.");
          }
        } catch (error) {
          setError("An error occurred while fetching available slots.");
        }
      };
      fetchAvailableSlots(selectedDate);
    }
  }, [username, selectedDate]);

  const handleServiceSelect = (service) => {
    const existingService = selectedServices.find((s) => s.id === service.id);
    if (existingService) {
      setSelectedServices(
        selectedServices.map((s) =>
          s.id === service.id ? { ...s, quantity: s.quantity + 1 } : s
        )
      );
    } else {
      setSelectedServices([...selectedServices, { ...service, quantity: 1 }]);
    }
  };

  const handleServiceRemove = (service) => {
    setSelectedServices(selectedServices.filter((s) => s.id !== service.id));
  };

  const incrementQuantity = (service) => {
    setSelectedServices(
      selectedServices.map((s) =>
        s.id === service.id ? { ...s, quantity: s.quantity + 1 } : s
      )
    );
  };

  const decrementQuantity = (service) => {
    setSelectedServices(
      selectedServices.map((s) =>
        s.id === service.id && s.quantity > 1
          ? { ...s, quantity: s.quantity - 1 }
          : s
      )
    );
  };

  const handlePhoneNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, "");
    if (value.length > 11) value = value.slice(0, 11);
    setPhoneNumber("+7" + value.slice(1));
  };

  const requestOtp = async () => {
    try {
      const response = await fetch(`/api/shop/${username}/request_otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone_number: phoneNumber }),
      });

      if (response.ok) {
        alert("OTP sent successfully!");
        setOtpRequested(true);
        setShowPhoneModal(false);
        setShowOtpModal(true);
        setTimeout(() => setOtpRequested(false), 60000);
      } else {
        alert("Failed to send OTP.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  const verifyOtp = async () => {
    try {
      const response = await fetch(`/api/shop/${username}/verify_otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          otp_code: otp,
        }),
      });

      if (response.ok) {
        alert("OTP verified successfully!");
        setOtpVerified(true);
        setReservationStep(3);
        setShowOtpModal(false);
        setShowClientDetailsModal(true);
      } else {
        alert("Invalid or expired OTP.");
      }
    } catch (error) {
      alert("An error occurred. Please try again.");
    }
  };

  useEffect(() => {
    if (selectedDate) {
      const zonedDate = toZonedTime(selectedDate, MOSCOW_TZ);
      const formattedDate = format(zonedDate, "yyyy-MM-dd");
      fetchAvailableSlots(formattedDate);
    }
  }, [username, selectedDate]);

  const completeReservation = async () => {
    if (selectedServices.length === 0) {
      alert("Please add at least one service to your cart.");
      return;
    }

    if (!selectedDate) {
      alert("Please select a date for your reservation.");
      return;
    }

    if (!selectedTime) {
      alert("Please select a time slot for your reservation.");
      return;
    }

    if (!otpVerified) {
      alert("Please verify OTP before making a reservation.");
      return;
    }

    try {
      setLoading(true);
      const zonedDate = toZonedTime(selectedDate, MOSCOW_TZ);
      const firstTimeSlot = selectedTime.split(", ")[0];
      const formattedDate = `${format(
        zonedDate,
        "yyyy-MM-dd"
      )} ${firstTimeSlot}`;

      const serviceIdsAndQuantities = selectedServices.map((service) => ({
        id: service.id,
        quantity: service.quantity,
      }));

      const response = await fetch(`/api/shop/${username}/reserve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          phone_number: phoneNumber,
          services: serviceIdsAndQuantities,
          date: formattedDate,
        }),
      });

      if (response.ok) {
        setMessage("Reservation successful! The page will refresh shortly.");
        setLoading(false);

        setSelectedServices([]);
        setSelectedTime(null);
        setReservationStep(1);
        setOtpVerified(false);
        setShowClientDetailsModal(false);

        setTimeout(() => {
          history.push(`/shop/${username}`);
        }, 5000);
      } else {
        const errorData = await response.json();
        console.error("Reservation failed:", errorData);
        alert(
          "Failed to make reservation: " +
            (errorData.message || "Unknown error")
        );
        setLoading(false);
      }
    } catch (error) {
      console.error("Error making reservation:", error);
      alert(
        "An error occurred while making the reservation. Please try again."
      );
      setLoading(false);
    }
  };

  const totalAmount = selectedServices.reduce(
    (total, service) => total + service.cost * service.quantity,
    0
  );

  return (
    <div className="shop-view">
      {loading && <div className="loading-animation">Loading...</div>}

      {message && (
        <div className="dimmed-background">
          <div className="success-message-popup">{message}</div>
        </div>
      )}
      {shopData ? (
        <>
          <div className="shop-info-container">
            <section className="shop-info">
              <p>
                <strong>Owner's Name:</strong> {shopData.personal_name}
              </p>
              <p>
                <strong>Email:</strong> {shopData.email}
              </p>
              <p>
                <strong>Contact Number:</strong> {shopData.phone_number}
              </p>
              <p>
                <strong>Number of Services:</strong> {shopData.services.length}
              </p>
            </section>
            <div className="qr-code-container">
              <QRCode value={window.location.href} />
            </div>
          </div>
          <section className="services-list">
            <h2>Services</h2>
            <ul>
              {shopData.services.map((service) => (
                <li key={service.id}>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                  <p>Cost: ${service.cost}</p>
                  <p>Service Time: {service.service_time} minutes</p>
                  <button onClick={() => handleServiceSelect(service)}>
                    Add to Cart
                  </button>
                </li>
              ))}
            </ul>
          </section>
          <section className="reservation-area">
            <div className="calendar-time-slot-container">
              <CalendarSelection
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                reservations={reservations}
              />
              {selectedDate && (
                <TimeSlotSelection
                  availableSlots={availableSlots}
                  setSelectedTime={setSelectedTime}
                  selectedServices={selectedServices}
                  selectedTime={selectedTime}
                  error={timeSlotError}
                />
              )}
            </div>
            {reservationStep === 2 && (
              <div className="client-info">
                <h2>Client Information</h2>
                <input
                  type="text"
                  placeholder="Client Name"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Phone Number (+7 format)"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                />
                <button onClick={requestOtp} disabled={otpRequested}>
                  {otpRequested ? "Wait for 1 minute" : "Request OTP"}
                </button>
                {otpRequested && (
                  <>
                    <input
                      type="text"
                      placeholder="Enter OTP"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                    />
                    <button onClick={verifyOtp}>Verify OTP</button>
                  </>
                )}
              </div>
            )}
          </section>
          <section className="appointment-check">
            <h2>Already have an appointment?</h2>
            <button onClick={() => setShowAppointmentModal(true)}>
              Check Here!
            </button>
          </section>
        </>
      ) : (
        <p>Loading shop data...</p>
      )}

      <button className="cart-button" onClick={() => setCartOpen(!cartOpen)}>
        <FaShoppingCart size={24} />
        <div className="badge">{selectedServices.length}</div>
      </button>

      <div className={`floating-cart ${cartOpen ? "open" : ""}`}>
        <h2>Your Cart</h2>
        <ul>
          {selectedServices.map((service, index) => (
            <li key={index} className="service-item">
              <h3>{`${index + 1}. ${service.title}`}</h3>
              <p>Cost: ${service.cost}</p>
              <p>Service Time: {service.service_time} minutes</p>
              <div className="quantity-controls">
                <button onClick={() => incrementQuantity(service)}>
                  <FaPlusCircle />
                </button>
                <span>{service.quantity}</span>
                <button onClick={() => decrementQuantity(service)}>
                  <FaMinusCircle />
                </button>
              </div>
              <button
                onClick={() => handleServiceRemove(service)}
                className="trash-button"
              >
                <FaTrash />
              </button>
            </li>
          ))}
        </ul>
        <div className="total-amount">Total Amount: ${totalAmount}</div>
        <button
          onClick={() => {
            if (selectedServices.length === 0) {
              alert("Please add at least one service to your cart.");
              return;
            }

            if (!selectedDate) {
              alert("Please select a date for your reservation.");
              return;
            }

            if (!selectedTime) {
              alert("Please select a time slot for your reservation.");
              return;
            }
            setShowPhoneModal(true);
          }}
          className="reserve-button"
        >
          Reserve
        </button>
      </div>

      {showPhoneModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Enter Phone Number</h3>
            <input
              type="text"
              placeholder="Phone Number (+7 format)"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
            />
            <button onClick={requestOtp} disabled={otpRequested}>
              {otpRequested ? "Wait for 1 minute" : "Request OTP"}
            </button>
            <button
              onClick={() => setShowPhoneModal(false)}
              className="close-button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showOtpModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Enter OTP</h3>
            <input
              type="text"
              placeholder="Enter OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
            <button onClick={verifyOtp}>Verify OTP</button>
            <button
              onClick={() => setShowOtpModal(false)}
              className="close-button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showClientDetailsModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Client Details</h3>
            <input
              type="text"
              placeholder="Client Name"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <input
              type="email"
              placeholder="Client Email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
            />
            <button onClick={completeReservation}>Complete Reservation</button>
            <button
              onClick={() => setShowClientDetailsModal(false)}
              className="close-button"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {showAppointmentModal && (
        <div className="modal">
          <div className="modal-content">
            <h3>Check Your Appointment</h3>
            {appointmentError && <p className="error">{appointmentError}</p>}
            <input
              type="text"
              placeholder="Phone Number (+7 format)"
              value={phoneNumber}
              onChange={handlePhoneNumberChange}
            />
            <button onClick={checkAppointment}>Check Appointment</button>
            <button
              onClick={() => setShowAppointmentModal(false)}
              className="close-button"
            >
              Close
            </button>
            {appointmentDetails && (
              <div className="appointment-details">
                <h3>Appointment Details</h3>
                <div className="appointment-info">
                  <p>
                    <strong>Time:</strong> {appointmentDetails.time}
                  </p>
                  <p>
                    <strong>Status:</strong>{" "}
                    <span
                      className={`status-badge ${appointmentDetails.status.toLowerCase()}`}
                    >
                      {appointmentDetails.status}
                    </span>
                  </p>
                  {appointmentDetails.status === "Rejected" && (
                    <p>
                      <strong>Reason:</strong>{" "}
                      {appointmentDetails.rejection_reason}
                    </p>
                  )}
                </div>
                <div className="service-details">
                  <h4>Services:</h4>
                  <ul>
                    {appointmentDetails.services.map((service, index) => (
                      <li key={index} className="service-item">
                        <span className="service-name">{service.name}</span>
                        <span className="service-quantity">
                          x {service.quantity}
                        </span>
                        <span className="service-cost">${service.cost}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="total-amount">
                  <h4>Total Amount:</h4>
                  <p>${appointmentDetails.total}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const CalendarSelection = ({ selectedDate, setSelectedDate, reservations }) => {
  return (
    <div className="calendar-selection">
      <h2>Select a Date</h2>
      <Calendar
        onChange={(date) => {
          setSelectedDate(date);
        }}
        value={selectedDate}
        tileContent={({ date, view }) => {
          const isReserved = reservations.some(
            (r) => new Date(r.date).toDateString() === date.toDateString()
          );
          return isReserved ? <p className="reserved">Reserved</p> : null;
        }}
      />
    </div>
  );
};

const TimeSlotSelection = ({
  availableSlots,
  setSelectedTime,
  selectedServices = [],
  selectedTime,
  error,
}) => {
  const [selectedSlots, setSelectedSlots] = useState([]);

  useEffect(() => {
    if (selectedServices.length === 0 || availableSlots.length === 0) return;

    const totalServiceTime = selectedServices.reduce(
      (total, service) => total + service.service_time * service.quantity,
      0
    );

    const slotsNeeded = Math.ceil(totalServiceTime / 60);

    const updateSelectedSlots = (startIndex) => {
      const slotsToSelect = availableSlots.slice(
        startIndex,
        startIndex + slotsNeeded
      );
      if (
        slotsToSelect.length === slotsNeeded &&
        slotsToSelect.every((slot) => slot.status === "free")
      ) {
        setSelectedSlots(slotsToSelect.map((slot) => slot.time));
        setSelectedTime(slotsToSelect.map((slot) => slot.time).join(", "));
      } else {
        alert(
          "Not enough consecutive free time slots available from the selected start time."
        );
      }
    };

    if (selectedTime) {
      const startIndex = availableSlots.findIndex(
        (slot) => slot.time === selectedTime.split(", ")[0]
      );
      if (startIndex !== -1) {
        updateSelectedSlots(startIndex);
      }
    }
  }, [availableSlots, selectedServices, selectedTime, setSelectedTime]);

  const handleSlotClick = (slot, index) => {
    if (slot.status === "occupied") {
      alert("This slot is already reserved. Please select another one.");
    } else {
      setSelectedTime(slot.time);
      setSelectedSlots([]);
      const totalServiceTime = selectedServices.reduce(
        (total, service) => total + service.service_time * service.quantity,
        0
      );
      const slotsNeeded = Math.ceil(totalServiceTime / 60);

      updateSelectedSlots(index);
    }
  };

  const updateSelectedSlots = (startIndex) => {
    const totalServiceTime = selectedServices.reduce(
      (total, service) => total + service.service_time * service.quantity,
      0
    );
    const slotsNeeded = Math.ceil(totalServiceTime / 60);
    const slotsToSelect = availableSlots.slice(
      startIndex,
      startIndex + slotsNeeded
    );
    if (
      slotsToSelect.length === slotsNeeded &&
      slotsToSelect.every((slot) => slot.status === "free")
    ) {
      setSelectedSlots(slotsToSelect.map((slot) => slot.time));
      setSelectedTime(slotsToSelect.map((slot) => slot.time).join(", "));
    } else {
      alert(
        "Not enough consecutive free time slots available from the selected start time."
      );
    }
  };

  return (
    <div className="time-slot-selection">
      <h2>Select a Time Slot</h2>
      <ul>
        {availableSlots.length === 0 ? (
          <li>{error || "No available slots"}</li>
        ) : (
          availableSlots.map((slot, index) => (
            <li
              key={index}
              onClick={() => handleSlotClick(slot, index)}
              className={`available-slot ${
                slot.status === "occupied" ? "occupied" : ""
              } ${selectedSlots.includes(slot.time) ? "selected" : ""}`}
              style={{
                cursor: slot.status === "occupied" ? "not-allowed" : "pointer",
                backgroundColor: selectedSlots.includes(slot.time)
                  ? "#6CA6CD"
                  : "",
                color:
                  slot.status === "occupied"
                    ? "red"
                    : selectedSlots.includes(slot.time)
                    ? "#ffffff"
                    : "",
              }}
            >
              {slot.time} - {slot.status === "occupied" ? "Occupied" : "Free"}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};

export default ShopView;
