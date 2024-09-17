from dotenv import load_dotenv
import os

load_dotenv()

class Config:
    basedir = os.path.abspath(os.path.dirname(__file__))
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(basedir, 'mps.db')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    DEBUG = True
    SQLALCHEMY_ECHO = True
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'a_super_secret_key'