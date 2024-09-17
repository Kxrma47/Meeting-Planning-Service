#!/bin/bash


registrations=(
    '{"personalName": "Alice Smith", "companyName": "Tech Innovations", "storeAddress": "123 Silicon Valley", "phoneNumber": "+71234567890", "email": "alice.smith@techinnovations.com", "numberOfServices": 3, "services": [{"title": "Web Development", "cost": "5000", "description": "Full-stack web development services", "service_time": "60"}, {"title": "App Development", "cost": "7000", "description": "Custom mobile app development", "service_time": "90"}, {"title": "SEO Optimization", "cost": "2000", "description": "Search engine optimization services", "service_time": "30"}], "workingHours": {"applyToAll": true, "sameHours": {"start": "09:00", "end": "18:00"}, "days": {"Monday": {"selected": true, "start": "09:00", "end": "18:00"}, "Tuesday": {"selected": true, "start": "09:00", "end": "18:00"}, "Wednesday": {"selected": true, "start": "09:00", "end": "18:00"}, "Thursday": {"selected": true, "start": "09:00", "end": "18:00"}, "Friday": {"selected": true, "start": "09:00", "end": "18:00"}, "Saturday": {"selected": false, "start": "", "end": ""}, "Sunday": {"selected": false, "start": "", "end": ""}}}}'
    '{"personalName": "Bob Johnson", "companyName": "Green Thumb Landscaping", "storeAddress": "456 Garden Path", "phoneNumber": "+70987654321", "email": "bob.johnson@greenthumb.com", "numberOfServices": 2, "services": [{"title": "Lawn Mowing", "cost": "100", "description": "Professional lawn mowing services", "service_time": "30"}, {"title": "Garden Design", "cost": "1500", "description": "Custom garden design services", "service_time": "120"}], "workingHours": {"applyToAll": false, "sameHours": {"start": "", "end": ""}, "days": {"Monday": {"selected": true, "start": "07:00", "end": "15:00"}, "Tuesday": {"selected": true, "start": "07:00", "end": "15:00"}, "Wednesday": {"selected": false, "start": "", "end": ""}, "Thursday": {"selected": true, "start": "07:00", "end": "15:00"}, "Friday": {"selected": true, "start": "07:00", "end": "15:00"}, "Saturday": {"selected": true, "start": "09:00", "end": "13:00"}, "Sunday": {"selected": false, "start": "", "end": ""}}}}'
    '{"personalName": "Carol Davis", "companyName": "FitLife Gym", "storeAddress": "789 Workout Ave", "phoneNumber": "+71122334455", "email": "carol.davis@fitlifegym.com", "numberOfServices": 3, "services": [{"title": "Personal Training", "cost": "50", "description": "One-on-one personal training sessions", "service_time": "60"}, {"title": "Group Classes", "cost": "20", "description": "Various group fitness classes", "service_time": "45"}, {"title": "Nutrition Coaching", "cost": "100", "description": "Personalized nutrition coaching", "service_time": "60"}], "workingHours": {"applyToAll": false, "sameHours": {"start": "", "end": ""}, "days": {"Monday": {"selected": true, "start": "05:00", "end": "22:00"}, "Tuesday": {"selected": true, "start": "05:00", "end": "22:00"}, "Wednesday": {"selected": true, "start": "05:00", "end": "22:00"}, "Thursday": {"selected": true, "start": "05:00", "end": "22:00"}, "Friday": {"selected": true, "start": "05:00", "end": "22:00"}, "Saturday": {"selected": true, "start": "07:00", "end": "20:00"}, "Sunday": {"selected": true, "start": "07:00", "end": "20:00"}}}}'
    '{"personalName": "David Martin", "companyName": "Creative Cakes Bakery", "storeAddress": "101 Dessert St", "phoneNumber": "+71667788990", "email": "david.martin@creativecakes.com", "numberOfServices": 2, "services": [{"title": "Custom Cakes", "cost": "150", "description": "Customized cakes for special occasions", "service_time": "240"}, {"title": "Cupcake Decoration", "cost": "50", "description": "Cupcake decoration classes", "service_time": "60"}], "workingHours": {"applyToAll": true, "sameHours": {"start": "08:00", "end": "18:00"}, "days": {"Monday": {"selected": true, "start": "08:00", "end": "18:00"}, "Tuesday": {"selected": true, "start": "08:00", "end": "18:00"}, "Wednesday": {"selected": true, "start": "08:00", "end": "18:00"}, "Thursday": {"selected": true, "start": "08:00", "end": "18:00"}, "Friday": {"selected": true, "start": "08:00", "end": "18:00"}, "Saturday": {"selected": true, "start": "08:00", "end": "18:00"}, "Sunday": {"selected": true, "start": "08:00", "end": "18:00"}}}}'
    '{"personalName": "Emily Turner", "companyName": "Urban Spa", "storeAddress": "202 Wellness Blvd", "phoneNumber": "+71334455667", "email": "emily.turner@urbanspa.com", "numberOfServices": 4, "services": [{"title": "Massage Therapy", "cost": "100", "description": "Relaxing massage therapy sessions", "service_time": "60"}, {"title": "Facial Treatments", "cost": "80", "description": "Rejuvenating facial treatments", "service_time": "45"}, {"title": "Manicure & Pedicure", "cost": "50", "description": "Nail care and decoration", "service_time": "60"}, {"title": "Sauna", "cost": "70", "description": "Access to sauna facilities", "service_time": "90"}], "workingHours": {"applyToAll": false, "sameHours": {"start": "", "end": ""}, "days": {"Monday": {"selected": true, "start": "10:00", "end": "20:00"}, "Tuesday": {"selected": true, "start": "10:00", "end": "20:00"}, "Wednesday": {"selected": true, "start": "10:00", "end": "20:00"}, "Thursday": {"selected": true, "start": "10:00", "end": "20:00"}, "Friday": {"selected": true, "start": "10:00", "end": "20:00"}, "Saturday": {"selected": true, "start": "10:00", "end": "20:00"}, "Sunday": {"selected": true, "start": "12:00", "end": "18:00"}}}}'
    '{"personalName": "Sophia Wilson", "companyName": "Artisan Coffee Shop", "storeAddress": "303 Brew Street", "phoneNumber": "+71555666777", "email": "sophia.wilson@artisancoffee.com", "numberOfServices": 2, "services": [{"title": "Espresso", "cost": "5", "description": "Rich and creamy espresso", "service_time": "5"}, {"title": "Latte Art Workshop", "cost": "50", "description": "Learn the art of making lattes", "service_time": "60"}], "workingHours": {"applyToAll": true, "sameHours": {"start": "07:00", "end": "19:00"}, "days": {"Monday": {"selected": true, "start": "07:00", "end": "19:00"}, "Tuesday": {"selected": true, "start": "07:00", "end": "19:00"}, "Wednesday": {"selected": true, "start": "07:00", "end": "19:00"}, "Thursday": {"selected": true, "start": "07:00", "end": "19:00"}, "Friday": {"selected": true, "start": "07:00", "end": "19:00"}, "Saturday": {"selected": true, "start": "07:00", "end": "19:00"}, "Sunday": {"selected": true, "start": "07:00", "end": "19:00"}}}}'
    '{"personalName": "John Carter", "companyName": "Elite Fitness Center", "storeAddress": "505 Workout Blvd", "phoneNumber": "+71112223333", "email": "john.carter@elitefitness.com", "numberOfServices": 4, "services": [{"title": "Personal Training", "cost": "100", "description": "One-on-one personal training sessions", "service_time": "60"}, {"title": "Yoga Classes", "cost": "50", "description": "Group yoga sessions", "service_time": "45"}, {"title": "Nutrition Consultation", "cost": "75", "description": "Personalized nutrition advice", "service_time": "30"}, {"title": "Massage Therapy", "cost": "90", "description": "Relaxing massage therapy", "service_time": "60"}], "workingHours": {"applyToAll": false, "sameHours": {"start": "", "end": ""}, "days": {"Monday": {"selected": true, "start": "06:00", "end": "22:00"}, "Tuesday": {"selected": true, "start": "06:00", "end": "22:00"}, "Wednesday": {"selected": true, "start": "06:00", "end": "22:00"}, "Thursday": {"selected": true, "start": "06:00", "end": "22:00"}, "Friday": {"selected": true, "start": "06:00", "end": "22:00"}, "Saturday": {"selected": true, "start": "08:00", "end": "20:00"}, "Sunday": {"selected": true, "start": "08:00", "end": "20:00"}}}}'
    '{"personalName": "Laura Moore", "companyName": "Urban Spa Retreat", "storeAddress": "707 Relaxation Road", "phoneNumber": "+71444555666", "email": "laura.moore@urbanspa.com", "numberOfServices": 5, "services": [{"title": "Swedish Massage", "cost": "120", "description": "Traditional Swedish massage", "service_time": "60"}, {"title": "Hot Stone Massage", "cost": "150", "description": "Relaxing hot stone massage", "service_time": "75"}, {"title": "Facial Treatment", "cost": "80", "description": "Rejuvenating facial treatments", "service_time": "45"}, {"title": "Manicure & Pedicure", "cost": "60", "description": "Nail care and decoration", "service_time": "60"}, {"title": "Sauna Access", "cost": "50", "description": "Access to our luxurious sauna", "service_time": "90"}], "workingHours": {"applyToAll": true, "sameHours": {"start": "09:00", "end": "21:00"}, "days": {"Monday": {"selected": true, "start": "09:00", "end": "21:00"}, "Tuesday": {"selected": true, "start": "09:00", "end": "21:00"}, "Wednesday": {"selected": true, "start": "09:00", "end": "21:00"}, "Thursday": {"selected": true, "start": "09:00", "end": "21:00"}, "Friday": {"selected": true, "start": "09:00", "end": "21:00"}, "Saturday": {"selected": true, "start": "09:00", "end": "21:00"}, "Sunday": {"selected": true, "start": "09:00", "end": "21:00"}}}}'
    '{"personalName": "Michael Johnson", "companyName": "Gourmet Catering Services", "storeAddress": "808 Culinary Lane", "phoneNumber": "+71777888999", "email": "michael.johnson@gourmetcatering.com", "numberOfServices": 3, "services": [{"title": "Wedding Catering", "cost": "10000", "description": "Full wedding catering services", "service_time": "360"}, {"title": "Corporate Events", "cost": "8000", "description": "Catering for corporate events and meetings", "service_time": "240"}, {"title": "Private Parties", "cost": "5000", "description": "Catering for private parties and celebrations", "service_time": "180"}], "workingHours": {"applyToAll": false, "sameHours": {"start": "", "end": ""}, "days": {"Monday": {"selected": true, "start": "08:00", "end": "18:00"}, "Tuesday": {"selected": true, "start": "08:00", "end": "18:00"}, "Wednesday": {"selected": true, "start": "08:00", "end": "18:00"}, "Thursday": {"selected": true, "start": "08:00", "end": "18:00"}, "Friday": {"selected": true, "start": "08:00", "end": "18:00"}, "Saturday": {"selected": true, "start": "08:00", "end": "18:00"}, "Sunday": {"selected": true, "start": "08:00", "end": "18:00"}}}}'
    '{"personalName": "Daniel Roberts", "companyName": "Tech Solutions", "storeAddress": "909 Innovation Drive", "phoneNumber": "+71999000111", "email": "daniel.roberts@techsolutions.com", "numberOfServices": 4, "services": [{"title": "IT Support", "cost": "200", "description": "Comprehensive IT support services", "service_time": "60"}, {"title": "Network Setup", "cost": "500", "description": "Setup and configure network systems", "service_time": "120"}, {"title": "Cybersecurity", "cost": "300", "description": "Security assessments and implementations", "service_time": "90"}, {"title": "Software Development", "cost": "1000", "description": "Custom software development services", "service_time": "240"}], "workingHours": {"applyToAll": true, "sameHours": {"start": "08:00", "end": "20:00"}, "days": {"Monday": {"selected": true, "start": "08:00", "end": "20:00"}, "Tuesday": {"selected": true, "start": "08:00", "end": "20:00"}, "Wednesday": {"selected": true, "start": "08:00", "end": "20:00"}, "Thursday": {"selected": true, "start": "08:00", "end": "20:00"}, "Friday": {"selected": true, "start": "08:00", "end": "20:00"}, "Saturday": {"selected": true, "start": "08:00", "end": "20:00"}, "Sunday": {"selected": true, "start": "08:00", "end": "20:00"}}}}'
)

extract_otp() {
    user_id=$1
    retries=5
    while [ $retries -gt 0 ]; do
        response=$(curl -s -X GET "http://localhost:3001/api/latest_otp/$user_id")
        otp=$(echo $response | jq -r '.otp')
        if [ "$otp" != "null" ] && [ -n "$otp" ]; then
            echo $otp
            return
        fi
        retries=$((retries-1))
        sleep 5
    done
    echo "Failed to extract OTP after multiple attempts." >&2
    exit 1
}


for registration in "${registrations[@]}"; do
    echo "Registering: $registration"

    response=$(curl -s -X POST http://localhost:3001/api/register \
      -H "Content-Type: application/json" \
      -d "$registration")

    user_id=$(echo $response | jq -r '.user_id')

    if [ "$user_id" != "null" ] && [ -n "$user_id" ]; then
        echo "Registration successful! User ID: $user_id"

        sleep 5

        otp=$(extract_otp $user_id)
        echo "Extracted OTP: $otp"

        if [ -n "$otp" ]; then
            verify_response=$(curl -s -X POST http://localhost:3001/api/verify_otp \
              -H "Content-Type: application/json" \
              -d "{\"user_id\": \"$user_id\", \"otp\": \"$otp\"}")

            echo "OTP Verification Response: $verify_response"
        else
            echo "Failed to extract OTP."
            exit 1
        fi
    else
        echo "Registration failed: $response"
        exit 1
    fi
done

#chmod +x register_and_confirm.sh
#./register_and_confirm.sh