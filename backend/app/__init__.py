from flask import Flask
from flask_pymongo import PyMongo
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager
from config import Config

mongo = PyMongo()
bcrypt = Bcrypt()
jwt = JWTManager()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    mongo.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(app, supports_credentials=True)

    from app.routes import auth, typing, leaderboard
    app.register_blueprint(auth.bp)
    app.register_blueprint(typing.bp)
    app.register_blueprint(leaderboard.bp)

    return app
