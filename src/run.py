import sys
import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from official_website import app as official_website_app
from business_owner import app as business_owner_app

from official_website.models import User
from datetime import datetime
import pytz

MOSCOW_TZ = pytz.timezone('Europe/Moscow')

CORS(official_website_app, resources={r"/*": {"origins": "http://localhost:3002"}}, supports_credentials=True)

socketio = SocketIO(official_website_app, cors_allowed_origins=["http://localhost:3002", "http://192.168.64.1:3002"], ping_timeout=120, ping_interval=20)

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

def list_routes(app):
    import urllib
    output = []
    with app.app_context():
        for rule in app.url_map.iter_rules():
            options = {}
            for arg in rule.arguments:
                options[arg] = "[{0}]".format(arg)

            methods = ','.join(rule.methods)
            url = f"{rule.rule}"
            line = urllib.parse.unquote("{:50s} {:20s} {}".format(rule.endpoint, methods, url))
            output.append(line)

    for line in sorted(output):
        print(line)

def check_user_status():
    with official_website_app.app_context():
        users = User.query.all()
        for user in users:
            print(f"ID: {user.id}, Email: {user.email}, Status: {user.status}, Created At: {user.created_at}")

if __name__ == '__main__':
    list_routes(official_website_app)
    check_user_status()
    socketio.run(official_website_app, debug=True, port=3001)
