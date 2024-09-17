from functools import wraps
import random
from flask import request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from official_website import app, db
from .models import BusinessOwner, BusinessOwnerLog, Appointment, Feedback, OTP, RequestChange
from official_website.models import Service, WorkingHours
import logging
import pytz
from datetime import datetime, timedelta
from dateutil import tz
import json

MOSCOW_TZ = pytz.timezone('Europe/Moscow')


logging.basicConfig(level=logging.DEBUG)


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'owner_id' not in session:
            return jsonify({'message': 'Unauthorized'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.before_request
def make_session_permanent():
    session.permanent = True
    app.permanent_session_lifetime = timedelta(days=1)
    session.modified = True

@app.before_request
def check_inactivity():
    if 'owner_id' in session:
        last_activity = session.get('last_activity')
        if last_activity:
            last_activity = datetime.fromisoformat(last_activity)
            if datetime.now(MOSCOW_TZ) - last_activity > timedelta(days=1):
                session.pop('owner_id', None)
                session.pop('last_activity', None)
                logging.info("Session expired due to inactivity")
                return jsonify({'message': 'Session expired due to inactivity'}), 401
        session['last_activity'] = datetime.now(MOSCOW_TZ).isoformat()


# Authenticates the business owner based on the provided username and password.
# - If authentication is successful, the owner's session is created.
# - Returns a success message on successful login, or an error message if credentials are invalid.
@app.route('/api/business_owner/login', methods=['POST'])
def business_owner_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    business_owner = BusinessOwner.query.filter_by(username=username).first()
    if business_owner and check_password_hash(business_owner.password, password):
        session['owner_id'] = business_owner.id
        session['user_id'] = business_owner.user_id
        logging.info(f"Business owner {username} logged in successfully with id {business_owner.id}")
        return jsonify({'message': 'Login successful'}), 200
    logging.warning(f"Failed login attempt for username: {username}")
    return jsonify({'message': 'Invalid credentials'}), 401




# Logs out the currently authenticated business owner.
# - Clears the session data including owner_id and last_activity.
# - Returns a success message on successful logout.
@app.route('/api/business_owner/logout', methods=['POST'])
def business_owner_logout():
    owner_id = session.pop('owner_id', None)
    session.pop('last_activity', None)
    if owner_id:
        logging.info(f"Business owner {owner_id} logged out successfully")
    return jsonify({'message': 'Logout successful'}), 200

# Submits and stores client details for an appointment (without service and date yet).
# - Requires the client's name, email, and a verified phone number.
# - Associates the appointment with the business owner specified by the username.
@app.route('/api/shop/<username>/submit_client_details', methods=['POST'])
def submit_client_details(username):
    data = request.get_json()
    client_name = data.get('client_name')
    client_email = data.get('client_email')

    phone_number = session.get('verified_phone_number')

    if not client_name or not client_email or not phone_number:
        return jsonify({'message': 'Client name, email, and verified phone number are required'}), 400

    owner = BusinessOwner.query.filter_by(username=username).first()
    if not owner:
        return jsonify({'message': 'Business owner not found'}), 404


    appointment = Appointment(
        owner_id=owner.id,
        client_name=client_name,
        phone_number=phone_number,
        client_email=client_email,
        service=None,
        status='Client Details Provided',
        date=None,
    )
    logging.debug(f"Storing appointment with date: {appointment.date}")
    db.session.add(appointment)
    db.session.commit()

    return jsonify({'message': 'Client details saved successfully'}), 200


# Fetches dashboard data for the business owner including statistics, earnings, and reservations.
# - Retrieves appointment details (pending, accepted, cancelled, etc.).
# - Returns the total earnings for daily, weekly, and monthly periods.
# - Includes data on client requests for appointment changes.
@app.route('/api/business_owner/dashboard_data', methods=['GET'])
@login_required
def business_owner_dashboard_data():
    user_id = session['user_id']
    owner = BusinessOwner.query.filter_by(user_id=user_id).first()

    if not owner:
        logging.error(f"Business owner with user_id {user_id} not found")
        return jsonify({'message': 'Business owner not found'}), 404

    appointments = Appointment.query.filter_by(owner_id=owner.id).all()

    # Handle cancelled reservations
    cancelled_reservations = []
    cancelled_appointments = Appointment.query.filter_by(owner_id=owner.id, status='Cancelled').all()

    for a in cancelled_appointments:
        logging.info(f"Cancellation Reason for Appointment {a.id}: {a.cancellation_reason}")

        service_details = json.loads(a.service) if a.service else []
        service_names = []

        for service_data in service_details:
            service_id = service_data.get('service_id') or service_data.get('id')
            service_obj = Service.query.get(service_id)
            if service_obj:
                service_names.append({
                    'name': service_obj.title,
                    'quantity': service_data.get('quantity', 'Unknown Quantity'),
                    'cost': service_obj.cost,
                    'duration': service_obj.service_time
                })
            else:
                service_names.append({
                    'name': 'Unknown Service',
                    'quantity': service_data.get('quantity', 'Unknown Quantity'),
                    'cost': 'Unknown Cost',
                    'duration': 'Unknown Duration'
                })

        # Add the full service details to the cancelled reservation
        cancelled_reservations.append({
            'id': a.id,
            'client_name': a.client_name,
            'phone_number': a.phone_number,
            'client_email': a.client_email,
            'service': service_names if service_names else [],
            'date': a.date.strftime('%Y-%m-%d %H:%M') if a.date else "Not Set",
            'start_time': a.date.astimezone(MOSCOW_TZ).strftime('%Y-%m-%d %H:%M') if a.date else "Not Set",
            'end_time': a.end_time.astimezone(MOSCOW_TZ).strftime('%Y-%m-%d %H:%M') if a.end_time else "Not Set",
            'cancellation_reason': a.cancellation_reason if a.status == 'Cancelled' else None,
            'status': a.status
        })

    # Gather statistics
    statistics = {
        'pending': sum(1 for a in appointments if a.status == 'Pending'),
        'accepted': sum(1 for a in appointments if a.status == 'Accepted'),
        'rejected': sum(1 for a in appointments if a.status == 'Rejected'),
        'reported': sum(1 for a in appointments if a.status == 'Reported'),
        'completed': sum(1 for a in appointments if a.status == 'Completed'),
        'pending_payment': sum(1 for a in appointments if a.status == 'Arrived'),
        'cancelled': sum(1 for a in appointments if a.status == 'Cancelled')
    }

    # Handle request changes
    request_changes = RequestChange.query.join(Appointment).filter(Appointment.owner_id == owner.id).all()

    change_requests_data = []
    for rc in request_changes:
        try:
            logging.info(f"Raw requested_service for RequestChange ID {rc.id}: {rc.requested_service}")
            requested_service_data = json.loads(rc.requested_service) if rc.requested_service else []
            logging.info(f"Parsed service data for RequestChange ID {rc.id}: {requested_service_data}")

            services_info = []
            for service_data in requested_service_data:
                service_id = service_data.get('service_id')

                if not service_id:
                    logging.warning(f"Service ID missing for service_data: {service_data}")
                    service_obj = None
                else:
                    service_obj = Service.query.get(service_id)
                    if service_obj:
                        logging.info(f"Loaded service {service_obj.title} with ID {service_id}")
                    else:
                        logging.warning(f"Service with ID {service_id} not found")

                services_info.append({
                    'id': service_id,
                    'name': service_obj.title if service_obj else 'Unknown Service',
                    'quantity': service_data.get('quantity', 'Unknown Quantity'),
                    'cost': service_obj.cost if service_obj else 'Unknown Cost',
                    'duration': service_obj.service_time if service_obj else 'Unknown Duration'
                })

            change_requests_data.append({
                'id': rc.id,
                'appointment_id': rc.appointment_id,
                'client_name': rc.client_name,
                'phone_number': rc.phone_number,
                'client_email': rc.client_email,
                'requested_date': rc.requested_date.strftime('%Y-%m-%d %H:%M') if rc.requested_date else None,
                'requested_end_time': rc.requested_end_time.strftime('%Y-%m-%d %H:%M') if rc.requested_end_time else None,
                'requested_service': services_info,
                'requested_total_service_time': rc.requested_total_service_time,
                'requested_num_services': rc.requested_num_services,
                'status': rc.status,
                'created_at': rc.created_at.strftime('%Y-%m-%d %H:%M')
            })

        except json.JSONDecodeError as e:
            logging.error(f"Error decoding requested_service for RequestChange ID {rc.id}: {str(e)}")

    # Calculate earnings
    earnings = {'daily': 0, 'weekly': 0, 'monthly': 0, 'forecast': {'labels': [], 'data': []}}
    now = datetime.now(tz.UTC)
    completed_appointments = [a for a in appointments if a.status == 'Completed']
    total_appointments = len(completed_appointments)

    if total_appointments > 0:
        for appointment in completed_appointments:
            service_details = json.loads(appointment.service) if appointment.service else []
            for service in service_details:
                service_obj = Service.query.get(service.get('id'))
                if service_obj:
                    appointment_date = appointment.date
                    if appointment_date.tzinfo is None:
                        appointment_date = appointment_date.replace(tzinfo=tz.UTC)

                    diff = now - appointment_date
                    earnings_value = service_obj.cost * service['quantity']

                    if diff.days < 1:
                        earnings['daily'] += earnings_value
                    if diff.days < 7:
                        earnings['weekly'] += earnings_value
                    if diff.days < 30:
                        earnings['monthly'] += earnings_value

        avg_daily_earnings = earnings['daily'] / total_appointments
        earnings['forecast']['labels'] = ['Next Week', 'Next Month', 'Next Year']
        earnings['forecast']['data'] = [
            avg_daily_earnings * 7,
            avg_daily_earnings * 30,
            avg_daily_earnings * 365
        ]

    # Services data
    services_data = []
    for service in Service.query.filter_by(user_id=user_id).all():
        earnings_by_service = 0
        for appointment in completed_appointments:
            service_details = json.loads(appointment.service) if appointment.service else []
            for s in service_details:
                if s.get('id') == service.id:
                    earnings_by_service += service.cost * s['quantity']
        services_data.append({
            'title': service.title,
            'earnings': earnings_by_service
        })

    # Reservations
    reservations = []
    completed_reservations = []
    for a in appointments:
        service_details = json.loads(a.service) if a.service else []
        service_names = []
        for service_data in service_details:
            service_id = service_data.get('service_id') or service_data.get('id')
            service_obj = Service.query.get(service_id)
            if service_obj:
                service_names.append({
                    'name': service_obj.title,
                    'quantity': service_data.get('quantity', 'Unknown Quantity'),
                    'cost': service_obj.cost,
                    'duration': service_obj.service_time
                })
            else:
                service_names.append({
                    'name': 'Unknown Service',
                    'quantity': service_data.get('quantity', 'Unknown Quantity'),
                    'cost': 'Unknown Cost',
                    'duration': 'Unknown Duration'
                })

        reservation = {
            'id': a.id,
            'client_name': a.client_name,
            'phone_number': a.phone_number,
            'client_email': a.client_email,
            'service': service_names if service_names else [],
            'date': a.date.strftime('%Y-%m-%d %H:%M') if a.date else "Not Set",
            'start_time': a.date.astimezone(MOSCOW_TZ).strftime('%Y-%m-%d %H:%M') if a.date else "Not Set",
            'end_time': a.end_time.astimezone(MOSCOW_TZ).strftime('%Y-%m-%d %H:%M') if a.end_time else "Not Set",
            'status': a.status,
            'rejection_reason': a.rejection_reason if a.status == 'Rejected' else None
        }

        if a.status == 'Completed':
            completed_reservations.append(reservation)
        else:
            reservations.append(reservation)

    return jsonify({
        'statistics': statistics,
        'earnings': earnings,
        'reservations': reservations,
        'completed_reservations': completed_reservations,
        'cancelled_reservations': cancelled_reservations,
        'servicesData': services_data,
        'changeRequests': change_requests_data,
        'shop_name': owner.company_name,
        'username': owner.username
    }), 200



# Accepts and applies a client's requested changes to an existing appointment.
# - Updates appointment details such as the date, time, and services.
# - Deletes the change request after it has been applied.
@app.route('/api/business_owner/accept_change/<int:request_change_id>', methods=['POST'])
@login_required
def accept_change_request(request_change_id):
    try:

        change_request = RequestChange.query.get(request_change_id)
        if not change_request:
            return jsonify({'message': 'Change request not found'}), 404

        appointment = Appointment.query.get(change_request.appointment_id)
        if not appointment:
            return jsonify({'message': 'Appointment not found'}), 404


        if change_request.requested_date.tzinfo is None:
            requested_date_moscow = MOSCOW_TZ.localize(change_request.requested_date)
        else:
            requested_date_moscow = change_request.requested_date.astimezone(MOSCOW_TZ)

        if change_request.requested_end_time.tzinfo is None:
            requested_end_time_moscow = MOSCOW_TZ.localize(change_request.requested_end_time)
        else:
            requested_end_time_moscow = change_request.requested_end_time.astimezone(MOSCOW_TZ)


        appointment.date = requested_date_moscow
        appointment.end_time = requested_end_time_moscow
        appointment.service = change_request.requested_service
        appointment.total_service_time = change_request.requested_total_service_time
        appointment.num_services = change_request.requested_num_services


        db.session.commit()


        db.session.delete(change_request)
        db.session.commit()

        return jsonify({'message': 'Change request accepted and applied to the appointment'}), 200
    except Exception as e:
        logging.error(f"Error processing change request: {str(e)}")
        db.session.rollback()
        return jsonify({'message': 'Failed to apply change request', 'error': str(e)}), 500

# Processes reservation actions such as accepting, rejecting, reporting, or marking as arrived.
# - Each action updates the reservation status accordingly.
# - Accept action generates an OTP for the client and sends a confirmation.
@app.route('/api/business_owner/<action>/<int:reservation_id>', methods=['POST'])
@login_required
def handle_reservation_action(action, reservation_id):
    valid_actions = ['accept', 'reject', 'report', 'arrived']
    if action not in valid_actions:
        logging.warning(f"Invalid action attempt: {action}")
        return jsonify({'message': 'Invalid action'}), 400

    owner_id = session['owner_id']
    appointment = Appointment.query.filter_by(id=reservation_id, owner_id=owner_id).first()

    if not appointment:
        logging.error(f"Appointment {reservation_id} not found for owner {owner_id}")
        return jsonify({'message': 'Appointment not found'}), 404

    if action == 'reject':
        reason = request.json.get('reason')
        if not reason:
            return jsonify({'message': 'Rejection reason is required'}), 400
        appointment.status = 'Rejected'
        appointment.rejection_reason = reason
        db.session.commit()
        logging.info(f"Reservation {reservation_id} rejected by owner {owner_id}")



        return jsonify({'message': 'Reservation rejected successfully.'}), 200

    elif action == 'accept':


        otp_code = random.randint(1000, 9999)


        otp_entry = OTP(phone_number=appointment.phone_number, otp=str(otp_code))
        db.session.add(otp_entry)

        appointment.status = 'Accepted'


        db.session.commit()


        confirmation_message = (
            f"Dear {appointment.client_name},\n"
            f"Your appointment at {appointment.date.strftime('%Y-%m-%d %H:%M')} "
            f"with {appointment.owner.company_name} has been confirmed. "
            f"Your OTP is {otp_code}. Please present this OTP at the time of your appointment."
        )


        email_success, sms_success = send_confirmation_message(appointment.client_email, appointment.phone_number, confirmation_message)


        logging.info(f"Reservation {reservation_id} accepted by owner {owner_id}")
        logging.info(f"Generated OTP for client {appointment.client_name}: {otp_code}")

        if not email_success:
            logging.error(f"Failed to send confirmation email to {appointment.client_email}")

        if not sms_success:
            logging.error(f"Failed to send confirmation SMS to {appointment.phone_number}")


        return jsonify({
            'message': 'Reservation accepted successfully.',
            'confirmation_message': confirmation_message,
            'otp': otp_code,
            'email_success': email_success,
            'sms_success': sms_success
        }), 200

    elif action == 'report':
        report_details = request.json.get('report_details')
        if not report_details:
            return jsonify({'message': 'Report details are required'}), 400
        appointment.status = 'Reported'
        new_feedback = Feedback(owner_id=owner_id, feedback=report_details, created_at=datetime.now(MOSCOW_TZ))
        db.session.add(new_feedback)
        db.session.commit()
        logging.info(f"Reservation {reservation_id} reported by owner {owner_id}")

    elif action == 'arrived':

        otp_code = request.json.get('otp')


        stored_otp = OTP.query.filter_by(phone_number=appointment.phone_number).order_by(OTP.created_at.desc()).first()

        if not stored_otp:
            return jsonify({'message': 'No OTP found for this phone number'}), 404

        if stored_otp.otp != otp_code:
            return jsonify({'message': 'Invalid OTP'}), 400

        appointment.status = 'Arrived'
        db.session.commit()

        logging.info(f"Reservation {reservation_id} marked as arrived by owner {owner_id}")

    return jsonify({'message': f'Reservation {action}ed successfully'}), 200




def send_confirmation_message(email, phone_number, message):
    email_success = False
    sms_success = False

    try:

        logging.info(f"Sending email to {email}: {message}")
        email_success = True
    except Exception as e:
        logging.error(f"Error sending email: {str(e)}")

    try:

        logging.info(f"Sending SMS to {phone_number}: {message}")
        sms_success = True
    except Exception as e:
        logging.error(f"Error sending SMS: {str(e)}")

    return email_success, sms_success


# Manages business owner services including listing, adding, updating, and deleting services.
# - GET: Retrieves all services for the logged-in business owner.
# - POST: Adds a new service.
# - PUT: Updates an existing service.
# - DELETE: Removes a service by ID.
@app.route('/api/business_owner/services', methods=['GET', 'POST', 'PUT', 'DELETE'])
@login_required
def manage_services():
    user_id = session.get('user_id')
    if not user_id:
        logging.error("User ID not found in session. Unauthorized access.")
        return jsonify({'message': 'Unauthorized'}), 401

    logging.info(f"Fetching services for user_id: {user_id}")

    if request.method == 'GET':
        services = Service.query.filter_by(user_id=user_id).all()
        services_data = [
            {
                'id': s.id,
                'title': s.title,
                'cost': s.cost,
                'description': s.description,
                'service_time': s.service_time,
                'user_id': s.user_id
            }
            for s in services
        ]
        logging.info(f"Fetched services for user {user_id}: {services_data}")
        return jsonify(services_data), 200

    if request.method == 'POST':
        data = request.get_json()
        title = data.get('title')
        cost = data.get('cost')
        description = data.get('description')
        service_time = data.get('service_time')

        if not all([title, cost, description, service_time]):
            logging.error("Missing service information in POST request.")
            return jsonify({'message': 'Missing service information'}), 400

        new_service = Service(title=title, cost=cost, description=description, service_time=service_time, user_id=user_id)
        db.session.add(new_service)
        db.session.commit()
        logging.info(f"New service added by owner {user_id}: {title}")
        return jsonify({'message': 'Service added successfully', 'service': {'id': new_service.id, 'title': new_service.title, 'cost': new_service.cost, 'description': new_service.description, 'service_time': new_service.service_time}}), 201

    if request.method == 'PUT':
        data = request.get_json()
        service_id = data.get('id')
        title = data.get('title')
        cost = data.get('cost')
        description = data.get('description')
        service_time = data.get('service_time')

        service = Service.query.get(service_id)
        if not service or service.user_id != user_id:
            logging.error(f"Service update failed: Service ID {service_id} not found or unauthorized")
            return jsonify({'message': 'Service not found or unauthorized'}), 404

        service.title = title
        service.cost = cost
        service.description = description
        service.service_time = service_time
        db.session.commit()
        logging.info(f"Service {service_id} updated by owner {user_id}")
        return jsonify({'message': 'Service updated successfully'}), 200

    if request.method == 'DELETE':
        service_id = request.args.get('id')
        if not service_id:
            logging.error("Service ID not provided for deletion.")
            return jsonify({'message': 'Service ID is required'}), 400

        service = Service.query.get(service_id)
        if not service or service.user_id != user_id:
            logging.error(f"Service delete failed: Service ID {service_id} not found or unauthorized")
            return jsonify({'message': 'Service not found or unauthorized'}), 404

        db.session.delete(service)
        db.session.commit()
        logging.info(f"Service {service_id} deleted by owner {user_id}")
        return jsonify({'message': 'Service deleted successfully'}), 200


# Returns support contact information including email, phone, and address for the business owner.
# - Useful for technical support or other inquiries.
@app.route('/api/business_owner/support', methods=['GET'])
@login_required
def get_support():
    support_info = {
        'email': 'support@business.com',
        'phone': '(123) 456-7890',
        'address': '123 Business St, Suite 456, Business City, BC 12345'
    }
    return jsonify(support_info), 200


# Verifies if the business owner is currently authenticated.
# - If authenticated, returns a success message.
# - If not, returns an unauthorized status.
@app.route('/api/business_owner/check_auth', methods=['GET'])
def check_auth():
    if 'owner_id' in session:
        return jsonify({'message': 'Authenticated'}), 200
    return jsonify({'message': 'Unauthorized'}), 401

# Retrieves all reservations for the business owner/shop.
# - Returns appointment details including client name, date, service, and status.
@app.route('/api/shop/<username>/reservations', methods=['GET'])
def get_reservations(username):
    if 'option_selected' not in session:
        return redirect(f'/shop/{username}')


    owner = BusinessOwner.query.filter_by(username=username).first()
    if not owner:
        return jsonify({'message': 'Shop not found'}), 404

    reservations = Appointment.query.filter_by(owner_id=owner.id).all()
    reservations_data = [{'id': r.id, 'client_name': r.client_name, 'date': r.date.strftime('%Y-%m-%d %H:%M'), 'service': r.service, 'status': r.status} for r in reservations]

    return jsonify(reservations_data), 200

# Checks if an appointment exists based on the provided phone number.
# - Returns appointment details if found, or a 404 if no appointment is found.
@app.route('/api/check_appointment', methods=['GET'])
def check_appointment():
    phone_number = request.args.get('phone').strip()

    if not phone_number.startswith('+'):
        phone_number = '+' + phone_number

    appointment = Appointment.query.filter_by(phone_number=phone_number).first()

    if appointment:
        services = json.loads(appointment.service) if isinstance(appointment.service, str) else appointment.service
        services_details = []
        total_cost = 0

        for s in services:
            service_obj = Service.query.get(s['id'])
            service_cost = service_obj.cost * s['quantity']
            services_details.append({
                'name': service_obj.title,
                'quantity': s['quantity'],
                'cost': service_cost
            })
            total_cost += service_cost

        appointment_info = {
            'time': appointment.date.strftime('%Y-%m-%d %H:%M') if appointment.date else "Not Set",
            'services': services_details,
            'status': appointment.status,
            'total': total_cost,
            'rejection_reason': appointment.rejection_reason if appointment.status == 'Rejected' else None,
        }
        return jsonify(appointment_info), 200

    return jsonify({'message': 'No appointment found'}), 404



@app.before_request
def ensure_option_selected():
    if request.endpoint in ['get_shop_data', 'get_reservations'] and 'option_selected' not in session:
        return jsonify({'message': 'You must select an option first'}), 403


# Submits client feedback or complaints about a business owner.
# - Requires client name, email, phone, and complaint details.
# - Stores the feedback in the system for the business owner to review.
@app.route('/api/submit_feedback', methods=['POST'])
def submit_feedback():
    data = request.get_json()
    owner_id = session.get('owner_id')

    if not owner_id:
        shop_username = data.get('shop_username')
        if not shop_username:
            return jsonify({'message': 'Shop not specified'}), 400

        owner = BusinessOwner.query.filter_by(username=shop_username).first()
        if not owner:
            return jsonify({'message': 'Business owner not found'}), 404

        owner_id = owner.id

    client_name = data.get('client_name')
    client_email = data.get('client_email')
    client_phone = data.get('client_phone')
    complaint = data.get('complaint')

    if not client_name or not client_email or not client_phone or not complaint:
        return jsonify({'message': 'Invalid data'}), 400


    new_feedback = Feedback(
        owner_id=owner_id,
        client_name=client_name,
        client_email=client_email,
        client_phone=client_phone,
        complaint=complaint,
        created_at=datetime.now(MOSCOW_TZ)
    )
    db.session.add(new_feedback)
    db.session.commit()

    return jsonify({'message': 'Feedback submitted successfully'}), 200


@app.before_request
def ensure_option_selected():
    if request.endpoint in ['get_shop_data', 'get_reservations', 'shop_view']:
        option_selected = session.get('option_selected')
        logging.info(f"Option selected: {option_selected}")
        if option_selected is None:
            username = request.view_args.get('username', None)
            if username:
                logging.info(f"Redirecting to option selection for username: {username}")
                return redirect(f'/shop/{username}/option')
            return jsonify({'message': 'You must select an option first'}), 403
        elif option_selected == 'no':
            logging.info(f"User selected 'No', allowing access to shop view.")
            return None
        elif option_selected == 'yes':
            logging.info(f"User selected 'Yes', proceeding normally.")
            return None


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react_app(path):
    return app.send_static_file('index.html')

# Returns available time slots for appointments on a specific date.
# - Considers the business owner's working hours and existing appointments.
# - Marks slots as 'occupied' if they are already booked.
@app.route('/api/shop/<username>/available_slots', methods=['GET'])
def get_available_slots(username):
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'message': 'Date is required'}), 400

    owner = BusinessOwner.query.filter_by(username=username).first()
    if not owner:
        return jsonify({'message': 'Shop not found'}), 404

    logging.debug(f"Retrieved owner with user_id: {owner.user_id} and owner_id: {owner.id}")

    date = datetime.strptime(date_str, '%Y-%m-%d').date()
    day_of_week = date.strftime('%A')

    working_hours = WorkingHours.query.filter_by(user_id=owner.user_id, day=day_of_week).first()
    if not working_hours:
        return jsonify({'message': 'No working hours found for this day'}), 404

    start_time = datetime.combine(date, working_hours.start_time).replace(tzinfo=MOSCOW_TZ)
    end_time = datetime.combine(date, working_hours.end_time).replace(tzinfo=MOSCOW_TZ)

    time_slots = []
    current_time = start_time
    now = datetime.now(MOSCOW_TZ)

    # Generate available time slots
    while current_time < end_time:
        if date > now.date() or (date == now.date() and current_time.time() > now.time()):
            time_slots.append(current_time.strftime('%H:%M'))
        current_time += timedelta(minutes=60)

    # Fetch all bookings, but only consider those that are not 'Rejected' or 'Cancelled' or 'Completed'
    bookings = Appointment.query.filter(
        Appointment.owner_id == owner.id,
        db.func.date(Appointment.date) == date_str,
        Appointment.status.notin_(['Rejected', 'Cancelled','Completed'])  #Exclude Rejected or Cancelled or Completed statuses
    ).all()

    logging.debug(f"Bookings found for {date_str}: {[b.id for b in bookings]}")

    # Collect booked slots
    booked_slots = set()
    for booking in bookings:
        slot_time = booking.date.astimezone(MOSCOW_TZ)
        appointment_end_time = booking.end_time.astimezone(MOSCOW_TZ)

        while slot_time < appointment_end_time:
            slot_str = slot_time.strftime('%H:%M')
            booked_slots.add(slot_str)
            logging.debug(f"Marking slot as booked: {slot_str}")
            slot_time += timedelta(minutes=60)

    logging.debug(f"Final booked slots: {booked_slots}")

    # Prepare available slots response
    available_slots = [{'time': slot, 'status': 'occupied' if slot in booked_slots else 'free'} for slot in time_slots]

    return jsonify({
        'available_slots': available_slots,
    }), 200


# Retrieves time slots for a specific business owner on a given date.
# - Marks slots as 'free' or 'occupied' based on existing bookings.
@app.route('/api/shop/<int:owner_id>/slots', methods=['GET'])
def get_slots(owner_id):

    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': 'Date parameter is required'}), 400


    try:
        selected_date = datetime.strptime(date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': 'Invalid date format. Use YYYY-MM-DD.'}), 400


    time_slots = [(selected_date + timedelta(hours=i)).time() for i in range(24)]


    appointments = Appointment.query.filter(
        db.func.date(Appointment.date) == selected_date.date(),
        Appointment.owner_id == owner_id
    ).all()


    slots_status = {str(slot): 'free' for slot in time_slots}


    for appointment in appointments:
        appointment_time = appointment.date.time()
        slots_status[str(appointment_time)] = 'occupied'


    slots = [{'time': time, 'status': status} for time, status in slots_status.items()]

    return jsonify({'slots': slots})


# Generates and sends a one-time password (OTP) to the client's phone number.
# - Used for verifying the client's phone number during appointment booking.
@app.route('/api/shop/<username>/request_otp', methods=['POST'])
def request_otp(username):
    data = request.get_json()
    phone_number = data.get('phone_number')

    if not phone_number:
        return jsonify({'message': 'Phone number is required'}), 400


    otp = random.randint(100000, 999999)


    session['otp'] = otp
    session['otp_phone_number'] = phone_number


    logging.info(f"Generated OTP for {phone_number}: {otp}")


    if phone_number.startswith("+7"):
        return jsonify({'message': 'OTP sent successfully'}), 200
    else:
        return jsonify({'message': 'Failed to send OTP'}), 500


from official_website import db
from .models import BusinessOwner, Appointment

from random import randint

# Verifies the OTP entered by the client.
# - Confirms that the client's phone number has been authenticated.
@app.route('/api/shop/<username>/verify_otp', methods=['POST'])
def verify_otp_route(username):
    data = request.get_json()
    phone_number = data.get('phone_number')
    otp_code = data.get('otp_code')

    logging.info(f"Received data for verification: {data}")

    if not phone_number or not otp_code:
        logging.warning(f"Missing phone_number or otp_code: phone_number={phone_number}, otp_code={otp_code}")
        return jsonify({'message': 'Phone number and OTP code are required'}), 400

    stored_otp = session.get('otp')
    stored_phone_number = session.get('otp_phone_number')

    if stored_otp and stored_phone_number == phone_number and int(otp_code) == stored_otp:
        session['verified_phone_number'] = phone_number
        logging.info(f"Stored phone_number in session: {session.get('verified_phone_number')}")
        return jsonify({'message': 'OTP verified successfully'}), 200

    else:
        logging.warning(f"OTP verification failed for {phone_number}")
        return jsonify({'message': 'Invalid OTP'}), 400



# Generates and sends an OTP to confirm appointment cancellation.
# - Verifies the OTP before allowing the appointment to be cancelled.
@app.route('/api/business_owner/generate_cancel_otp', methods=['POST'])
def generate_cancel_otp():
    data = request.get_json()
    phone_number = data.get('phone_number')

    if not phone_number:
        return jsonify({'message': 'Phone number is required'}), 400


    otp_code = randint(100000, 999999)


    logging.info(f"Generated OTP for {phone_number}: {otp_code}")


    session['otp'] = otp_code
    session['otp_phone_number'] = phone_number

    # Simulate sending OTP to the client's phone number
    # send_sms(phone_number, otp_code)

    return jsonify({'message': f"OTP sent to {phone_number} for cancellation.", 'otp': otp_code}), 200




@app.route('/shop/<username>', methods=['GET'])
def shop_redirect(username):

    session.pop('option_selected', None)

    return redirect(f'/shop/{username}/option')


@app.route('/shop/<username>/option', methods=['GET'])
def select_option_page(username):

    return redirect(url_for('serve_react_app', path=f'shop/{username}/option'))

@app.route('/shop/<username>/view', methods=['GET'])
def shop_view(username):
    option_selected = session.get('option_selected')
    logging.info(f"Option selected in session: {option_selected}")

    if option_selected == 'no':
        return get_shop_data(username)

    if option_selected == 'yes':
        return redirect(f'/shop/{username}/option')

    return redirect(f'/shop/{username}/option')


@app.route('/api/select_option', methods=['POST'])
def select_option():
    data = request.get_json()
    option_selected = data.get('option_selected')
    if option_selected:
        session['option_selected'] = option_selected
        logging.info(f"Option selected: {option_selected}")
        return jsonify({'message': 'Option selected successfully'}), 200
    return jsonify({'error': 'Invalid option'}), 400


# Fetches business owner and shop details including services and working hours.
# - Returns services offered by the business owner and their daily working hours.
@app.route('/api/shop/<username>/data', methods=['GET'])
def get_shop_data(username):

    logging.info(f"Fetching shop data for username: {username}")
    owner = BusinessOwner.query.filter_by(username=username).first()

    if not owner:
        logging.error(f"Shop not found for username: {username}")
        return jsonify({'message': 'Shop not found'}), 404


    services = Service.query.filter_by(user_id=owner.user_id).all()
    working_hours = WorkingHours.query.filter_by(user_id=owner.user_id).all()


    services_data = [
        {
            'id': s.id,
            'title': s.title,
            'cost': s.cost,
            'description': s.description,
            'service_time': s.service_time
        } for s in services
    ]

    working_hours_data = [
        {
            'day': wh.day,
            'start_time': wh.start_time.strftime('%H:%M'),
            'end_time': wh.end_time.strftime('%H:%M')
        } for wh in working_hours
    ]

    return jsonify({
        'personal_name': owner.personal_name,
        'email': owner.email,
        'phone_number': owner.phone_number,
        'services': services_data,
        'working_hours': working_hours_data
    }), 200


# Reserves an appointment for a client with selected services and a specific date.
# - Requires client name, email, phone number, and service details.


@app.route('/api/shop/<username>/reserve', methods=['POST'])
def reserve_appointment(username):
    data = request.get_json()
    client_name = data.get('client_name')
    client_email = data.get('client_email')
    phone_number = session.get('verified_phone_number').strip()
    services = data.get('services')
    appointment_date_str = data.get('date')


    if not phone_number.startswith('+'):
        phone_number = '+' + phone_number

    if not client_name or not client_email or not phone_number or not services or not appointment_date_str:
        return jsonify({'message': 'Client name, email, phone number, services, and appointment date are required'}), 400

    try:

        appointment_date_moscow = datetime.strptime(appointment_date_str, '%Y-%m-%d %H:%M')
        appointment_date_moscow = MOSCOW_TZ.localize(appointment_date_moscow)
    except ValueError:
        return jsonify({'message': 'Invalid date format. Use YYYY-MM-DD HH:MM.'}), 400

    owner = BusinessOwner.query.filter_by(username=username).first()
    if not owner:
        return jsonify({'message': 'Business owner not found'}), 404

    total_service_time = sum([Service.query.get(service['id']).service_time * service['quantity'] for service in services])
    end_time_moscow = appointment_date_moscow + timedelta(minutes=total_service_time)

    services_json = json.dumps(services)


    appointment = Appointment(
        owner_id=owner.id,
        client_name=client_name,
        client_email=client_email,
        phone_number=phone_number,
        service=services_json,
        date=appointment_date_moscow,
        end_time=end_time_moscow,
        total_service_time=total_service_time,
        num_services=len(services),
        status='Pending',
    )
    db.session.add(appointment)
    db.session.commit()

    return jsonify({'message': 'Appointment reserved successfully'}), 200





@app.route('/api/business_owner/<action>/<int:reservation_id>', methods=['POST'])
@login_required
def process_reservation_action(action, reservation_id):
    valid_actions = ['accept', 'reject', 'report']
    if action not in valid_actions:
        logging.warning(f"Invalid action attempt: {action}")
        return jsonify({'message': 'Invalid action'}), 400

    owner_id = session['owner_id']
    appointment = Appointment.query.filter_by(id=reservation_id, owner_id=owner_id).first()

    if not appointment:
        logging.error(f"Appointment {reservation_id} not found for owner {owner_id}")
        return jsonify({'message': 'Appointment not found'}), 404

    if action == 'accept':
        appointment.status = 'Accepted'

        db.session.commit()
        logging.info(f"Reservation {reservation_id} accepted by owner {owner_id}")
    elif action == 'reject':
        appointment.status = 'Rejected'
        db.session.commit()
        logging.info(f"Reservation {reservation_id} rejected by owner {owner_id}")
    elif action == 'report':
        appointment.status = 'Reported'
        db.session.commit()
        logging.info(f"Reservation {reservation_id} reported by owner {owner_id}")

    return jsonify({'message': f'Reservation {action}ed successfully'}), 200


# Marks an appointment as 'Arrived' after verifying the OTP provided by the client.
# - Updates the reservation status accordingly.
@app.route('/api/business_owner/arrived/<int:reservation_id>', methods=['POST'])
@login_required
def mark_as_arrived(reservation_id):
    owner_id = session['owner_id']
    logging.info(f"Processing 'Arrived' action for reservation {reservation_id} by owner {owner_id}")

    appointment = Appointment.query.filter_by(id=reservation_id, owner_id=owner_id).first()
    if not appointment:
        logging.error(f"Appointment {reservation_id} not found for owner {owner_id}")
        return jsonify({'message': 'Appointment not found'}), 404

    data = request.get_json()
    otp_code = data.get('otp')


    stored_otp = OTP.query.filter_by(phone_number=appointment.phone_number).order_by(OTP.created_at.desc()).first()

    if not stored_otp:
        logging.error(f"No OTP found for phone number {appointment.phone_number}")
        return jsonify({'message': 'No OTP found for this phone number'}), 404

    if stored_otp.otp != otp_code:
        logging.error(f"Invalid OTP provided: {otp_code} for phone number {appointment.phone_number}")
        return jsonify({'message': 'Invalid OTP'}), 400


    appointment.status = 'Arrived'
    db.session.commit()

    logging.info(f"Reservation {reservation_id} marked as 'Arrived'. No earnings calculated.")
    return jsonify({
        'id': appointment.id,
        'client_name': appointment.client_name,
        'phone_number': appointment.phone_number,
        'client_email': appointment.client_email,
        'service': eval(appointment.service),
        'date': appointment.date.strftime('%Y-%m-%d %H:%M') if appointment.date else "Not Set",
        'status': appointment.status
    }), 200



# Marks an appointment as 'Completed' and updates the business owner's earnings.
# - Finalizes the reservation as paid and updates the status to completed.
@app.route('/api/business_owner/paid/<int:reservation_id>', methods=['POST'])
@login_required
def mark_as_paid(reservation_id):
    owner_id = session['owner_id']
    logging.info(f"Processing 'Paid' action for reservation {reservation_id} by owner {owner_id}")

    appointment = Appointment.query.filter_by(id=reservation_id, owner_id=owner_id).first()
    if not appointment:
        logging.error(f"Appointment {reservation_id} not found for owner {owner_id}")
        return jsonify({'message': 'Appointment not found'}), 404


    appointment.status = 'Completed'
    db.session.commit()


    earnings = calculate_earnings(owner_id)

    logging.info(f"Reservation {reservation_id} marked as 'Paid' and 'Completed'. Earnings updated: {earnings}")

    return jsonify({
        'reservation': {
            'id': appointment.id,
            'client_name': appointment.client_name,
            'phone_number': appointment.phone_number,
            'client_email': appointment.client_email,
            'service': eval(appointment.service),
            'date': appointment.date.strftime('%Y-%m-%d %H:%M') if appointment.date else "Not Set",
            'status': appointment.status
        },
        'earnings': earnings
    }), 200





def calculate_earnings(owner_id):
    earnings = {'daily': 0, 'weekly': 0, 'monthly': 0}
    now = datetime.now(tz.UTC)

    business_owner = BusinessOwner.query.get(owner_id)
    if not business_owner:
        logging.error(f"BusinessOwner with ID {owner_id} not found")
        return earnings

    user_id = business_owner.user_id

    services = Service.query.filter_by(user_id=user_id).all()
    if not services:
        logging.error(f"No services found for user_id {user_id}")
        return earnings


    appointments = Appointment.query.filter_by(owner_id=owner_id, status='Completed').all()
    if not appointments:
        logging.info(f"No completed appointments found for owner_id {owner_id}")
        return earnings

    service_earnings = {}
    for appointment in appointments:
        try:

            services_data = json.loads(appointment.service) if isinstance(appointment.service, str) else appointment.service


            if not isinstance(services_data, list):
                logging.error(f"Invalid service data format in appointment {appointment.id}")
                continue

            for service in services_data:

                logging.info(f"Processing service data: {service}")
                service_id = service.get('id') or service.get('service_id')
                if not service_id:
                    logging.error(f"Service ID missing in service details for appointment {appointment.id}: {service}")
                    continue

                service_obj = Service.query.get(service_id)
                if not service_obj or service_obj.user_id != user_id:
                    logging.error(f"Service with ID {service_id} not found or does not belong to user {user_id}")
                    continue

                earnings_value = service_obj.cost * service.get('quantity', 1)
                appointment_date = appointment.date
                if appointment_date.tzinfo is None:
                    appointment_date = appointment_date.replace(tzinfo=tz.UTC)

                diff = now - appointment_date
                if diff.days < 1:
                    earnings['daily'] += earnings_value
                if diff.days < 7:
                    earnings['weekly'] += earnings_value
                if diff.days < 30:
                    earnings['monthly'] += earnings_value


                if service_obj.title not in service_earnings:
                    service_earnings[service_obj.title] = 0
                service_earnings[service_obj.title] += earnings_value

        except Exception as e:
            logging.error(f"Error processing appointment {appointment.id}: {str(e)}")
            continue

    return earnings


# Allows a business owner to report an issue with a reservation.
# - Requires report details and updates the reservation status to 'Reported.'
@app.route('/api/business_owner/report/<int:reservation_id>', methods=['POST'])
@login_required
def report_reservation(reservation_id):
    owner_id = session['owner_id']
    appointment = Appointment.query.filter_by(id=reservation_id, owner_id=owner_id).first()

    if not appointment:
        logging.error(f"Appointment {reservation_id} not found for owner {owner_id}")
        return jsonify({'message': 'Appointment not found'}), 404

    report_details = request.json.get('report_details')
    if not report_details:
        return jsonify({'message': 'Report details are required'}), 400


    appointment.status = 'Reported'
    appointment.report_details = report_details
    db.session.commit()

    logging.info(f"Reservation {reservation_id} reported by owner {owner_id}")

    return jsonify({'message': 'Reservation reported successfully'}), 200


# Updates the date and time of an existing appointment based on the client's phone number.
# - Updates both the start and end times of the appointment.
@app.route('/api/update_appointment', methods=['POST'])
def update_appointment():
    data = request.get_json()
    phone_number = data.get('phone')
    new_date_str = data.get('new_date')
    new_time_str = data.get('new_time')

    if not phone_number or not new_date_str or not new_time_str:
        return jsonify({'message': 'Phone number, new date, and new time are required'}), 400

    appointment = Appointment.query.filter_by(phone_number=phone_number).first()

    if not appointment:
        return jsonify({'message': 'Appointment not found'}), 404

    try:

        new_datetime_moscow = MOSCOW_TZ.localize(datetime.strptime(f"{new_date_str} {new_time_str}", '%Y-%m-%d %H:%M'))
        new_datetime_utc = new_datetime_moscow.astimezone(pytz.utc)
    except ValueError:
        return jsonify({'message': 'Invalid date or time format'}), 400

    appointment.date = new_datetime_utc
    appointment.end_time = new_datetime_utc + timedelta(minutes=appointment.total_service_time)
    db.session.commit()

    return jsonify({'message': 'Appointment updated successfully'}), 200

# Retrieves detailed information about an appointment for a specific shop based on the client's phone number.
# - Includes service details, appointment status, and total cost.
@app.route('/api/shop/<username>/appointment_details', methods=['GET'])
def get_appointment_details(username):
    phone_number = request.args.get('phone').strip()

    if not phone_number.startswith('+'):
        phone_number = '+' + phone_number
    logging.info(f"Checking appointment for phone number: {phone_number}")


    appointment = Appointment.query.filter_by(phone_number=phone_number).filter(Appointment.status != 'Cancelled').first()

    if appointment:
        logging.info(f"Appointment found: {appointment}")
        services = json.loads(appointment.service) if isinstance(appointment.service, str) else appointment.service
        services_details = []
        total_cost = 0

        for s in services:
            service_id = s.get('id')
            if service_id:
                service_obj = Service.query.get(service_id)
                if service_obj:
                    service_cost = service_obj.cost * s['quantity']
                    services_details.append({
                        'name': service_obj.title,
                        'quantity': s['quantity'],
                        'cost': service_cost,
                        'duration': service_obj.service_time
                    })
                    total_cost += service_cost
                else:
                    logging.warning(f"Service with id {service_id} not found.")
            else:
                logging.warning("Service ID missing in one of the services.")


        appointment_info = {
            'id': appointment.id,
            'client_name': appointment.client_name,
            'client_email': appointment.client_email,
            'date': appointment.date.astimezone(MOSCOW_TZ).strftime('%Y-%m-%d'),
            'time': appointment.date.astimezone(MOSCOW_TZ).strftime('%H:%M'),
            'services': services_details,
            'status': appointment.status,
            'total': total_cost,
            'rejection_reason': appointment.rejection_reason if appointment.status == 'Rejected' else None,
        }

        return jsonify(appointment_info), 200

    return jsonify({'message': 'No appointment found'}), 404




# Generates and sends a one-time password (OTP) for phone verification. Its tempo btw
# - Used to verify the phone number during various processes.
otp_storage = {}
@app.route('/api/request_otp_ver', methods=['POST'])
def request_otp_ver():
    data = request.json
    phone = data.get('phone')

    if phone:
        otp = random.randint(100000, 999999)
        otp_storage[phone] = otp
        app.logger.info(f"Generated OTP for {phone}: {otp}")
        return jsonify({'message': 'OTP sent successfully'}), 200
    else:
        return jsonify({'message': 'Phone number is required'}), 400

# Verifies the OTP provided for phone verification and returns appointment details if valid.
# - Confirms the phone number and provides available services and appointment details.
@app.route('/api/verify_otp_ver', methods=['POST'])
def verify_otp_ver():
    data = request.json
    phone = data.get('phone')
    otp = data.get('otp')

    if otp_storage.get(phone) == int(otp):
        # Fetch the appointment using the phone number
        appointment = Appointment.query.filter_by(phone_number=phone).first()

        if not appointment:
            return jsonify({'message': 'Appointment not found'}), 404

        business_owner = BusinessOwner.query.filter_by(id=appointment.owner_id).first()
        if not business_owner:
            return jsonify({'message': 'Business owner not found'}), 404


        available_services = Service.query.filter_by(user_id=business_owner.user_id).all()

        available_services_details = [
            {
                'service_id': s.id,
                'name': s.title,
                'cost': s.cost,
                'duration': s.service_time,
            }
            for s in available_services
        ]


        services = json.loads(appointment.service) if isinstance(appointment.service, str) else appointment.service
        services_details = []
        for s in services:
            service_id = s.get('service_id') or s.get('id')
            service_obj = Service.query.get(service_id)
            if service_obj:
                services_details.append({
                    'service_id': service_id,
                    'name': service_obj.title,
                    'quantity': s['quantity'],
                    'cost': service_obj.cost,
                    'duration': service_obj.service_time
                })


        response_data = {
            'message': 'OTP verified successfully',
            'appointment_id': appointment.id,
            'client_name': appointment.client_name,
            'client_email': appointment.client_email,
            'services': services_details,
            'available_services': available_services_details,
            'status': appointment.status,
            'date': appointment.date.strftime('%Y-%m-%d %H:%M') if appointment.date else None
        }

        return jsonify(response_data), 200

    return jsonify({'message': 'Invalid OTP'}), 400


# Submits a client's request to change their appointment, including changes to services, date, and time.
# - Requires appointment details, requested date, time, and service modifications.
@app.route('/api/request_change', methods=['POST'])
def request_change():
    data = request.get_json()
    print('Received request data:', data)
    logging.info(f"Received data: {data}")

    appointment_id = data.get('appointment_id')
    client_name = data.get('client_name')
    phone_number = data.get('phone_number')
    client_email = data.get('client_email')
    requested_date_str = data.get('requested_date')
    requested_time_str = data.get('requested_time')
    requested_service = data.get('requested_service')
    requested_total_service_time = data.get('requested_total_service_time')
    requested_num_services = data.get('requested_num_services')


    logging.info(f"Requested services: {requested_service}")


    if not all([appointment_id, client_name, phone_number, requested_date_str, requested_time_str]):
        logging.warning('Missing required fields in the request')
        return jsonify({'message': 'Missing required information'}), 400

    if requested_total_service_time is None:
        return jsonify({"error": "Total service time is missing."}), 400


    appointment = Appointment.query.get(appointment_id)
    if not appointment:
        return jsonify({'message': 'Appointment not found'}), 404

    try:
        requested_datetime_moscow = MOSCOW_TZ.localize(
            datetime.strptime(f"{requested_date_str} {requested_time_str}", '%Y-%m-%d %H:%M')
        )
        requested_end_time = requested_datetime_moscow + timedelta(minutes=requested_total_service_time)
    except ValueError:
        return jsonify({'message': 'Invalid date or time format'}), 400


    service_ids = [service.get('service_id') for service in requested_service]
    if not all(service_ids):
        logging.warning('One or more services are missing a service_id')
        return jsonify({'message': 'Invalid service information'}), 400


    services = Service.query.filter(Service.id.in_(service_ids)).all()
    if len(services) != len(service_ids):
        return jsonify({'message': 'One or more services not found'}), 404


    request_change_entry = RequestChange(
        appointment_id=appointment_id,
        client_name=client_name,
        phone_number=phone_number,
        client_email=client_email,
        requested_date=requested_datetime_moscow,
        requested_end_time=requested_end_time,
        requested_service=json.dumps(requested_service),
        requested_total_service_time=requested_total_service_time,
        requested_num_services=requested_num_services,
    )

    logging.info(f"Storing RequestChange entry with services: {request_change_entry.requested_service}")

    db.session.add(request_change_entry)
    db.session.commit()

    return jsonify({'message': 'Request change submitted successfully'}), 200


# Cancels a client's appointment after verifying the OTP for cancellation.
# - Stores the cancellation reason and updates the reservation status.
@app.route('/api/business_owner/cancel_appointment', methods=['POST'])
def cancel_appointment():
    try:
        data = request.get_json()
        appointment_id = data.get('appointment_id')
        phone_number = data.get('phone_number')
        otp_code = data.get('otp_code')
        cancellation_reason = data.get('cancellation_reason')


        logging.info(f"Received OTP for phone number {phone_number}: {otp_code}")
        logging.info(f"Cancellation reason provided: {cancellation_reason}")


        appointment = Appointment.query.filter_by(id=appointment_id, phone_number=phone_number).first()
        if not appointment:
            return jsonify({'message': 'Appointment not found'}), 404


        stored_otp = session.get('otp')
        stored_phone_number = session.get('otp_phone_number')

        if not stored_otp or stored_otp != int(otp_code) or stored_phone_number != phone_number:
            return jsonify({'message': 'Invalid OTP'}), 400


        appointment.status = 'Cancelled'
        appointment.cancellation_reason = cancellation_reason

        db.session.commit()


        session.pop('otp', None)
        session.pop('otp_phone_number', None)

        logging.info(f"Appointment {appointment_id} cancelled successfully for {phone_number}")
        return jsonify({'message': 'Appointment cancelled successfully.'}), 200

    except Exception as e:
        logging.error(f"Error cancelling appointment: {str(e)}")
        db.session.rollback()
        return jsonify({'message': 'Failed to cancel appointment', 'error': str(e)}), 500



def calculate_earnings(owner_id):
    earnings = {'daily': 0, 'weekly': 0, 'monthly': 0, 'forecast': {'labels': [], 'data': []}}
    now = datetime.now(tz.UTC)


    appointments = Appointment.query.filter_by(owner_id=owner_id, status='Completed').all()

    service_earnings = {}
    for appointment in appointments:
        service_details = eval(appointment.service)
        for service in service_details:

            service_id = service.get('id') or service.get('service_id')

            if not service_id:
                logging.error(f"Service ID missing in appointment {appointment.id}")
                continue


            service_obj = Service.query.get(service_id)
            if not service_obj:
                logging.error(f"Service with ID {service_id} not found for appointment {appointment.id}")
                continue


            earnings_value = service_obj.cost * service.get('quantity', 1)

            appointment_date = appointment.date
            if appointment_date.tzinfo is None:
                appointment_date = appointment_date.replace(tzinfo=tz.UTC)

            diff = now - appointment_date
            if diff.days < 1:
                earnings['daily'] += earnings_value
            if diff.days < 7:
                earnings['weekly'] += earnings_value
            if diff.days < 30:
                earnings['monthly'] += earnings_value


            if service_obj.title not in service_earnings:
                service_earnings[service_obj.title] = 0
            service_earnings[service_obj.title] += earnings_value


    if len(appointments) > 0:
        avg_daily_earnings = earnings['daily'] / len(appointments)
        earnings['forecast']['labels'] = ['Next Week', 'Next Month', 'Next Year']
        earnings['forecast']['data'] = [
            avg_daily_earnings * 7,
            avg_daily_earnings * 30,
            avg_daily_earnings * 365
        ]

    return earnings