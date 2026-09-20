from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from marshmallow import ValidationError
from sqlalchemy.exc import IntegrityError

from app.database import SessionLocal
from app.models.color_note import ColorNote
from app.models.room import Room
from app.schemas.color_note import ColorNoteCreateSchema, ColorNoteOutSchema
from app.utils import validation_error_response

bp = Blueprint("color_notes", __name__, url_prefix="/api/color-notes")

create_schema = ColorNoteCreateSchema()
out_schema = ColorNoteOutSchema()
out_many = ColorNoteOutSchema(many=True)

DUPLICATE_DETAIL = "该出菇室此时刻已存在色斑备忘"


@bp.get("")
@jwt_required()
def list_color_notes():
    db = SessionLocal()
    try:
        room_id = request.args.get("roomId", type=int)
        q = db.query(ColorNote)
        if room_id is not None:
            q = q.filter(ColorNote.room_id == room_id)
        rows = q.order_by(ColorNote.noted_at.desc(), ColorNote.id.desc()).all()
        return jsonify(out_many.dump(rows))
    finally:
        db.close()


@bp.post("")
@jwt_required()
def create_color_note():
    db = SessionLocal()
    try:
        try:
            data = create_schema.load(request.get_json(silent=True) or {})
        except ValidationError as err:
            return validation_error_response(err)
        room = db.query(Room).filter(Room.id == data["room_id"]).first()
        if not room:
            return jsonify({"detail": "出菇室不存在"}), 400
        dup = (
            db.query(ColorNote)
            .filter(
                ColorNote.room_id == data["room_id"],
                ColorNote.noted_at == data["noted_at"],
            )
            .first()
        )
        if dup:
            return jsonify({"detail": DUPLICATE_DETAIL}), 409
        item = ColorNote(
            room_id=data["room_id"],
            shade=data["shade"],
            ratio_pct=data["ratio_pct"],
            noted_at=data["noted_at"],
            observer=data["observer"],
        )
        db.add(item)
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            return jsonify({"detail": DUPLICATE_DETAIL}), 409
        db.refresh(item)
        return jsonify(out_schema.dump(item)), 201
    finally:
        db.close()
