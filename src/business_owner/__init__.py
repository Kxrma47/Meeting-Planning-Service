import os
from flask import Flask
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config.from_object('config.Config')


app.secret_key = os.urandom(24)

db = SQLAlchemy(app)


with app.app_context():
    db.create_all()
    db.session.commit()

from official_website import app, db  # Import app and db from the official_website module

from business_owner import models, routes
