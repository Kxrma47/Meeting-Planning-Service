

from official_website import app as official_website_app, db as official_website_db
from official_website.models import User, Service, WorkingHours, Admin, AdminLog, AcceptedRegistration, RejectedRegistration, AdminLoginEvent, AdminLogoutEvent, DeletedApprovedAccount
from business_owner.models import BusinessOwner, BusinessOwnerLog, Appointment, Feedback
from werkzeug.security import generate_password_hash
import getpass

def create_tables():
    with official_website_app.app_context():
        official_website_db.create_all()
        print("Database tables created.")

def create_admin(username, password):
    with official_website_app.app_context():
        if not Admin.query.filter_by(username=username).first():
            admin = Admin(username=username, password=generate_password_hash(password, method='pbkdf2:sha256'))
            official_website_db.session.add(admin)
            official_website_db.session.commit()
            print(f"Admin user '{username}' created successfully.")
        else:
            print(f"Admin user '{username}' already exists.")

def clear_database():
    with official_website_app.app_context():
        try:
            official_website_db.session.query(Feedback).delete()
            official_website_db.session.query(Appointment).delete()
            official_website_db.session.query(BusinessOwnerLog).delete()
            official_website_db.session.query(BusinessOwner).delete()
            official_website_db.session.query(DeletedApprovedAccount).delete()
            official_website_db.session.query(AdminLogoutEvent).delete()
            official_website_db.session.query(AdminLoginEvent).delete()
            official_website_db.session.query(RejectedRegistration).delete()
            official_website_db.session.query(AcceptedRegistration).delete()
            official_website_db.session.query(AdminLog).delete()
            official_website_db.session.query(WorkingHours).delete()
            official_website_db.session.query(Service).delete()
            official_website_db.session.query(User).delete()
            official_website_db.session.commit()
            print("All data in the database has been cleared.")
        except Exception as e:
            official_website_db.session.rollback()
            print(f"An error occurred while clearing the database: {e}")

if __name__ == '__main__':
    create_tables()


    try:
        num_admins = int(input("How many admins would you like to create? "))
        if num_admins < 1:
            print("Please enter a valid number of admins.")
        else:
            for i in range(num_admins):
                print(f"\nCreating admin {i + 1}:")
                username = input("Enter admin username: ")
                password = getpass.getpass("Enter admin password: ")
                create_admin(username, password)

    except ValueError:
        print("Please enter a valid number.")

    clear_db = input("Do you want to clear the entire database? (y/n): ").strip().lower()
    if clear_db == 'y':
        clear_database()
    else:
        print("Database was not cleared.")
