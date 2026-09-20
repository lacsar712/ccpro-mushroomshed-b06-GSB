"""菌盖色斑停采判定。

FlushHarvest 落库前的拦截与 GET /api/rooms 每行的 holdHarvest 都调用
harvest_hold_state()，两处判定共用同一函数，不会各写一份。
"""

from typing import NamedTuple, Optional

from sqlalchemy.orm import Session

from app.models.color_note import ColorNote

HOLD_SHADE = "dark"
HOLD_RATIO_PCT = 40  # 严格大于该比例才触发停采
RELEASE_SHADE = "pale"


class HoldState(NamedTuple):
    latest: Optional[ColorNote]  # 最新一条备忘（任意 shade），供 latestShade 使用
    held: bool  # 当前是否停采


def harvest_hold_state(db: Session, room_id: int) -> HoldState:
    """停采判定唯一入口。

    规则：dark 且 ratioPct > 40 的色斑备忘落下后，该室停采 FlushHarvest，
    直到出现一条 notedAt 更晚的 pale 备忘才解除；
    mottled 或 ratioPct ≤ 40 的 dark 不影响停采状态。
    """
    notes = (
        db.query(ColorNote)
        .filter(ColorNote.room_id == room_id)
        .order_by(ColorNote.noted_at.desc(), ColorNote.id.desc())
        .all()
    )
    latest = notes[0] if notes else None
    last_hold_at = next(
        (n.noted_at for n in notes if n.shade == HOLD_SHADE and n.ratio_pct > HOLD_RATIO_PCT),
        None,
    )
    last_release_at = next((n.noted_at for n in notes if n.shade == RELEASE_SHADE), None)
    held = last_hold_at is not None and (
        last_release_at is None or last_hold_at > last_release_at
    )
    return HoldState(latest=latest, held=held)
