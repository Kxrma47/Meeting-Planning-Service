from . import db
from datetime import datetime
import pytz

# Model representing the User, which includes personal and business details,
# contact information, registration status, services offered, and working hours.
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each user
    personal_name = db.Column(db.String(100), nullable=False)  # User's personal name
    company_name = db.Column(db.String(100), nullable=False)  # Business or company name
    store_address = db.Column(db.String(200), nullable=False)  # Store address for the business
    phone_number = db.Column(db.String(20), nullable=False)  # Contact phone number
    email = db.Column(db.String(100), unique=True, nullable=False)  # Unique email for the user
    status = db.Column(db.String(20), default='Pending', nullable=False)  # Registration status (e.g., Pending, Approved)
    services = db.relationship('Service', backref='user', lazy=True, cascade="all, delete-orphan")  # Related services
    working_hours = db.relationship('WorkingHours', backref='user', lazy=True, cascade="all, delete-orphan")  # Working hours
    otp = db.Column(db.String(6), nullable=True)  # OTP for user verification
    otp_expiry = db.Column(db.DateTime, nullable=True)  # Expiry time for the OTP
    otp_attempts = db.Column(db.Integer, default=0, nullable=False)  # Number of OTP attempts made by the user
    otp_hold_until = db.Column(db.DateTime, nullable=True)  # Hold time for OTP retries
    created_at = db.Column(db.DateTime, default=datetime.now, nullable=False)  # Timestamp for when the user was created

# Model representing a service offered by the user/business.
class Service(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each service
    title = db.Column(db.String(100), nullable=False)  # Name of the service
    cost = db.Column(db.Float, nullable=False)  # Cost of the service
    description = db.Column(db.String(500), nullable=False)  # Description of the service
    service_time = db.Column(db.Integer, nullable=False)  # Duration of the service in minutes
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)  # Reference to the user providing the service

# Model representing the working hours for a user/business.
class WorkingHours(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each working hours entry
    day = db.Column(db.String(10), nullable=False)  # Day of the week (e.g., Monday)
    start_time = db.Column(db.Time, nullable=False)  # Start time of working hours
    end_time = db.Column(db.Time, nullable=False)  # End time of working hours
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)  # Reference to the user

# Model representing an admin user for the system.
class Admin(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each admin
    username = db.Column(db.String(50), unique=True, nullable=False)  # Admin username
    password = db.Column(db.String(200), nullable=False)  # Hashed password for the admin

# Model for logging admin actions such as approvals, rejections, or other changes.
class AdminLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each log entry
    admin_id = db.Column(db.Integer, db.ForeignKey('admin.id', ondelete='CASCADE'), nullable=False)  # Reference to the admin performing the action
    action = db.Column(db.String(200), nullable=False)  # Description of the action performed by the admin
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Europe/Moscow')), nullable=False)  # Timestamp of the action

# Model representing the registration approval for a user.
class AcceptedRegistration(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each accepted registration
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)  # Reference to the user whose registration was approved
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Europe/Moscow')), nullable=False)  # Timestamp of approval
    comments = db.Column(db.String(500), nullable=True)  # Additional comments or notes on the approval

# Model representing the rejection of a registration.
class RejectedRegistration(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each rejected registration
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)  # Reference to the rejected user
    comments = db.Column(db.String(500), nullable=False)  # Reason for rejection
    timestamp = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Europe/Moscow')), nullable=False)  # Timestamp of the rejection

# Model logging admin login events.
class AdminLoginEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each login event
    admin_id = db.Column(db.Integer, db.ForeignKey('admin.id', ondelete='CASCADE'), nullable=False)  # Reference to the admin who logged in
    login_time = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Europe/Moscow')), nullable=False)  # Timestamp of login

# Model logging admin logout events.
class AdminLogoutEvent(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each logout event
    admin_id = db.Column(db.Integer, db.ForeignKey('admin.id', ondelete='CASCADE'), nullable=False)  # Reference to the admin who logged out
    logout_time = db.Column(db.DateTime, default=lambda: datetime.now(pytz.timezone('Europe/Moscow')), nullable=False)  # Timestamp of logout

# Model representing the deletion of an approved account.
class DeletedApprovedAccount(db.Model):
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each deleted account entry
    user_id = db.Column(db.Integer, db.ForeignKey('user.id', ondelete='CASCADE'), nullable=False)  # Reference to the user whose account was deleted
    admin_id = db.Column(db.Integer, db.ForeignKey('admin.id', ondelete='CASCADE'), nullable=False)  # Reference to the admin who performed the deletion
    deletion_time = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(pytz.timezone('Europe/Moscow')))  # Timestamp of deletion
    comments = db.Column(db.String(500), nullable=False)  # Reason for account deletion

# Model for storing contact messages submitted via the contact form.
class ContactMessage(db.Model):
    __tablename__ = 'contact_messages'
    id = db.Column(db.Integer, primary_key=True)  # Unique ID for each message
    name = db.Column(db.String(100), nullable=False)  # Name of the person submitting the message
    email = db.Column(db.String(120), nullable=False)  # Email address of the person submitting the message
    message = db.Column(db.Text, nullable=False)  # The actual message content
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # Timestamp of when the message was created
    responded = db.Column(db.Boolean, default=False)  # Indicates whether the message has been responded to

    def __repr__(self):
        return f'<ContactMessage {self.email}>'  # Representation of the message for debugging purposes
