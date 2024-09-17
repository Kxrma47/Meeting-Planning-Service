from official_website import db  # Use the db instance from official_website
from datetime import datetime
from sqlalchemy import Text
import pytz

MOSCOW_TZ = pytz.timezone('Europe/Moscow')

# Model representing the BusinessOwner entity
# - Stores details about the business owner such as personal info, company info, and credentials.
class BusinessOwner(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique identifier for the business owner
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)  # Foreign key linking to the User model
    personal_name = db.Column(db.String(100), nullable=False)  # Personal name of the business owner
    company_name = db.Column(db.String(100), nullable=False)  # Business name of the owner
    store_address = db.Column(db.String(200), nullable=False)  # Business address
    phone_number = db.Column(db.String(20), nullable=False)  # Contact phone number
    email = db.Column(db.String(120), unique=True, nullable=False)  # Contact email
    username = db.Column(db.String(50), unique=True, nullable=False)  # Username for login
    password = db.Column(db.String(200), nullable=False)  # Hashed password for authentication
    qr_code_link = db.Column(db.String(200), nullable=False)  # QR code link for business use
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Europe/Moscow')), nullable=False)  # Timestamp for account creation

    # Relationship with User model
    user = db.relationship('User', backref=db.backref('business_owner', lazy=True))

# Model to log actions performed by a BusinessOwner
# - Stores owner actions (like login, logout) along with timestamps.
class BusinessOwnerLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique identifier for the log entry
    owner_id = db.Column(db.Integer, db.ForeignKey('business_owner.id', ondelete='CASCADE'), nullable=False)  # Foreign key linking to the BusinessOwner
    action = db.Column(db.String(200), nullable=False)  # Action performed (e.g., "login", "logout")
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Europe/Moscow')), nullable=False)  # Timestamp for the action

# Model for storing OTP (One Time Password) for phone number verification
# - Contains the phone number, OTP, and a timestamp for the OTP generation.
class OTP(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique identifier for the OTP entry
    phone_number = db.Column(db.String(15), nullable=False)  # Phone number to which the OTP was sent
    otp = db.Column(db.String(6), nullable=False)  # OTP code for verification
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)  # Timestamp for OTP generation

    def __repr__(self):
        return f"<OTP {self.phone_number} - {self.otp}>"

# Model representing Feedback from clients regarding a business owner
# - Stores client complaints or feedback submitted for the business owner.
class Feedback(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique identifier for the feedback entry
    owner_id = db.Column(db.Integer, db.ForeignKey('business_owner.id'), nullable=False)  # Foreign key linking to the BusinessOwner
    client_name = db.Column(db.String(255), nullable=False)  # Client's name who provided the feedback
    client_email = db.Column(db.String(255), nullable=False)  # Client's email
    client_phone = db.Column(db.String(20), nullable=False)  # Client's phone number
    complaint = db.Column(db.String(1000), nullable=False)  # The complaint or feedback message
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # Timestamp for feedback submission

    # Relationship with the BusinessOwner
    owner = db.relationship('BusinessOwner', backref=db.backref('feedbacks', lazy=True))

# Model representing an Appointment for a business owner
# - Includes appointment details like client info, services, and status.
class Appointment(db.Model):
    __tablename__ = 'appointment'
    id = db.Column(db.Integer, primary_key=True)  # Unique identifier for the appointment
    owner_id = db.Column(db.Integer, db.ForeignKey('business_owner.id'), nullable=False)  # Foreign key linking to the BusinessOwner
    client_name = db.Column(db.String(100), nullable=False)  # Client's name for the appointment
    phone_number = db.Column(db.String(15), nullable=False)  # Client's phone number
    client_email = db.Column(db.String(100))  # Client's email address
    date = db.Column(db.DateTime, nullable=False)  # Start date and time of the appointment
    end_time = db.Column(db.DateTime, nullable=False)  # End time of the appointment
    service = db.Column(db.Text, nullable=False)  # Serialized JSON storing service details for the appointment
    total_service_time = db.Column(db.Integer, nullable=False)  # Total time for all services in minutes
    num_services = db.Column(db.Integer, nullable=False)  # Total number of services in the appointment
    status = db.Column(db.String(20), nullable=False)  # Status of the appointment (e.g., 'Pending', 'Completed')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(MOSCOW_TZ), nullable=False)  # Timestamp for appointment creation
    report_details = db.Column(db.Text, nullable=True)  # Optional report details for the appointment
    cancellation_reason = db.Column(db.Text, nullable=True)  # Reason for cancellation if applicable
    rejection_reason = db.Column(db.Text, nullable=True)  # Reason for rejection if applicable

    # Relationship with the BusinessOwner
    owner = db.relationship('BusinessOwner', backref=db.backref('appointments', lazy=True))

# Model representing a client's request to change an existing appointment
# - Stores the requested changes such as new services or times.
class RequestChange(db.Model):
    __tablename__ = 'request_change'
    id = db.Column(db.Integer, primary_key=True)  # Unique identifier for the request
    appointment_id = db.Column(db.Integer, db.ForeignKey('appointment.id'), nullable=False)  # Foreign key linking to the Appointment
    client_name = db.Column(db.String(100), nullable=False)  # Client's name requesting the change
    phone_number = db.Column(db.String(15), nullable=False)  # Client's phone number
    client_email = db.Column(db.String(100))  # Client's email address
    requested_date = db.Column(db.DateTime, nullable=True)  # Requested new date and time for the appointment
    requested_end_time = db.Column(db.DateTime, nullable=True)  # Requested new end time for the appointment
    requested_service = db.Column(db.Text, nullable=True)  # Serialized JSON storing requested services
    requested_total_service_time = db.Column(db.Integer, nullable=True)  # Total service time requested in minutes
    requested_num_services = db.Column(db.Integer, nullable=True)  # Number of services requested
    status = db.Column(db.String(20), nullable=False, default='Pending')  # Status of the change request (e.g., 'Pending', 'Approved')
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(MOSCOW_TZ), nullable=False)  # Timestamp for request creation
    updated_at = db.Column(db.DateTime, onupdate=lambda: datetime.now(MOSCOW_TZ))  # Timestamp for the last update

    # Relationship with the Appointment
    appointment = db.relationship('Appointment', backref=db.backref('request_changes', lazy=True))

    # Initialization for the request change
    def __init__(self, appointment_id, client_name, phone_number, client_email=None,
                 requested_date=None, requested_end_time=None,
                 requested_service=None, requested_total_service_time=None,
                 requested_num_services=None):
        self.appointment_id = appointment_id
        self.client_name = client_name
        self.phone_number = phone_number
        self.client_email = client_email
        self.requested_date = requested_date
        self.requested_end_time = requested_end_time
        self.requested_service = requested_service
        self.requested_total_service_time = requested_total_service_time
        self.requested_num_services = requested_num_services
        self.status = 'Pending'
