## Main Company Page (Client-Facing)

1. **Overview of Services and Features**:
   - Public-facing page that provides detailed information about the company and the types of services offered (salon, laundry, doctor appointments, etc.).
   - Displays the company’s features, mission, and contact information.

2. **Registration Form for Business Owners**:
   - Business owners can fill out a registration form with their:
     - Name
     - Username
     - Email
     - Phone number
     - Services they offer (including details like duration and cost)
     - Working hours: Business owners can individually select start and end times for each day of the week.
   - The registration form includes OTP verification for security before submission.
   - Once submitted, the registration goes to the admin for approval.

3. **Contact Form for Inquiries**:
   - A contact form allows potential clients or business owners to submit inquiries directly to the admin without registering.
   - The contact form includes fields for name, email, message, and other custom requests.

---

## Admin Dashboard

1. **Business Owner Management**:
   - View and Manage Registrations: Admins can view pending, approved, and rejected business owner registrations.
   - Approve or Reject Registrations: Admins can approve or reject business owner registrations.
     - Upon approval, an email is automatically sent to the business owner with:
       - Username and password credentials
       - A QR code linking to their business shop page
     - If rejected, a reason for rejection is sent via email.
   - Delete Business Owners: Admins can delete business owners, removing their accounts from the system.

2. **Statistical Charts**:
   - Overall Registration Status: Displays charts showing the number of approved, pending, rejected, and deleted registrations.
   - Custom Filters and Sorting: Admins can filter registrations by date, status, and sort them by newest/oldest.

3. **Report Management**:
   - Admins can view and manage reports against business owners (filed by clients) and reports against clients (filed by business owners).
   - Reports are displayed with filtering and sorting options.

4. **Contact Message Management**:
   - View and respond to inquiries submitted through the contact form on the company page.
   - Contact messages include client details and timestamps.

5. **Admin Account Management**:
   - The system supports multiple admins. Admins can create new admin accounts via a script.

---

## Business Owner Account (Dashboard)

1. **Static Reports and Charts**:
   - **Earnings Doughnut Chart**: A doughnut chart shows how much the business owner has earned from services provided.
   - **Forecast Chart**: Provides forecasts of future earnings based on sold services and payments received.
   - **Client Statistics Chart**: Displays the number of clients booking services daily, weekly, and monthly.
   - **Appointment Status Chart (Main Chart)**: Shows detailed statistics about the status of client appointments:
     - Accepted
     - Declined
     - Rejected
     - Canceled
     - Time changed
     - Paid
     - Completed

2. **Service Management**:
   - Add, Edit, Delete Services: Business owners can add new services, update service details (name, duration, cost), or remove services.
   - **No Working Hours Management Option**: Business owners cannot change their working hours after registration.

3. **Client Interaction and Appointments**:
   - View Appointment Details: Business owners can view appointments, including the client’s name, date, time, and the selected services.
   - Client QR Code Scanning: Clients can scan the business owner’s QR code to book an appointment.
     - QR codes are automatically generated and sent via email when the business owner registers.
   - **Approve or Decline Reservations**:
     - Business owners can approve or decline client reservations. When accepted, an OTP is automatically sent to the client via email.
     - If the reservation is declined, a reason is sent via email to the client.
   - **OTP Verification for Client Arrival**: When a client arrives, the business owner verifies the client using an OTP provided by the client. Once verified:
     - A “Paid” button appears for the client to make a payment.
     - Upon payment, the business owner’s earnings and statistics are updated.

4. **Appointment Modifications**:
   - Clients can change or cancel their appointments within a one-hour window.
   - Any changes or cancellations require OTP verification.
   - Appointments are marked as “booked” once confirmed.

---

## Client Interaction (Booking Services)

1. **Booking Page (Client-Facing)**:
   - Clients visit the business owner’s shop page, where they can:
     - Select services from the available options.
     - Pick a date and time for the appointment.
     - Enter their personal details (name, email, username).
   - **OTP Verification**: After selecting a service and time, clients receive an OTP for verification. Once verified, the reservation is created and marked as pending.

2. **Modify or Cancel Appointments**:
   - Clients can modify or cancel their appointments within a one-hour window.
   - Appointment modifications also require OTP verification.

---

## System Security and Automation

1. **OTP Verification**:
   - OTP verification is required for various actions (registration, reservations, changes, cancellations) to ensure security.
   - OTPs are automatically generated and sent via email for verification.

2. **Automated Emails**:
   - The system sends automated emails for:
     - Business owner registration approval/rejection
     - Client reservation acceptance/declination
     - Client OTP for verification during the booking process.



NOTE: Websocket is not fully functional yet, 
Also you may see clicking on NO while asking if the client has appointment or not at the begining of starting the server, 
its not letting the client to the businessowner shop page. 
In that case,

Click on YES and then refresh the page. Afterwards it will be working

