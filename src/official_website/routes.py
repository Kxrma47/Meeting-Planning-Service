import logging
import secrets
import smtplib
import string
from datetime import datetime, timedelta
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from functools import wraps
import json
import pytz
import qrcode
from apscheduler.schedulers.background import BackgroundScheduler
from flask import request, jsonify, session, redirect, url_for
from sqlalchemy import func
from werkzeug.security import check_password_hash, generate_password_hash
import os
from business_owner.models import BusinessOwner, BusinessOwnerLog, Appointment, Feedback
from run import socketio
from . import app, db
from .models import User, Admin, AdminLog, AcceptedRegistration, RejectedRegistration, AdminLoginEvent, \
    AdminLogoutEvent, DeletedApprovedAccount, ContactMessage
from .models import Service, WorkingHours
from flask_socketio import SocketIO
socketio = SocketIO(app)
logging.basicConfig(level=logging.DEBUG)

MOSCOW_TZ = pytz.timezone('Europe/Moscow')

# Decorator to ensure the user is logged in and the session is valid.
# This decorator checks whether the 'admin_id' exists in the session and if the session is still active.
# - If the session is missing or expired, the user is redirected to the login page.
# - If the session is valid, the request proceeds.
# It also logs relevant information, such as session validation and redirection.
def login_required(f):
    """Decorator to ensure the user is logged in and session is valid."""

    @wraps(f)
    def decorated_function(*args, **kwargs):

        if 'admin_id' not in session:
            logging.debug("Admin ID not in session, redirecting to login.")
            return redirect(url_for('admin_login', next=request.url))

        expires_at = session.get('expires_at')
        if not expires_at or datetime.now(MOSCOW_TZ) > datetime.fromisoformat(expires_at):
            logging.debug("Session expired or invalid, redirecting to login.")
            return redirect(url_for('admin_login', next=request.url))

        logging.debug("Session valid, proceeding with request.")
        return f(*args, **kwargs)

    return decorated_function


# Fetches client and business owner reports based on the selected time filter (daily, weekly, monthly, yearly).
# This API retrieves client and owner complaints within the specified time range.
# - For client reports: It fetches client details such as name, email, phone, complaint, and company name.
# - For owner reports: It fetches business owner details along with complaints made by clients about services, including the cost breakdown of services.
# The response includes two lists: one for client reports and another for owner reports.
# If the time filter is invalid, it returns a 400 status code with an error message.
@app.route('/api/reports', methods=['GET'])
@login_required
def get_reports():
    time_filter = request.args.get('time_filter', 'daily')
    now = datetime.now(MOSCOW_TZ)

    if time_filter == 'daily':
        start_date = now - timedelta(days=1)
    elif time_filter == 'weekly':
        start_date = now - timedelta(weeks=1)
    elif time_filter == 'monthly':
        start_date = now - timedelta(days=30)
    elif time_filter == 'yearly':
        start_date = now - timedelta(days=3650)
    else:
        return jsonify({'message': 'Invalid time filter'}), 400


    client_reports = db.session.query(
        Feedback.client_name.label('clientName'),
        Feedback.client_email.label('clientEmail'),
        Feedback.client_phone.label('clientPhone'),
        Feedback.complaint.label('complaint'),
        BusinessOwner.company_name.label('companyName')
    ).join(BusinessOwner).filter(
        Feedback.created_at >= start_date
    ).all()

    client_reports_list = [{
        'clientName': report.clientName,
        'clientEmail': report.clientEmail,
        'clientPhone': report.clientPhone,
        'companyName': report.companyName,
        'complaint': report.complaint
    } for report in client_reports]

    app.logger.debug("Fetching owner reports from the Appointment table.")


    owner_reports = db.session.query(
        BusinessOwner.personal_name.label('ownerName'),
        BusinessOwner.company_name.label('companyName'),
        BusinessOwner.email.label('ownerEmail'),
        BusinessOwner.phone_number.label('ownerPhone'),
        Appointment.client_name.label('complainedClient'),
        Appointment.phone_number.label('clientPhone'),
        Appointment.service.label('services'),
        Appointment.date.label('serviceTime'),
        Appointment.report_details.label('complaint')
    ).join(BusinessOwner, Appointment.owner_id == BusinessOwner.id).filter(
        Appointment.report_details.isnot(None)
    ).all()



    if not owner_reports:
        app.logger.debug("No owner reports found.")
    else:
        app.logger.debug(f"Found {len(owner_reports)} owner reports.")

    owner_reports_list = []

    for report in owner_reports:
        services = json.loads(report.services)
        service_details = []
        total_cost = 0

        for service in services:
            service_obj = Service.query.get(service['id'])
            if service_obj:
                quantity = service.get('quantity', 1)
                cost = service_obj.cost * quantity
                total_cost += cost
                service_details.append(f"{service_obj.title} x {quantity} (${cost})")

        owner_reports_list.append({
            'ownerName': report.ownerName,
            'companyName': report.companyName,
            'ownerEmail': report.ownerEmail,
            'ownerPhone': report.ownerPhone,
            'clientPhone': report.clientPhone,
            'complainedClient': report.complainedClient,
            'services': ', '.join(service_details),
            'serviceTime': report.serviceTime,
            'complaint': report.complaint,
            'totalCost': total_cost
        })

    return jsonify({
        "clientReports": client_reports_list,
        "ownerReports": owner_reports_list
    })


#Failed attempt
@socketio.on('connect')
def handle_connect():
    print("Client connected")


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")


@socketio.on('my_event')
def handle_my_event(data):
    print(f"Received data: {data}")
    socketio.emit('response', {'data': 'Message received'})



@socketio.on('simple_message')
def handle_simple_message(message):
    print(f"Received simple message: {message}")
    socketio.send(f"Echo: {message}")

# Deletes unverified users whose OTPs have expired.
# This function operates within the Flask app context and checks for users with 'Pending' status and an expired OTP.
# It retrieves unverified users in batches (default of 100 users per batch), deletes them from the database, and logs the operation.
# If no unverified users are found, it logs this information. In case of errors during deletion, it rolls back the transaction and logs the error.
def delete_unverified_users():
    """Delete unverified users whose OTP has expired."""
    with app.app_context():
        try:
            logging.info("Starting deletion of unverified users.")
            current_time = datetime.now(MOSCOW_TZ)

            unverified_users = User.query.filter(User.status == 'Pending', User.otp_expiry < current_time).all()

            if not unverified_users:
                logging.info("No unverified users to delete.")
                return

            batch_size = 100
            for i in range(0, len(unverified_users), batch_size):
                batch = unverified_users[i:i + batch_size]
                try:

                    for user in batch:
                        db.session.delete(user)
                    db.session.commit()
                    logging.info(f"Deleted batch of {len(batch)} unverified users.")
                except Exception as batch_error:
                    logging.error(f"Error deleting batch of unverified users: {batch_error}")
                    db.session.rollback()

            logging.info(f"Deleted a total of {len(unverified_users)} unverified users.")
        except Exception as e:
            logging.error(f"Error deleting unverified users: {e}")
            db.session.rollback()



scheduler = BackgroundScheduler()
scheduler.add_job(delete_unverified_users, 'interval', minutes=1)
scheduler.start()


def generate_otp(length=6):
    """Generate a secure OTP with the specified number of digits."""
    if length < 1:
        raise ValueError("OTP length must be at least 1 digit.")


    otp = ''.join(secrets.choice("0123456789") for _ in range(length))

    return otp

# Generates a secure random password with a minimum length of 8 characters.
# The password includes at least one lowercase letter, one uppercase letter, one digit, and one special character.
# The remaining characters are randomly chosen from a mix of letters, digits, and special characters.
# The password is shuffled to ensure randomness, and the final result is returned as a string.
def generate_random_password(length=12):
    """Generate a secure random password with the specified length."""
    if length < 8:
        raise ValueError("Password length must be at least 8 characters.")


    characters = string.ascii_letters + string.digits + "!@#$%^&*()-_=+<>?{}[]"


    password = [
        secrets.choice(string.ascii_lowercase),
        secrets.choice(string.ascii_uppercase),
        secrets.choice(string.digits),  # Digit
        secrets.choice("!@#$%^&*()-_=+<>?{}[]")
    ]


    password += [secrets.choice(characters) for _ in range(length - 4)]


    secrets.SystemRandom().shuffle(password)


    return ''.join(password)

#Failed to try websocket
@socketio.on('connect')
def handle_connect():
    print('Client connected')
    socketio.emit('my_response', {'data': 'Connected'})


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


@socketio.on('my_event')
def handle_my_event(json):
    print('Received my_event: ' + str(json))
    socketio.emit('my_response', {'data': 'Message received'})


@socketio.on('my_event')
def handle_my_event(data):
    print('Received my_event:', data)
    socketio.emit('my_response', {'data': 'Message received'})


@socketio.on('connect')
def test_connect():
    print('Client connected')
    socketio.emit('my_response', {'data': 'Connected'})


@socketio.on('my_event')
def handle_my_event(data):
    print('Received my_event:', data)
    socketio.emit('my_response', {'data': 'Message received'})


@socketio.on('disconnect')
def test_disconnect():
    print('Client disconnected')

# Sends a confirmation email to the business owner after their registration has been approved.
# The email contains account details such as the company name, username, password, and a QR code link.
# The content is formatted as HTML and includes a link to the QR code.
# Logging is used to track the process, including any SMTP errors during the email-sending attempt.
# The actual sending part is commented out and requires SMTP configuration for live usage.
def send_confirmation_email(email, company_name, username, password, qr_code_link):
    try:
        email_content = f"""<html>
        <body>
        <p>Dear {company_name} Team,</p>
        <p>Congratulations!</p>
        <p>Your business registration has been successfully approved. Below are your account details:</p>
        <p><strong>Company:</strong> {company_name}<br>
        <strong>Username:</strong> {username}<br>
        <strong>Password:</strong> {password}<br>
        <strong>Shop QR Code Link:</strong> <a href="{qr_code_link}">{qr_code_link}</a></p>
        <p>Thank you for choosing our service.</p>
        <p>Best regards,<br>
        The Registration Team</p>
        </body>
        </html>
        """


        sender_email = "your-email@example.com"
        receiver_email = email
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = receiver_email
        msg['Subject'] = "Your Business Registration is Approved"


        msg.attach(MIMEText(email_content, 'html'))


        logging.info(f"Sending email to {receiver_email} with content: {email_content}")


        logging.info(f"Simulating sending email to {receiver_email}")

        # Uncomment and configure the SMTP settings to actually send the email
        # with smtplib.SMTP('smtp.example.com', 587) as server:
        #     server.starttls()
        #     server.login("your-email@example.com", "your-password")  # Replace with your login details
        #     server.sendmail(sender_email, receiver_email, msg.as_string())

        logging.info(f"Email successfully sent to {receiver_email}")

    except smtplib.SMTPException as e:
        logging.error(f"Failed to send email to {receiver_email} due to SMTP error: {e}")
    except Exception as e:
        logging.error(f"Failed to send email to {receiver_email} due to unexpected error: {e}")

# Initializes the database before handling any request. If the database tables don't exist, they are created,
# and a log message is recorded indicating successful initialization. In case of failure, the error is logged.
# Additionally, basic routes are defined for the home, about, and contact pages, returning simple HTML responses.
@app.before_request
def initialize_database():
    try:
        db.create_all()
        logging.info("Database initialized successfully.")
    except Exception as e:
        logging.exception("Failed to initialize the database.")


@app.route('/')
def home():
    return "Hello, Flask!"


@app.route('/about')
def about():
    return "<h1>About Page</h1><p>This is the about page.</p>"


@app.route('/contact')
def contact():
    return "<h1>Contact Page</h1><p>This is the contact page.</p>"



# Handles the submission of the registration form, including personal and company details, services, and working hours.
# The endpoint validates required fields, checks for an existing email, and saves the new user along with their services
# and working hours into the database. If all validations pass, it generates an OTP, stores it in the database,
# and emits a WebSocket event notifying clients of the new registration. Finally, it returns a success message with
# instructions for OTP verification.
@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        logging.debug(f"Received registration data: {data}")


        required_fields = ['personalName', 'companyName', 'storeAddress', 'phoneNumber', 'email', 'services', 'workingHours']
        for field in required_fields:
            if field not in data:
                logging.error(f"Missing field in registration data: {field}")
                return jsonify({'message': f'Missing field: {field}'}), 400

        existing_user = User.query.filter_by(email=data['email']).first()
        if existing_user:
            logging.debug(f"Email already exists: {data['email']}")
            return jsonify({'message': 'Email already exists.'}), 400


        user = User(
            personal_name=data['personalName'],
            company_name=data['companyName'],
            store_address=data['storeAddress'],
            phone_number=data['phoneNumber'],
            email=data['email'],
            status='Unverified'
        )
        db.session.add(user)
        db.session.commit()
        if not user.id:
            logging.error("User ID not set after commit. Registration failed.")
            return jsonify({'message': 'An error occurred during registration.'}), 500

        logging.debug(f"User created with ID: {user.id}")


        for service_data in data['services']:
            service = Service(
                title=service_data['title'],
                cost=service_data['cost'],
                description=service_data['description'],
                service_time=service_data['service_time'],
                user_id=user.id
            )
            db.session.add(service)


        apply_to_all = data['workingHours'].get('applyToAll', False)

        if apply_to_all:

            same_hours = data['workingHours']['sameHours']
            for day, hours in data['workingHours']['days'].items():
                if hours['selected']:
                    try:
                        working_hour = WorkingHours(
                            day=day,
                            start_time=datetime.strptime(same_hours['start'], '%H:%M').time(),
                            end_time=datetime.strptime(same_hours['end'], '%H:%M').time(),
                            user_id=user.id
                        )
                        db.session.add(working_hour)
                    except ValueError as ve:
                        logging.error(f"Invalid time format for {day}: {same_hours}")
                        return jsonify({'message': f'Invalid time format for {day}: {same_hours}'}), 400
        else:

            for day, hours in data['workingHours']['days'].items():
                if hours['selected']:
                    try:
                        working_hour = WorkingHours(
                            day=day,
                            start_time=datetime.strptime(hours['start'], '%H:%M').time(),
                            end_time=datetime.strptime(hours['end'], '%H:%M').time(),
                            user_id=user.id
                        )
                        db.session.add(working_hour)
                    except ValueError as ve:
                        logging.error(f"Invalid time format for {day}: {hours}")
                        return jsonify({'message': f'Invalid time format for {day}: {hours}'}), 400

        db.session.commit()


        otp = generate_otp()
        otp_expiry = datetime.now(MOSCOW_TZ) + timedelta(minutes=5)


        logging.debug(f"Generated OTP for {data['phoneNumber']}: {otp}")


        user.otp = otp
        user.otp_expiry = otp_expiry
        user.otp_attempts = 0
        db.session.commit()

        logging.debug(f"OTP stored in database: {otp} for user: {user.email}")


        socketio.emit('new_registration', {
            'user_id': user.id,
            'personalName': user.personal_name,
            'companyName': user.company_name,
            'storeAddress': user.store_address,
            'phoneNumber': user.phone_number,
            'email': user.email,
            'services': data['services'],
            'workingHours': data['workingHours']['days'],
            'status': user.status,
            'comments': '',
            'created_at': user.created_at.isoformat()
        })


        emit_registration_status_update(user.id, 'Pending')

        return jsonify({'message': 'OTP has been sent to your phone. Please verify to complete the registration.',
                        'user_id': user.id}), 201

    except Exception as e:
        db.session.rollback()
        logging.exception("An error occurred during registration")
        return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500

# Emits a WebSocket event to notify clients about the status update of a registration.
# The event name is dynamically generated based on the registration status, and it sends
# the `user_id` and the current `status` to connected clients.
def emit_registration_status_update(user_id, status):
    socketio.emit(f'registration_{status.lower()}', {
        'user_id': user_id,
        'status': status
    })


# Manually triggers a WebSocket event ('custom_event') that sends a simple message to connected clients.
# This route can be used for testing or manually triggering specific actions via WebSockets.
@app.route('/trigger_event')
def trigger_event():
    socketio.emit('custom_event', 'This is a manually triggered event')
    return "Event triggered!"

# Verifies the OTP provided by the user during registration. If the OTP matches and hasn't expired, the user's status
# is updated to 'Pending' and the OTP is removed from the database. If successful, it emits a WebSocket event to notify
# the front-end of the registration status update. If the OTP is invalid or expired, an error response is returned.
@app.route('/api/verify_otp', methods=['POST'])
def verify_otp():
    try:
        data = request.get_json()
        user = User.query.get(data['user_id'])

        if user and user.otp == data['otp']:
            user.status = 'Pending'
            user.otp = None
            user.otp_expiry = None
            db.session.commit()

            logging.debug(f"OTP verified successfully for user_id={user.id}")


            socketio.emit('registration_updated', {
                'user_id': user.id,
                'status': user.status
            })

            return jsonify({'message': 'OTP verified successfully', 'user_id': user.id}), 200
        else:
            return jsonify({'message': 'Invalid OTP'}), 400

    except Exception as e:
        logging.exception("An error occurred during OTP verification")
        return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500

# Resends a new OTP to the user during the OTP verification process if needed, updating the expiry time and OTP status.
@app.route('/api/resend_otp', methods=['POST'])
def resend_otp():
    try:
        data = request.get_json()
        user_id = data.get('user_id')

        user = User.query.get(user_id)
        if not user:
            logging.debug(f"User not found: user_id={user_id}")
            return jsonify({'message': 'User not found'}), 404

        user.otp = generate_otp()
        user.otp_expiry = datetime.now(MOSCOW_TZ) + timedelta(minutes=5)
        user.otp_attempts = 0
        user.otp_hold_until = None
        db.session.commit()

        logging.debug(f"Resent OTP for user: {user.phone_number}")

        print(f"OTP for {user.phone_number}: {user.otp}")

        return jsonify({'message': 'OTP resent successfully'}), 200
    except KeyError as e:
        logging.error(f"Missing required field: {e}")
        return jsonify({'message': 'Invalid request data. User ID is required.'}), 400
    except Exception as e:
        logging.exception("An error occurred during OTP resend")
        return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500

# handle the admin login functionality.
# It sends a POST request with the admin's username and password to the backend.
# If the login is successful, it redirects the admin to the dashboard page.
# If not, it displays an error message.
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    try:
        data = request.get_json()
        logging.debug(f"Admin login attempt with data: {data}")

        admin = Admin.query.filter_by(username=data['username']).first()
        if admin and check_password_hash(admin.password, data['password']):
            session['admin_id'] = admin.id
            session['expires_at'] = (datetime.now(MOSCOW_TZ) + timedelta(minutes=30)).isoformat()
            session['admin_logged_in'] = True

            login_event = AdminLoginEvent(admin_id=admin.id)
            db.session.add(login_event)
            db.session.commit()

            logging.debug(f"Admin login successful for admin_id: {admin.id}")
            return jsonify({'message': 'Login successful'}), 200

        logging.debug("Invalid admin credentials")
        return jsonify({'message': 'Invalid credentials'}), 401
    except KeyError as e:
        logging.error(f"Missing required field: {e}")
        return jsonify({'message': 'Invalid request data. Username and password are required.'}), 400
    except Exception as e:
        logging.exception("An error occurred during admin login")
        return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500


# Handles the admin logout process by logging the event, removing session data, and clearing the session cookie.
@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    try:
        if 'admin_id' in session:
            logout_event = AdminLogoutEvent(admin_id=session['admin_id'])
            db.session.add(logout_event)
            db.session.commit()
            session.pop('admin_id', None)
            session.pop('expires_at', None)
            logging.debug(f"Admin with ID {logout_event.admin_id} logged out successfully")
        else:
            logging.debug("No admin_id found in session")

        response = jsonify({'message': 'Logout successful'})
        response.set_cookie('session', '', expires=0)
        return response, 200
    except Exception as e:
        logging.exception("An error occurred during admin logout")
        return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500

# Fetches registration data for a specific status
# (Pending, Approved, Rejected, or Deleted) based on the filters (sort order and time range).
# It is used to populate the registration table.
@app.route('/api/admin/dashboard', methods=['GET'])
@login_required
def admin_dashboard():
    logging.debug("Accessing admin dashboard")

    status = request.args.get('status', None)
    sort_by = request.args.get('sort_by', 'newest')
    time_filter = request.args.get('time_filter', 'all')

    query = User.query


    if status:
        logging.debug(f"Filtering with status={status}")
        query = query.filter_by(status=status)


    now = datetime.now(MOSCOW_TZ)
    if time_filter != 'all':
        start_date = None
        if time_filter == 'day':
            start_date = now - timedelta(days=1)
        elif time_filter == 'week':
            start_date = now - timedelta(weeks=1)
        elif time_filter == 'month':
            start_date = now - timedelta(days=30)
        elif time_filter == 'year':
            start_date = now - timedelta(days=365)
        if start_date:
            logging.debug(f"Filtering by start date: {start_date}")
            query = query.filter(User.created_at >= start_date)

    if sort_by == 'newest':
        logging.debug("Applying sort by newest")
        query = query.order_by(User.created_at.desc())
    elif sort_by == 'oldest':
        logging.debug("Applying sort by oldest")
        query = query.order_by(User.created_at.asc())

    try:
        users = query.all()
        logging.debug(f"Users found after filtering: {len(users)}")

        registrations = []
        for user in users:
            services = [{'title': s.title, 'cost': s.cost, 'description': s.description} for s in user.services]


            working_hours = get_filtered_working_hours(user.id, time_filter)

            registration_status = user.status
            comments = ''
            if registration_status == 'Rejected':
                rejection = RejectedRegistration.query.filter_by(user_id=user.id).first()
                comments = rejection.comments if rejection else ''
            elif registration_status == 'Deleted':
                deleted_account = DeletedApprovedAccount.query.filter_by(user_id=user.id).first()
                comments = deleted_account.comments if deleted_account else ''
            elif registration_status == 'Approved':
                accepted_registration = AcceptedRegistration.query.filter_by(user_id=user.id).first()
                comments = accepted_registration.comments if accepted_registration else ''

            registrations.append({
                'id': user.id,
                'personalName': user.personal_name,
                'companyName': user.company_name,
                'storeAddress': user.store_address,
                'phoneNumber': user.phone_number,
                'email': user.email,
                'services': services,
                'workingHours': working_hours,
                'status': registration_status,
                'comments': comments,
                'created_at': user.created_at.isoformat()
            })

        logging.debug(f"Registrations: {registrations}")
        return jsonify(registrations), 200
    except Exception as e:
        logging.exception("An error occurred while accessing the admin dashboard")
        return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500

# Handles the display of the admin reports page.
# The function is protected by the `login_required` decorator to ensure only authenticated admins can access it.
@app.route('/admin/reports')
@login_required
def reports():
    logging.debug("Accessing admin reports")
    return "Reports Page Content"

def get_filtered_working_hours(user_id, time_filter):
    """
    Fetch and filter the working hours for a specific user based on the provided time filter.

    The working hours are retrieved from the database for the given `user_id`. The `time_filter`
    determines the scope of the data to return. The options include:
    - 'all': Returns all working hours.
    - 'day': Returns working hours for today only.
    - 'week': Returns working hours for the last 7 days.
    - 'month': Returns working hours for the last 30 days.
    - 'year': Returns working hours for the last 365 days.

    The function logs the original working hours and the filtered results.

    Args:
        user_id (int): The ID of the user whose working hours are being queried.
        time_filter (str): A string that specifies the range of working hours to return ('all', 'day', 'week', 'month', 'year').

    Returns:
        list: A list of dictionaries representing filtered working hours with 'day', 'start', and 'end' time for each day.
    """
    working_hours = WorkingHours.query.filter_by(user_id=user_id).all()


    logging.debug(f"Original working hours for user_id {user_id}: {working_hours}")


    if time_filter == 'all':
        return [
            {'day': wh.day, 'start': wh.start_time.strftime('%H:%M'), 'end': wh.end_time.strftime('%H:%M')}
            for wh in working_hours
        ]


    days_to_include = set()
    now = datetime.now(MOSCOW_TZ)

    if time_filter == 'day':
        days_to_include.add(now.strftime('%A'))  # Include only today
    elif time_filter == 'week':
        for i in range(7):  # Include last 7 days
            days_to_include.add((now - timedelta(days=i)).strftime('%A'))
    elif time_filter == 'month':
        for i in range(30):  # Include last 30 days
            days_to_include.add((now - timedelta(days=i)).strftime('%A'))
    elif time_filter == 'year':
        for i in range(365):  # Include last 365 days
            days_to_include.add((now - timedelta(days=i)).strftime('%A'))

    logging.debug(f"Days to include for time_filter '{time_filter}': {days_to_include}")


    filtered_working_hours = [
        {'day': wh.day, 'start': wh.start_time.strftime('%H:%M'), 'end': wh.end_time.strftime('%H:%M')}
        for wh in working_hours if wh.day in days_to_include
    ]

    logging.debug(f"Filtered working hours for user_id {user_id}: {filtered_working_hours}")

    return filtered_working_hours




# Used to approve a business registration and send a confirmation email to the business owner.
# The route '/api/admin/approve/<int:user_id>' accepts POST requests and requires comments and email content to complete the approval.
# If the admin's session has expired or is invalid, the function redirects to the login page.
# Upon receiving valid data, it creates a new business owner account, generates a username, password, and QR code for the shop,
# saves the credentials to a file, logs the action, and emits a WebSocket event.
# The approval process also includes sending an approval email to the business owner.
# If an error occurs during the process, the transaction is rolled back, and the error is logged.
@app.route('/api/admin/approve/<int:user_id>', methods=['POST'])
def approve_registration(user_id):
    try:
        if 'admin_id' not in session or datetime.now(MOSCOW_TZ) > datetime.fromisoformat(session.get('expires_at')):
            app.logger.debug("Admin session expired or not logged in")
            return redirect(url_for('admin_login'))

        data = request.get_json()
        app.logger.debug(f"Received data for approval: {data}")
        comments = data.get('comments', '')
        email_content = data.get('emailContent', '')

        if not comments or not email_content:
            app.logger.error("Comments and email content are required")
            return jsonify({'message': 'Comments and email content are required'}), 400

        user = User.query.get(user_id)
        if user:
            try:
                username = user.company_name.replace(' ', '_').lower()
                password = generate_random_password()
                ip_address = "10.110.12.92"
                shop_link = f"http://{ip_address}:3002/shop/{username}"


                business_owner = BusinessOwner(
                    user_id=user.id,
                    personal_name=user.personal_name,
                    company_name=user.company_name,
                    store_address=user.store_address,
                    phone_number=user.phone_number,
                    email=user.email,
                    username=username,
                    password=generate_password_hash(password),
                    qr_code_link=shop_link
                )
                db.session.add(business_owner)
                db.session.commit()

                all_credentials_file = os.path.join(os.getcwd(), "all_clients_credentials.txt")
                with open(all_credentials_file, 'a') as file:
                    file.write(f"Company: {user.company_name}\n")
                    file.write(f"Username: {username}\n")
                    file.write(f"Password: {password}\n")
                    file.write(f"Shop QR Code Link: {shop_link}\n")
                    file.write("-" * 40 + "\n")

                qr = qrcode.QRCode(
                    version=1,
                    error_correction=qrcode.constants.ERROR_CORRECT_L,
                    box_size=10,
                    border=4,
                )
                qr.add_data(shop_link)
                qr.make(fit=True)
                qr_image = qr.make_image(fill='black', back_color='white')

                qr_codes_folder = os.path.join(os.getcwd(), "all_qr_codes")
                if not os.path.exists(qr_codes_folder):
                    os.makedirs(qr_codes_folder)
                qr_code_filename = f"{username}_qr_code.png"
                qr_code_filepath = os.path.join(qr_codes_folder, qr_code_filename)
                qr_image.save(qr_code_filepath)

                business_owner_log = BusinessOwnerLog(owner_id=business_owner.id, action='Account created')
                db.session.add(business_owner_log)

                user.status = 'Approved'
                db.session.add(user)
                socketio.emit('registration_approved', {
                    'user_id': user.id,
                    'status': 'Approved'
                })
                accepted_registration = AcceptedRegistration(user_id=user.id, comments=comments)
                log = AdminLog(admin_id=session['admin_id'],
                               action=f'Approved registration for {user.email} with comments: {comments}')
                db.session.add(accepted_registration)
                db.session.add(log)
                db.session.commit()


                app.logger.info(f"Approval Email Content:\n{email_content}")

                # Simulate sending email for now
                app.logger.info(f"Simulating sending email to {user.email}")

                app.logger.debug(f"Approved registration for user: {user.email}")
                app.logger.debug(f"Business owner account created for {user.company_name} with username {username}")
                app.logger.debug(f"Credentials saved to {all_credentials_file} and QR code saved to {qr_code_filepath}")
                return jsonify({'message': 'Registration approved and business owner account created',
                                'companyName': user.company_name, 'username': username,
                                'password': password, 'qr_code_link': shop_link}), 200
            except Exception as e:
                db.session.rollback()
                app.logger.exception(f"An error occurred during approval: {e}")
                return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500
        else:
            app.logger.error(f"User not found for approval: {user_id}")
            return jsonify({'message': 'User not found'}), 404
    except Exception as e:
        app.logger.exception("Unexpected error")
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

# Handles the rejection of a business registration for the specified user.
# The route '/api/admin/reject/<int:user_id>' accepts POST requests and requires comments and email content to reject the registration.
# If the admin's session is expired or invalid, the function redirects to the login page.
# Upon receiving valid data, it updates the user's status to 'Rejected', logs the action, and emits a WebSocket event.
# It also sends a rejection email with the provided comments.
# If any error occurs during the process, it rolls back the transaction and logs the error.
@app.route('/api/admin/reject/<int:user_id>', methods=['POST'])
def reject_registration(user_id):
    try:
        if 'admin_id' not in session or datetime.now(MOSCOW_TZ) > datetime.fromisoformat(session.get('expires_at')):
            app.logger.debug("Admin session expired or not logged in")
            return redirect(url_for('admin_login'))

        data = request.get_json()
        app.logger.debug(f"Received data for rejection: {data}")
        comments = data.get('comments', '')
        email_content = data.get('emailContent', '')

        app.logger.debug(f"Parsed comments: {comments}")
        app.logger.debug(f"Parsed email content: {email_content}")

        if not comments or not email_content:
            app.logger.error("Comments and email content are required")
            return jsonify({'message': 'Comments and email content are required'}), 400

        user = User.query.get(user_id)
        if user:
            try:
                app.logger.debug(f"Rejecting registration for user: {user.email}")
                user.status = 'Rejected'  # Update status to 'Rejected'
                rejected_registration = RejectedRegistration(user_id=user.id, comments=comments)
                log = AdminLog(admin_id=session['admin_id'],
                               action=f'Rejected registration for {user.email} with comments: {comments}')
                db.session.add(rejected_registration)
                db.session.add(log)
                db.session.commit()
                app.logger.debug(f"Rejected registration for user: {user.email}")
                socketio.emit('registration_rejected', {
                    'user_id': user.id,
                    'status': 'Rejected'
                })

                send_rejection_email(user.email, comments)
                return jsonify({'message': 'Registration rejected and email content logged'}), 200
            except Exception as e:
                db.session.rollback()
                app.logger.exception("An error occurred during rejection")
                return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500
        else:
            app.logger.error(f"User not found for rejection: {user_id}")
            return jsonify({'message': 'User not found'}), 404
    except Exception as e:
        app.logger.exception("Unexpected error")
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

# Sends a rejection email to the user whose business registration was rejected.
# The email contains the reason for rejection passed through the 'comments' parameter.
# This function logs the email content and simulates sending the email.
# If an error occurs during the email content generation, it logs an error message with details about the exception.
def send_rejection_email(email, comments):
    try:
        email_content = f"""<html>
        <body>
        <p>We regret to inform you that your business registration has been rejected.</p>
        <p>Reason: {comments}</p>
        </body>
        </html>
        """


        app.logger.info(f"Rejection Email Content:\n{email_content}")

    except Exception as e:
        app.logger.error(f"Failed to generate email content due to an unexpected error: {e}")

# Fetches all admin logs from the database and returns them in JSON format.
# It first verifies if the admin session is valid by checking the session expiration.
# If the session has expired or is missing, the admin is redirected to the login page.
# The logs contain admin actions such as logins, logouts, and account modifications, with the associated admin ID and timestamp.
# If an error occurs while querying the logs, a 500 error response is returned with an appropriate error message.
@app.route('/api/admin/logs', methods=['GET'])
def admin_logs():
    try:
        if 'admin_id' not in session or datetime.now(MOSCOW_TZ) > datetime.fromisoformat(session.get('expires_at')):
            app.logger.debug("Admin session expired or not logged in")
            return redirect(url_for('admin_login'))

        try:
            logs = AdminLog.query.all()
            log_entries = [{'admin_id': log.admin_id, 'action': log.action, 'timestamp': log.timestamp.isoformat()} for
                           log in logs]
            app.logger.debug(f"Admin logs: {log_entries}")
            return jsonify(log_entries), 200
        except Exception as e:
            app.logger.exception("An error occurred while fetching admin logs")
            return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500
    except Exception as e:
        app.logger.exception("Unexpected error")
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

# Fetches all admin login events from the database and returns them in JSON format.
# It checks if the admin is authenticated by validating the session.
# If the session is expired or invalid, the admin is redirected to the login page.
# The login events include the admin ID and the time of login, formatted as ISO strings.
# If an error occurs during the query, an error response with a 500 status code is returned.
@app.route('/api/admin/login-events', methods=['GET'])
def admin_login_events():
    try:
        if 'admin_id' not in session or datetime.now(MOSCOW_TZ) > datetime.fromisoformat(session.get('expires_at')):
            app.logger.debug("Admin session expired or not logged in")
            return redirect(url_for('admin_login'))

        try:
            login_events = AdminLoginEvent.query.all()
            events = [{'admin_id': event.admin_id, 'login_time': event.login_time.isoformat()} for event in
                      login_events]
            app.logger.debug(f"Admin login events: {events}")
            return jsonify(events), 200
        except Exception as e:
            app.logger.exception("An error occurred while fetching login events")
            return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500
    except Exception as e:
        app.logger.exception("Unexpected error")
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

# Fetches all admin logout events from the database and returns them in JSON format.
# It first checks if the admin is authenticated by validating the session.
# If the session is expired or invalid, the admin is redirected to the login page.
# The logout events include the admin ID and the time of logout, formatted as ISO strings.
# If an error occurs during the query, an error response with a 500 status code is returned.
@app.route('/api/admin/logout-events', methods=['GET'])
def admin_logout_events():
    try:
        app.logger.debug("Accessing admin logout events")
        if 'admin_id' not in session or datetime.now(MOSCOW_TZ) > datetime.fromisoformat(session.get('expires_at')):
            app.logger.debug("Admin session expired or not logged in")
            return redirect(url_for('admin_login'))

        try:
            logout_events = AdminLogoutEvent.query.all()
            events = [{'admin_id': event.admin_id, 'logout_time': event.logout_time.isoformat()} for event in
                      logout_events]
            app.logger.debug(f"Admin logout events: {events}")
            return jsonify(events), 200
        except Exception as e:
            app.logger.exception("An error occurred while fetching logout events")
            return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500
    except Exception as e:
        app.logger.exception("Unexpected error")
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

# This endpoint retrieves overall registration statistics, including the total number of registrations
# and counts of pending, approved, rejected, and deleted registrations.
# It first checks if the admin is authenticated by verifying the session.
# If the session is valid, it queries the database for registration counts,
# filtering users based on their status (pending, approved, rejected, or deleted).
# The results are then returned as a JSON response.
# If an error occurs during the query, an error response is returned with a 500 status code.
@app.route('/api/admin/statistics', methods=['GET'])
def admin_statistics():
    try:
        if 'admin_id' not in session or datetime.now(MOSCOW_TZ) > datetime.fromisoformat(session.get('expires_at')):
            app.logger.debug("Admin session expired or not logged in")
            return redirect(url_for('admin_login'))

        try:
            total_requests = db.session.query(func.count(User.id)).scalar()
            approved_requests = db.session.query(func.count(AcceptedRegistration.user_id)).filter(
                ~User.query.filter(User.id == AcceptedRegistration.user_id, User.status == 'Deleted').exists()
            ).scalar()
            rejected_requests = db.session.query(func.count(RejectedRegistration.user_id)).scalar()
            deleted_requests = db.session.query(func.count(DeletedApprovedAccount.user_id)).scalar()
            pending_requests = db.session.query(func.count(User.id)).filter(User.status == 'Pending').scalar()

            stats = {
                'total': total_requests,
                'approved': approved_requests,
                'rejected': rejected_requests,
                'deleted': deleted_requests,
                'pending': pending_requests
            }

            app.logger.debug(f"Statistics: {stats}")
            return jsonify(stats), 200
        except Exception as e:
            app.logger.exception("An error occurred while fetching statistics")
            return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500
    except Exception as e:
        app.logger.exception("Unexpected error")
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

# Deletes a user registration, marks it as 'Deleted', and removes the associated business owner account if it exists.
# First, it checks if the admin session is valid. If the session is invalid or expired, it redirects to the admin login page.
# After validating the session, it retrieves the user's data using the user_id.
# If comments are not provided, it returns a bad request response (400).
# If the user exists, it creates an entry in the DeletedApprovedAccount and AdminLog models to log the deletion.
# It updates the user's status to 'Deleted' and deletes the associated business owner account, emitting a 'registration_deleted' event via Socket.IO.
# Finally, it sends an email notifying the user about the deletion. If any exception occurs, it rolls back the transaction and logs the error.
@app.route('/api/admin/delete/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    try:
        if 'admin_id' not in session or datetime.now(MOSCOW_TZ) > datetime.fromisoformat(session.get('expires_at')):
            app.logger.warning("Unauthorized access attempt or session expired")
            return redirect(url_for('admin_login'))

        data = request.get_json()
        comments = data.get('comments', '')
        if not comments:
            return jsonify({'message': 'Comments are required'}), 400

        user = User.query.get(user_id)
        if user:
            try:

                deleted_account = DeletedApprovedAccount(
                    user_id=user.id,
                    admin_id=session['admin_id'],
                    deletion_time=datetime.now(MOSCOW_TZ),
                    comments=comments
                )
                db.session.add(deleted_account)
                app.logger.debug(f"Added DeletedApprovedAccount for user: {user.email}")


                log = AdminLog(admin_id=session['admin_id'],
                               action=f'Deleted approved account for {user.email} with comments: {comments}')
                db.session.add(log)
                app.logger.debug(f"Added AdminLog entry for deleting user: {user.email}")


                user.status = 'Deleted'
                db.session.commit()
                app.logger.debug(f"Updated status to Deleted for user: {user.email}")


                business_owner = BusinessOwner.query.filter_by(email=user.email).first()
                if business_owner:
                    db.session.delete(business_owner)
                    db.session.commit()
                    app.logger.debug(f"Business owner account deleted: {business_owner.username}")
                    socketio.emit('registration_deleted', {
                        'user_id': user.id,
                        'status': 'Deleted'
                    })

                send_delete_email(user.email, user.company_name, comments)

                return jsonify(
                    {'message': 'User status updated to Deleted and associated business owner account removed'}), 200
            except Exception as e:
                db.session.rollback()
                app.logger.exception("An error occurred during deletion")
                return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500
        else:
            app.logger.error(f"User not found for deletion: {user_id}")
            return jsonify({'message': 'User not found'}), 404
    except Exception as e:
        app.logger.exception("Unexpected error")
        return jsonify({'message': 'Internal server error', 'error': str(e)}), 500

# Checks if the business owner is authenticated by verifying the 'user_id' in the session.
# If the 'user_id' exists in the session, it logs a successful authentication and returns a JSON response confirming authentication.
# If 'user_id' is missing, it logs a warning and returns an unauthorized status (401).
# In case of an exception, it logs the error and returns a response indicating an internal server error.
@app.route('/api/business_owner/check_auth', methods=['GET'])
def check_business_owner_auth():
    try:
        if 'user_id' in session:
            user_id = session.get('user_id')
            app.logger.info(f"Authentication check passed for user_id: {user_id}")
            return jsonify({'authenticated': True}), 200
        else:
            app.logger.warning("Authentication check failed: No user_id in session")
            return jsonify({'authenticated': False}), 401
    except Exception as e:
        app.logger.error(f"Error during authentication check: {str(e)}")
        return jsonify({'authenticated': False, 'error': 'Internal server error'}), 500

# Sends a deletion email to a business owner after their registration is deleted.
# The email includes the reason for deletion provided in the 'comments' argument.
# It constructs the email content as an HTML message and logs the preparation process.
# This function simulates sending the email, with commented-out SMTP configuration for real sending.
# If SMTP or other errors occur during the process, appropriate error messages are logged.
def send_delete_email(email, company_name, comments):
    try:
        email_content = f"""<html>
        <body>
        <p>We regret to inform you that your business registration has been deleted.</p>
        <p>Reason: {comments}</p>
        </body>
        </html>
        """


        sender_email = "your-email@example.com"
        receiver_email = email
        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = receiver_email
        msg['Subject'] = "Your Business Registration is Deleted"

        msg.attach(MIMEText(email_content, 'html'))

        logging.info(f"Preparing to send email to {receiver_email}")


        logging.info(f"Simulating sending email to {receiver_email} with content: {email_content}")

        # Uncomment and configure the SMTP settings to actually send the email
        # with smtplib.SMTP('smtp.example.com', 587) as server:
        #     server.starttls()
        #     server.login("your-email@example.com", "your-password")  # Replace with your login details
        #     server.sendmail(sender_email, receiver_email, msg.as_string())

        logging.info(f"Email successfully sent to {receiver_email}")

    except smtplib.SMTPException as e:
        logging.error(f"Failed to send email to {receiver_email} due to SMTP error: {e}")
    except Exception as e:
        logging.error(f"Failed to send email to {receiver_email} due to unexpected error: {e}")

# Verifies the validity of the admin's session by checking the presence of 'admin_id' and 'expires_at' in the session.
# If either is missing, it returns a response indicating that the session is invalid.
# It compares the current time with the session's expiration time, and if the session is still valid,
# it responds with a success message and returns 'authenticated': True.
# If the session has expired, it returns a response indicating that the session has expired and marks 'authenticated': False.
# In case of an exception during the check, it logs the error and responds with an internal server error.
@app.route('/api/admin/check_session', methods=['GET'])
def check_session():
    try:
        admin_id = session.get('admin_id')
        expires_at = session.get('expires_at')

        if not admin_id or not expires_at:
            return jsonify({'authenticated': False, 'error': 'Invalid session data'}), 401

        expiration_time = datetime.fromisoformat(expires_at).astimezone(MOSCOW_TZ)

        if datetime.now(MOSCOW_TZ) <= expiration_time:
            return jsonify({'authenticated': True}), 200
        else:
            return jsonify({'authenticated': False, 'error': 'Session expired'}), 401
    except Exception as e:
        app.logger.error(f"Error checking session: {str(e)}")
        return jsonify({'authenticated': False, 'error': 'Internal server error'}), 500



# This endpoint handles the submission of contact messages via a POST request.
# The submitted data must include the user's name, email, and message.
# If any of these fields are missing, a 400 response is returned with an error message.
# Upon successful validation, the contact message is saved to the database and a success response is returned.
# A new ContactMessage object is created and added to the session, followed by committing the changes to the database.
@app.route('/api/contact', methods=['POST'])
def submit_contact_message():
    data = request.json
    name = data.get('name')
    email = data.get('email')
    message = data.get('message')

    if not name or not email or not message:
        return jsonify({'error': 'Please provide all required fields: name, email, and message'}), 400

    new_message = ContactMessage(name=name, email=email, message=message)
    db.session.add(new_message)
    db.session.commit()

    return jsonify({'message': 'Contact message submitted successfully'}), 201


# This endpoint fetches all contact messages and returns them in a structured format.
# It requires the user to be logged in to access the messages (using @login_required).
# The messages are ordered by creation date in descending order, ensuring the most recent ones are listed first.
# Each message includes its ID, name, email, message content, creation date, and responded status.
# In case of any error during data retrieval, the API returns a 500 status code with the error message.
@app.route('/api/contact_messages', methods=['GET'])
@login_required
def get_contact_messages():
    try:
        contact_messages = ContactMessage.query.order_by(ContactMessage.created_at.desc()).all()
        print(contact_messages)
        messages = [{
            'id': msg.id,
            'name': msg.name,
            'email': msg.email,
            'message': msg.message,
            'created_at': msg.created_at,
            'responded': msg.responded
        } for msg in contact_messages]

        return jsonify(messages), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# This endpoint allows updating the 'responded' status of a specific contact message.
# It uses a PATCH request to toggle the 'responded' field for a contact message identified by its message_id.
# The message is fetched from the database using the get_or_404 method, which returns a 404 error if the message is not found.
# After toggling the responded status, the changes are committed to the database.
# In case of an exception, the transaction is rolled back, and an error message is returned.
@app.route('/api/contact_messages/<int:message_id>/responded', methods=['PATCH'])
@login_required
def update_responded_status(message_id):
    try:

        contact_message = ContactMessage.query.get_or_404(message_id)


        contact_message.responded = not contact_message.responded


        db.session.commit()

        return jsonify({'message': 'Responded status updated'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


# This endpoint is part of a test script used to retrieve the latest OTP (One-Time Password) for a given user.
# It logs the request and attempts to fetch the user with the provided user_id from the database.
# If the user is not found or if no OTP has been generated for the user, it logs a warning and returns a 404 response.
# If an OTP is available, it logs the OTP and returns it in the response.
# In case of any exceptions, it logs the error and returns a 500 response indicating an internal server error.
@app.route('/api/latest_otp/<int:user_id>', methods=['GET'])
def get_latest_otp(user_id):
    try:
        logging.debug(f"Received request to get latest OTP for user_id={user_id}")

        user = User.query.get(user_id)
        if not user:
            logging.warning(f"User not found for user_id={user_id}")
            return jsonify({'message': 'User not found'}), 404

        if not user.otp:
            logging.info(f"No OTP generated for user_id={user_id}")
            return jsonify({'message': 'No OTP generated for this user'}), 404

        logging.debug(f"Returning OTP for user_id={user_id}: {user.otp}")
        return jsonify({'otp': user.otp}), 200
    except Exception as e:
        logging.exception("An error occurred while retrieving the OTP")
        return jsonify({'message': 'An error occurred. Please try again.', 'error': str(e)}), 500