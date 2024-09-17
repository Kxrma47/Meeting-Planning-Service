import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from threading import Lock

app = Flask(__name__)
app.config.from_object('config.Config')


app.secret_key = os.urandom(24)

db = SQLAlchemy(app)

db_initialized = False
db_lock = Lock()

@app.before_request
def initialize_database():
    global db_initialized
    with db_lock:
        if not db_initialized:
            with app.app_context():
                db.create_all()
                db.session.commit()
            db_initialized = True
            print("Database initialized successfully.")

from official_website import routes, models
