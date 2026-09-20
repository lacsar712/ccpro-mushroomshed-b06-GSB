from typing import Optional

from flask import jsonify
from marshmallow import ValidationError

from app.models.color_note import ColorNote


def validation_error_response(err: ValidationError):
    messages = []
    for field, msgs in err.messages.items():
        if isinstance(msgs, list):
            for m in msgs:
                messages.append(f"{field}: {m}" if field != "_schema" else str(m))
        else:
            messages.append(f"{field}: {msgs}")
    detail = "; ".join(messages) if messages else "请求参数校验失败"
    return jsonify({"detail": detail}), 400


def latest_color_note(db, room_id: int) -> Optional[ColorNote]:
    """该室 notedAt 最新的一条色斑备忘（无则 None）。"""
    return (
        db.query(ColorNote)
        .filter(ColorNote.room_id == room_id)
        .order_by(ColorNote.noted_at.desc(), ColorNote.id.desc())
        .first()
    )


def room_harvest_hold(db, room_id: int) -> bool:
    """停采判定：最新一条色斑备忘为 dark 且 ratioPct > 40。

    GET /api/rooms 每行的 holdHarvest 与 POST /api/flush-harvests 的拦截
    都走这一个函数；解除方式是登记一条 notedAt 更晚的 pale 备忘。
    """
    note = latest_color_note(db, room_id)
    return note is not None and note.shade == "dark" and note.ratio_pct > 40
