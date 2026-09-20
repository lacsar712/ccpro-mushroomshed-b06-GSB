from marshmallow import Schema, fields, validate

from app.models.color_note import SHADES


class StrictInt(fields.Integer):
    """只接受 JSON 整数；拒绝布尔、浮点与数字字符串。"""

    def _validated(self, value):
        if isinstance(value, bool) or not isinstance(value, int):
            raise self.make_error("invalid", input=value)
        return super()._validated(value)


class ColorNoteCreateSchema(Schema):
    room_id = fields.Int(required=True, data_key="roomId")
    shade = fields.Str(required=True, validate=validate.OneOf(SHADES))
    ratio_pct = StrictInt(
        required=True,
        data_key="ratioPct",
        validate=validate.Range(min=0, max=100, error="ratioPct 须为 0–100 的整数"),
        error_messages={"invalid": "ratioPct 须为整数"},
    )
    noted_at = fields.DateTime(required=True, data_key="notedAt")
    observer = fields.Str(required=True, validate=validate.Length(min=1, max=64))


class ColorNoteOutSchema(Schema):
    id = fields.Int(dump_only=True)
    room_id = fields.Int(data_key="roomId")
    shade = fields.Str()
    ratio_pct = fields.Int(data_key="ratioPct")
    noted_at = fields.DateTime(data_key="notedAt")
    observer = fields.Str()
