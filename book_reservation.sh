#!/bin/bash

# Variables
BASE_URL="http://localhost:3002"
SHOP_URL="${BASE_URL}/shop/tech_solutions"
PHONE_NUMBER="+71234567890"
USERNAME="tech_solutions"

echo "Starting reservation process..."

# Step 1: Answer "No" to the option page to proceed to booking
echo "Answering 'No' on the appointment option page..."
response=$(curl -s -X POST "${BASE_URL}/api/select_option" \
    -H "Content-Type: application/json" \
    -d '{"option_selected": "no"}')

if [[ $? -ne 0 ]]; then
    echo "Failed to answer the appointment option. Exiting."
    exit 1
fi

echo "Appointment option answered successfully."

# Step 2: Request OTP for the provided phone number
echo "Requesting OTP for phone number: ${PHONE_NUMBER}"
otp_response=$(curl -s -X POST "${BASE_URL}/api/shop/${USERNAME}/request_otp" \
    -H "Content-Type: application/json" \
    -d "{\"phone_number\": \"${PHONE_NUMBER}\"}")

if [[ $? -ne 0 ]]; then
    echo "Failed to request OTP. Exiting."
    exit 1
fi

echo "OTP requested successfully. Please check the server log for the OTP."

# Step 3: Extract OTP from the server log
# Assuming you can see the OTP in the server logs, you would extract it manually or programmatically if needed
read -p "Enter the OTP from the server log: " OTP

# Step 4: Verify OTP
echo "Verifying OTP..."
verify_response=$(curl -s -X POST "${BASE_URL}/api/shop/${USERNAME}/verify_otp" \
    -H "Content-Type: application/json" \
    -d "{\"phone_number\": \"${PHONE_NUMBER}\", \"otp_code\": \"${OTP}\"}")

if [[ $? -ne 0 ]]; then
    echo "Failed to verify OTP. Exiting."
    exit 1
fi

echo "OTP verified successfully."

# Step 5: Make a reservation
echo "Making a reservation..."
reservation_response=$(curl -s -X POST "${BASE_URL}/api/shop/${USERNAME}/reserve" \
    -H "Content-Type: application/json" \
    -d '{
        "client_name": "John Doe",
        "client_email": "johndoe@example.com",
        "phone_number": "'${PHONE_NUMBER}'",
        "services": [{"id": 1, "quantity": 1}],
        "date": "2024-09-09 10:00"
    }')

if [[ $? -ne 0 ]]; then
    echo "Failed to make a reservation. Exiting."
    exit 1
fi

echo "Reservation made successfully."
#chmod +x book_reservation.sh
 #./book_reservation.sh